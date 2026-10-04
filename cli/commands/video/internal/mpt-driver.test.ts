import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const driverPath = fileURLToPath(
  new URL(
    "../../../../skills/oma-video/resources/mpt/driver.py",
    import.meta.url,
  ),
);

test("MPT driver isolates overlapping runs and cleans only their storage", () => {
  const result = spawnSync(
    "python3",
    [
      "-c",
      `
import pathlib, sys, tempfile, types

driver = types.ModuleType("mpt_driver_test")
exec(compile(pathlib.Path(sys.argv[1]).read_text(), sys.argv[1], "exec"), driver.__dict__)

with tempfile.TemporaryDirectory(prefix="oma-mpt-regression-") as temp:
    root = pathlib.Path(temp)
    mpt = root / "mpt"
    mpt.mkdir()
    storage = root / "storage"
    local = storage / "local_videos"
    local.mkdir(parents=True)
    unrelated = local / "existing.mp4"
    unrelated.write_text("unrelated material")

    def storage_dir(name, create=False):
        path = storage / name
        if create:
            path.mkdir(parents=True, exist_ok=True)
        return str(path)

    def task_dir(task_id):
        return str(storage / "tasks" / task_id)

    schema = types.ModuleType("app.models.schema")
    class Parameters:
        def __init__(self, **fields):
            self.__dict__.update(fields)
    schema.MaterialInfo = Parameters
    schema.VideoParams = Parameters
    schema.VideoConcatMode = types.SimpleNamespace(sequential=types.SimpleNamespace(value="sequential"))
    utils = types.ModuleType("app.utils")
    utils.utils = types.SimpleNamespace(storage_dir=storage_dir, task_dir=task_dir)
    config = types.ModuleType("app.config")
    config.config = types.SimpleNamespace(app={})
    services = types.ModuleType("app.services")
    sys.modules.update({"app.models.schema": schema, "app.utils": utils,
                        "app.config": config, "app.services": services})

    a = root / "a.mp4"
    b = root / "b.mp4"
    a.write_text("run A")
    b.write_text("run B")
    def spec(source, output):
        return {"mpt_dir": str(mpt), "script": "supplied script",
                "materials": [str(source)], "out_path": str(output)}

    staged_paths = []
    active = False
    def start(task_id, params, stop_at):
        global active
        material = pathlib.Path(params.video_materials[0].url)
        staged_paths.append(material)
        initial = material.read_text()
        if not active:
            active = True
            nested = driver.run(spec(b, root / "out-b.mp4"))
            assert nested["ok"], nested
            assert material.read_text() == initial == "run A"
        task_path = pathlib.Path(task_dir(task_id))
        task_path.mkdir(parents=True)
        final = task_path / "final.mp4"
        final.write_text(initial)
        return {"videos": [str(final)], "audio_duration": 3}

    services.task = types.SimpleNamespace(start=start)
    result = driver.run(spec(a, root / "out-a.mp4"))
    assert result["ok"], result
    assert (root / "out-a.mp4").read_text() == "run A"
    assert (root / "out-b.mp4").read_text() == "run B"
    assert len(set(staged_paths)) == 2
    assert all(not path.parent.exists() for path in staged_paths)
    assert not list((storage / "tasks").iterdir())
    assert unrelated.read_text() == "unrelated material"

    for failure in ("empty", "missing", "exception"):
        def fail(task_id, params, stop_at):
            task_path = pathlib.Path(task_dir(task_id))
            task_path.mkdir(parents=True)
            (task_path / "partial").write_text("partial")
            if failure == "exception":
                raise RuntimeError("simulated task failure")
            if failure == "missing":
                return {"videos": [str(task_path / "missing.mp4")]}
            return {"videos": []}
        services.task.start = fail
        try:
            failed = driver.run(spec(a, root / "failed.mp4"))
            assert not failed["ok"], failed
            assert failure != "exception"
        except RuntimeError:
            assert failure == "exception"
        assert list(local.iterdir()) == [unrelated]
        assert not list((storage / "tasks").iterdir())

print("overlapping-run isolation and failure cleanup passed")
`,
      driverPath,
    ],
    { encoding: "utf8" },
  );
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  expect(result.stdout).toContain(
    "overlapping-run isolation and failure cleanup passed",
  );
});
