import importlib.util
import tempfile
import gc
import tracemalloc
from concurrent.futures import ThreadPoolExecutor
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from solidlsp.ls import SolidLanguageServer

SOURCE = Path(__file__).resolve().parents[2] / "cli/assets/serena/oma_symbol_cache.py"
if SOURCE.exists():
    spec = importlib.util.spec_from_file_location("oma_symbol_cache_test", SOURCE)
    adapter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(adapter)
    adapter.install_symbol_cache()


class SymbolCacheTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def load_cache(self, version=1):
        ls = SimpleNamespace(
            cache_dir=self.root,
            DOCUMENT_SYMBOL_CACHE_FILENAME="document_symbols.pkl",
            _document_symbols_cache_version=lambda: version,
            _document_symbols_cache={},
        )
        SolidLanguageServer._load_document_symbols_cache(ls)
        self.addCleanup(
            lambda: getattr(ls._document_symbols_cache, "close", lambda: None)()
        )
        return ls._document_symbols_cache

    def test_startup_does_not_deserialize_project_wide_pickle(self):
        (self.root / "document_symbols.pkl").write_bytes(
            b"legacy cache remains untouched"
        )
        with patch(
            "solidlsp.ls.load_cache", return_value={"legacy": "large graph"}
        ) as legacy:
            cache = self.load_cache()
        legacy.assert_not_called()
        self.assertEqual(len(cache), 0)
        self.assertEqual(
            (self.root / "document_symbols.pkl").read_bytes(),
            b"legacy cache remains untouched",
        )

    def test_returned_symbols_cannot_retain_workspace_tree_in_cache(self):
        cache = self.load_cache()
        symbol = {"name": "value", "parent": None, "children": []}
        value = ("hash", {"root_symbols": [symbol]})
        cache["file.dart"] = value
        # Upstream request_full_symbol_tree attaches its file/package tree here.
        symbol["parent"] = {"children": [symbol], "other_files": ["workspace"]}
        self.assertIsNone(cache["file.dart"][1]["root_symbols"][0]["parent"])
        fetched = cache["file.dart"]
        fetched[1]["root_symbols"][0]["name"] = "mutated"
        self.assertEqual(cache["file.dart"][1]["root_symbols"][0]["name"], "value")

    def test_file_cache_survives_reopen_and_respects_version(self):
        cache = self.load_cache()
        cache["a.dart"] = ("hash", [1, 2])
        self.assertEqual(self.load_cache()["a.dart"], ("hash", [1, 2]))
        self.assertIsNone(self.load_cache(version=2).get("a.dart"))

    def test_internal_parent_links_and_file_hash_survive_round_trip(self):
        cache = self.load_cache()
        root = {"name": "class", "parent": None}
        child = {"name": "method", "parent": root}
        root["children"] = [child]
        cache["a"] = ("old-hash", root)
        fetched = cache["a"]
        self.assertIs(fetched[1]["children"][0]["parent"], fetched[1])
        cache["a"] = ("new-hash", {"name": "renamed"})
        self.assertEqual(cache["a"][0], "new-hash")

    def test_hundreds_of_files_do_not_stay_in_python_heap(self):
        cache = self.load_cache()
        tracemalloc.start()
        self.addCleanup(tracemalloc.stop)
        for index in range(512):
            cache[str(index)] = (str(index), "x" * 32768)
        gc.collect()
        current, _ = tracemalloc.get_traced_memory()
        self.assertLess(current, 2 * 1024 * 1024)
        self.assertEqual(len(cache), 512)
        self.assertEqual(cache["511"], ("511", "x" * 32768))

    def test_cross_thread_use_and_corrupt_entry_fall_back_to_miss(self):
        cache = self.load_cache()
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda i: cache.__setitem__(str(i), ("hash", i)), range(20)))
        self.assertEqual(len(cache), 20)
        cache._query("UPDATE symbols SET value=? WHERE path=?", (b"invalid", "1"))
        self.assertIsNone(cache.get("1"))
        self.assertEqual(len(cache), 19)

    def test_database_failure_does_not_disable_symbol_requests(self):
        # A directory in place of the SQLite file forces open failure.
        good = self.load_cache()
        path = good.path
        good.close()
        path.unlink()
        path.mkdir()
        with self.assertLogs(level="WARNING"):
            cache = self.load_cache()
        cache["a"] = ("hash", "symbol")
        self.assertIsNone(cache.get("a"))


if __name__ == "__main__":
    unittest.main()
