import importlib.util
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[2] / "cli/assets/serena"
spec = importlib.util.spec_from_file_location("installer", SOURCE / "install.py")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.package = Path(self.temp.name)
        (self.package / "tools").mkdir()
        self.init = self.package / "tools/__init__.py"
        self.init.write_text("# upstream\n")

    def test_upgrade_removing_adapter_is_repaired_idempotently(self):
        first = installer.reconcile(self.package, "1.7.0", SOURCE)
        self.assertTrue(first["changed"])
        self.assertFalse(installer.reconcile(self.package, "1.7.0", SOURCE)["changed"])
        self.init.write_text("# upgraded upstream\n")
        (self.package / "tools/oma_dart.py").unlink()
        repaired = installer.reconcile(self.package, "1.7.0", SOURCE)
        self.assertTrue(repaired["changed"])
        self.assertEqual(repaired["revision"], first["revision"])
        self.assertIn("# upgraded upstream", self.init.read_text())
        self.assertEqual(self.init.read_text().count(installer.IMPORT), 1)

    def test_check_and_unsupported_versions_never_write(self):
        self.assertEqual(
            installer.reconcile(self.package, "1.7.0", SOURCE, True)["status"],
            "missing",
        )
        unsupported = installer.reconcile(self.package, "9.0.0", SOURCE)
        self.assertEqual(unsupported["status"], "unsupported")
        self.assertIn("1.7.0", unsupported["error"])
        self.assertIn("<3.0.0", unsupported["error"])
        self.assertEqual(self.init.read_text(), "# upstream\n")
        self.assertFalse((self.package / "tools/oma_dart.py").exists())

    def test_supported_serena_versions_install_the_same_adapter(self):
        for version in ("1.7.0", "1.7.4", "2.0.0", "2.5.1"):
            with self.subTest(version=version):
                result = installer.reconcile(self.package, version, SOURCE)
                self.assertEqual(result["status"], "ready")
                self.assertIn(installer.IMPORT, self.init.read_text())
                self.assertIn(installer.CACHE_IMPORT, self.init.read_text())

    def test_versions_outside_the_compatibility_range_are_unsupported(self):
        for version in ("1.6.9", "3.0.0"):
            with self.subTest(version=version):
                self.assertEqual(
                    installer.reconcile(self.package, version, SOURCE)["status"],
                    "unsupported",
                )

    def test_symbol_cache_patch_is_repaired_and_changes_runtime_revision(self):
        first = installer.reconcile(self.package, "1.7.0", SOURCE)
        cache = self.package / "tools/oma_symbol_cache.py"
        cache.unlink()
        self.assertEqual(
            installer.reconcile(self.package, "1.7.0", SOURCE, True)["status"],
            "missing",
        )
        self.assertTrue(installer.reconcile(self.package, "1.7.0", SOURCE)["changed"])
        self.assertIn(installer.CACHE_IMPORT, self.init.read_text())
        source = self.package / "assets"
        source.mkdir()
        (source / "oma_dart.py").write_text((SOURCE / "oma_dart.py").read_text())
        (source / "oma_symbol_cache.py").write_text(
            (SOURCE / "oma_symbol_cache.py").read_text() + "\n# changed\n"
        )
        changed = installer.reconcile(self.package, "1.7.0", source)
        self.assertNotEqual(changed["revision"], first["revision"])


if __name__ == "__main__":
    unittest.main()
