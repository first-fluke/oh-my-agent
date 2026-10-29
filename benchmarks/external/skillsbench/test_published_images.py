"""Model-free checks for environment provenance and native grader preparation."""

import hashlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from docker_runtime import DockerRuntime
from model_errors import terminal_provider_access_failure, terminal_quota_failure
from published_images import MANIFEST, cache_validation_argv, published_image, validate_image_inspect


class PublishedImagesTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(MANIFEST.read_text())
        self.published = self.manifest["tasks"]["lean4-proof"]

    def test_unlisted_tasks_are_not_approved(self):
        self.assertIsNone(published_image(Path("/unused/tasks/dialogue-parser")))

    def test_arbitrary_source_differences_are_rejected(self):
        manifest = json.loads(json.dumps(self.manifest))
        manifest["tasks"]["lean4-proof"]["local_git_objects"] = {
            **self.published["source_git_objects"], "environment": "0" * 40}
        with patch.object(type(MANIFEST), "read_text", return_value=json.dumps(manifest)):
            with self.assertRaisesRegex(ValueError, "unreviewed source difference"):
                published_image(Path("/checkout/tasks/lean4-proof"))

    def test_cache_validation_reads_bytes_and_rejects_a_changed_asset(self):
        contents = b"public model cache fixture"
        assets = [{"path": "/root/.seisbench/models/fixture", "bytes": len(contents),
                   "sha256": hashlib.sha256(contents).hexdigest()}]
        argv = cache_validation_argv(assets)
        with patch("sys.argv", ["-c", argv[-1]]), patch.object(Path, "read_bytes", return_value=contents), \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            exec(argv[-2], {})
        self.assertEqual(json.loads(output.getvalue())["validated_cache_assets"], assets)
        with patch("sys.argv", ["-c", argv[-1]]), patch.object(Path, "read_bytes", return_value=b"changed"):
            with self.assertRaisesRegex(SystemExit, "asset mismatch"):
                exec(argv[-2], {})
        with self.assertRaisesRegex(ValueError, "Invalid published cache"):
            cache_validation_argv([{**assets[0], "path": "/root/.seisbench/../other"}])

    def test_exact_source_objects_are_required(self):
        expected = list(self.published["source_git_objects"].values()) + [""]
        with patch("published_images.subprocess.check_output", side_effect=expected):
            result = published_image(Path("/checkout/tasks/lean4-proof"))
        self.assertEqual(result["image"], self.published["image"])
        with patch("published_images.subprocess.check_output", return_value="0" * 40):
            with self.assertRaisesRegex(ValueError, "source mismatch"):
                published_image(Path("/checkout/tasks/lean4-proof"))

    def test_dirty_task_is_rejected(self):
        outputs = list(self.published["source_git_objects"].values()) + [" M tasks/lean4-proof/task.md"]
        with patch("published_images.subprocess.check_output", side_effect=outputs):
            with self.assertRaisesRegex(ValueError, "local changes"):
                published_image(Path("/checkout/tasks/lean4-proof"))

    def test_inspection_binds_platform_and_digest(self):
        config = {"Os": "linux", "Architecture": "amd64", "RepoDigests": [self.published["image"]]}
        validate_image_inspect(config, self.published)
        with self.assertRaisesRegex(ValueError, "platform mismatch"):
            validate_image_inspect({**config, "Architecture": "arm64"}, self.published)
        with self.assertRaisesRegex(ValueError, "requested digest"):
            validate_image_inspect({**config, "RepoDigests": []}, self.published)

    def test_inspection_binds_reviewed_cache_layer_diff_id(self):
        expected = "sha256:" + "1" * 64
        published = {**self.published, "cache_layer_diff_id": expected}
        config = {"Os": "linux", "Architecture": "amd64", "RepoDigests": [published["image"]],
                  "RootFS": {"Layers": [expected]}}
        validate_image_inspect(config, published)
        with self.assertRaisesRegex(ValueError, "cache layer diffID"):
            validate_image_inspect({**config, "RootFS": {"Layers": []}}, published)

    def test_published_runtime_uses_existing_image_without_replaying_build(self):
        calls = []
        config = {"Os": "linux", "Architecture": "amd64", "RepoDigests": [self.published["image"]],
                  "Config": {"WorkingDir": "/app/workspace"}}
        runtime = DockerRuntime(Path("/checkout/tasks/lean4-proof"),
                                {"published_image": self.published, "config": {}}, "test-published",
                                lambda argv, label, **kwargs: calls.append((argv, label)), native_build=True)
        with patch("docker_runtime.subprocess.run", return_value=subprocess.CompletedProcess([], 1)), \
                patch("docker_runtime.subprocess.check_output", return_value=json.dumps([config])):
            runtime.prepare()
        self.assertFalse(runtime.native_build)
        self.assertTrue(runtime.cleanup_image)
        self.assertEqual(runtime.workdir, "/app/workspace")
        self.assertEqual(calls[0][0], ["docker", "pull", "--platform", "linux/amd64", self.published["image"]])
        self.assertEqual([label for _, label in calls], ["published-image-pull", "container-start", "log-dirs"])

    def test_cache_assets_are_checked_in_container_before_setup_returns(self):
        calls = []
        published = {**self.published, "cache_assets": [
            {"path": "/root/.seisbench/models/fixture", "bytes": 0, "sha256": hashlib.sha256(b"").hexdigest()}]}
        config = {"Os": "linux", "Architecture": "amd64", "RepoDigests": [published["image"]], "Config": {}}
        runtime = DockerRuntime(Path("/checkout/tasks/lean4-proof"),
                                {"published_image": published, "config": {}}, "fixture",
                                lambda argv, label, **kwargs: calls.append((argv, label)))
        with patch("docker_runtime.subprocess.run", return_value=subprocess.CompletedProcess([], 1)), \
                patch("docker_runtime.subprocess.check_output", return_value=json.dumps([config])):
            runtime.prepare()
        self.assertEqual([label for _, label in calls],
                         ["published-image-pull", "container-start", "published-cache-validation", "log-dirs"])
        self.assertEqual(calls[2][0][:4], ["docker", "exec", "fixture", "python3"])

    def test_completed_score_is_preserved_before_source_selection(self):
        import batch

        with tempfile.TemporaryDirectory(prefix="oma-published-score-") as temporary:
            checkpoint = {"tasks": {"lean4-proof": {"status": "scored", "reward": 1.0}}}
            spec = {"task": "lean4-proof", "blockers": []}
            argv = ["batch.py", "run", "--run-dir", temporary, "--published-prebuilt"]
            with patch("sys.argv", argv), patch.object(batch, "initialize", return_value=([spec], checkpoint)), \
                    patch.object(batch, "snapshot_oma", return_value=Path(temporary)), \
                    patch.object(batch, "published_image") as select, patch("builtins.print"):
                batch.main()
            select.assert_not_called()
            self.assertEqual(checkpoint["tasks"]["lean4-proof"], {"status": "scored", "reward": 1.0})

    def test_original_verifier_assets_and_env_are_available_only_during_grade(self):
        calls = []
        spec = {"image": "existing-base", "config": {"verifier": {"env": {"REPO_ID": "google/auto"}}}}
        runtime = DockerRuntime(Path("/original/task"), spec, "fixture", lambda argv, label, **kwargs: calls.append((argv, label)), native_build=False)
        runtime.environment = {"ORIGINAL": "value"}
        runtime.grade(900)
        destinations = [argv[-1] for argv, label in calls if label in {"verifier-copy", "verifier-compat-copy"}]
        self.assertEqual(destinations, ["fixture:/verifier", "fixture:/tests"])
        grader = next(argv for argv, label in calls if label == "verifier")
        self.assertIn("REPO_ID=google/auto", grader)
        self.assertEqual(grader[-1], "bash /verifier/test.sh")
        self.assertEqual(runtime.environment, {"ORIGINAL": "value"})
        with patch.object(runtime, "run", side_effect=RuntimeError("native grader failure")):
            with self.assertRaisesRegex(RuntimeError, "native grader failure"):
                runtime.grade(900)
        self.assertEqual(runtime.environment, {"ORIGINAL": "value"})

    def test_replay_run_uses_original_environment_timeout(self):
        calls = []
        spec = {"image": "existing-base", "platform": None, "config": {"environment": {"build_timeout_sec": 3600}},
                "instructions": [("FROM", "existing-base"), ("RUN", "true")]}
        runtime = DockerRuntime(Path("/original/task"), spec, "fixture",
                                lambda argv, label, **kwargs: calls.append((label, kwargs)), native_build=False)
        runtime.prepare()
        self.assertEqual(next(options["timeout"] for label, options in calls if label == "setup-001-run"), 3600)


class InfraRetryTests(unittest.TestCase):
    def test_simpo_native_resolver_only_changes_grader_environment(self):
        calls = []
        runtime = DockerRuntime(Path("/original/simpo-code-reproduction"), {"config": {}}, "fixture",
                                lambda argv, label, **kwargs: calls.append((argv, label)))
        runtime.environment = {"ORIGINAL": "value"}
        runtime.grade(900)
        grader = next(argv for argv, label in calls if label == "verifier")
        self.assertIn("UV_INDEX_STRATEGY=unsafe-best-match", grader)
        self.assertEqual(grader[-1], "bash /verifier/test.sh")
        self.assertEqual(runtime.environment, {"ORIGINAL": "value"})

    def test_only_the_recorded_no_case_dependency_failure_can_be_replaced_once(self):
        import infra_retry

        with tempfile.TemporaryDirectory() as temporary:
            task = "simpo-code-reproduction"
            attempt = Path(temporary) / "tasks" / task / infra_retry.SIMPO_ATTEMPT
            (attempt / "verifier").mkdir(parents=True)
            row = {"status": "verifier_error", "finished_at": infra_retry.SIMPO_FINISHED}
            receipt = {"task": task, **row, "agent_status": "completed", "setup_status": "completed",
                       "verifier_status": "error", "attempt_dir": str(attempt)}
            data = json.dumps(receipt).encode()
            log = b"No solution found: torch==2.1.2+cpu; first-index resolution"
            (attempt / "receipt.json").write_bytes(data)
            (attempt / "verifier.log").write_bytes(log)
            with patch.object(infra_retry, "SIMPO_RECEIPT_SHA256", hashlib.sha256(data).hexdigest()), \
                    patch.object(infra_retry, "SIMPO_LOG_SHA256", hashlib.sha256(log).hexdigest()):
                eligible = lambda value: infra_retry.repaired_ungraded_attempt(task, value, temporary)
                self.assertTrue(eligible(row))
                self.assertFalse(eligible({**row, "status": "scored", "reward": 0.0}))
                self.assertFalse(eligible({**row, "status": "agent_error"}))
                self.assertFalse(eligible({**row, "finished_at": row["finished_at"] + 1}))
                (attempt / "verifier/ctrf.json").write_text("{}")
                self.assertFalse(eligible(row))
                (attempt / "verifier/ctrf.json").unlink()
                (attempt / "verifier.log").write_bytes(log + b"changed")
                self.assertFalse(eligible(row))


class ProviderErrorsTests(unittest.TestCase):
    denial = "This content was flagged for possible cybersecurity risk. Apply for Daybreak access before retrying."

    def test_provider_rejection_is_distinct_from_quota(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "agent.log"
            path.write_text(json.dumps({"type": "turn.failed", "error": {"message": self.denial}}) + "\n")
            self.assertTrue(terminal_provider_access_failure(path))
            self.assertFalse(terminal_quota_failure(path))
            path.write_text(self.denial + "\n")
            self.assertTrue(terminal_provider_access_failure(path))

    def test_tool_output_and_recovered_turn_do_not_count_as_rejections(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "agent.log"
            path.write_text(json.dumps({"type": "item.completed", "item": {
                "type": "command_execution", "aggregated_output": self.denial}}) + "\n")
            self.assertFalse(terminal_provider_access_failure(path))
            path.write_text(json.dumps({"type": "error", "message": self.denial}) + "\n" +
                            json.dumps({"type": "turn.completed"}) + "\n")
            self.assertFalse(terminal_provider_access_failure(path))

    def test_quota_detection_keeps_its_original_behavior(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "agent.log"
            path.write_text(json.dumps({"type": "turn.failed", "error": {
                "message": "You've hit your usage limit"}}) + "\n")
            self.assertTrue(terminal_quota_failure(path))
            self.assertFalse(terminal_provider_access_failure(path))

    def test_legacy_provider_error_is_reclassified_without_another_model_request(self):
        import batch

        with tempfile.TemporaryDirectory(prefix="oma-provider-classification-") as temporary:
            directory = Path(temporary) / "tasks/setup-fuzzing-py"
            attempt = directory / "attempt-original"
            attempt.mkdir(parents=True)
            (attempt / "agent.log").write_text(json.dumps({"type": "turn.failed", "error": {
                "message": self.denial}}) + "\n")
            receipt_path = directory / "receipt.json"
            receipt_path.write_text(json.dumps({"task": "setup-fuzzing-py", "status": "agent_error",
                                               "attempt_dir": str(attempt), "finished_at": 99.0}))
            checkpoint = {"tasks": {"setup-fuzzing-py": {"status": "agent_error"}}}
            argv = ["batch.py", "run", "--run-dir", temporary, "--task", "setup-fuzzing-py", "--retry-errors"]
            with patch("sys.argv", argv), patch.object(batch, "initialize", return_value=(
                    [{"task": "setup-fuzzing-py", "blockers": []}], checkpoint)), \
                    patch.object(batch, "snapshot_oma", return_value=Path(temporary)), \
                    patch.object(batch, "execute_task") as execute, patch("builtins.print"):
                batch.main()
            execute.assert_not_called()
            self.assertEqual(checkpoint["tasks"]["setup-fuzzing-py"]["status"], "waiting_provider_access")
            updated = json.loads(receipt_path.read_text())
            self.assertEqual(updated["previous_status"], "agent_error")
            self.assertEqual(updated["finished_at"], 99.0)
            self.assertNotIn("reward", updated)


if __name__ == "__main__":
    unittest.main()
