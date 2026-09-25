import contextlib
import importlib.util
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace


def load(name):
    spec = importlib.util.spec_from_file_location(
        name, Path(__file__).resolve().parents[2] / "cli/assets/serena" / (name + ".py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


adapter = load("oma_dart")
client = load("dart_check")


class DiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "main.dart"
        self.source.write_text("int value = 1;\n")
        self.calls = []
        self.ls = SimpleNamespace(
            server=SimpleNamespace(_request_timeout=9, send_request=self.send),
            open_file=lambda _: contextlib.nullcontext(),
            _published_diagnostics_condition=threading.Condition(),
            _published_diagnostics={},
            _oma_analysis=adapter.AnalysisBarrier(),
        )

    def send(self, method):
        self.calls.append(method)
        self.ls._oma_analysis.notify(True)
        self.ls._oma_analysis.notify(False)

    def test_empty_diagnostics_require_completion_barrier(self):
        self.assertEqual(adapter.collect(self.ls, self.root, self.root, 2), {})
        self.assertEqual(self.calls, ["dart/reanalyze"])
        self.assertEqual(self.ls.server._request_timeout, 9)

    def test_timeout_or_unsupported_method_never_passes(self):
        def fail(method):
            raise TimeoutError("analysis not complete")

        self.ls.server.send_request = fail
        with self.assertRaises(TimeoutError):
            adapter.collect(self.ls, self.root, self.root, 2)
        self.assertEqual(self.ls.server._request_timeout, 9)

    def test_changed_inputs_fail(self):
        def edit(method):
            self.source.write_text("int value = 'changed';\n")
            self.send(method)

        self.ls.server.send_request = edit
        with self.assertRaisesRegex(RuntimeError, "changed during"):
            adapter.collect(self.ls, self.root, self.root, 2)

    def test_collects_unchanged_consumers_but_not_other_packages(self):
        consumer = self.root / "consumer.dart"
        consumer.write_text("int getValue() => value;")
        error = {"message": "wrong type", "severity": 1}
        self.ls._published_diagnostics = {
            consumer.as_uri(): [error],
            (self.root.parent / "other.dart").as_uri(): [error],
        }
        self.assertEqual(
            adapter.collect(self.ls, self.root, self.root, 2),
            {"consumer.dart": [error]},
        )

    def test_sdk_and_completion_validation(self):
        result = {
            "complete": True,
            "scope": ".",
            "sdk_executable": str(self.source),
            "diagnostics": {},
        }
        self.assertEqual(client.validate_result(result, ".", self.source), {})
        for invalid in [
            dict(result, complete=False),
            dict(result, scope="other"),
            dict(result, sdk_executable="/wrong/dart"),
            dict(result, diagnostics=None),
        ]:
            with self.assertRaises(ValueError):
                client.validate_result(invalid, ".", self.source)

    def test_partial_staging_rejected_without_modifying_files(self):
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        subprocess.run(["git", "-C", str(self.root), "add", "."], check=True)
        client.check_index(self.root, ".")
        self.source.write_text("int value = 2;\n")
        with self.assertRaisesRegex(ValueError, "differ from the index"):
            client.check_index(self.root, ".")
        self.assertEqual(self.source.read_text(), "int value = 2;\n")

    def test_old_idle_and_missing_completion_cannot_pass(self):
        barrier = adapter.AnalysisBarrier()
        barrier.notify(True)
        barrier.notify(False)
        with self.assertRaises(TimeoutError):
            barrier.wait(barrier.started, 0.001)
        previous = barrier.started
        barrier.notify(True)
        with self.assertRaises(TimeoutError):
            barrier.wait(previous, 0.001)
        barrier.notify(False)
        barrier.wait(previous, 0.001)


if __name__ == "__main__":
    unittest.main()
