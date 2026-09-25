"""File-granular symbol caching for Serena 1.7.0's long-lived Python process.

Legacy pickles eagerly restore every file and retain mutable workspace trees.
SQLite keeps cold files on disk; serialized entries isolate request mutations.
"""

import hashlib
import logging
import pickle
import sqlite3
import threading
from collections.abc import MutableMapping

log = logging.getLogger(__name__)
FORMAT_VERSION = 1
MAX_ENTRY_BYTES = 16 * 1024 * 1024


class DiskSymbolCache(MutableMapping):
    def __init__(self, directory, kind, version):
        self._lock = threading.RLock()
        self._connection = None
        digest = hashlib.sha256(pickle.dumps((FORMAT_VERSION, version))).hexdigest()[
            :24
        ]
        self.path = directory / f"oma-{kind}-{digest}.sqlite3"
        try:
            self._connection = sqlite3.connect(
                self.path, timeout=2, isolation_level=None, check_same_thread=False
            )
            self._connection.execute("PRAGMA journal_mode=WAL")
            self._connection.execute("PRAGMA cache_size=-2048")
            self._connection.execute("PRAGMA mmap_size=0")
            self._connection.execute(
                "CREATE TABLE IF NOT EXISTS symbols (path TEXT PRIMARY KEY, value BLOB NOT NULL)"
            )
        except (OSError, sqlite3.Error) as error:
            self._disable(error)

    def _disable(self, error):
        # A disposable cache must never make code intelligence unavailable.
        log.warning(
            "OMA symbol cache unavailable at %s; using uncached requests: %s",
            self.path,
            error,
        )
        self.close()

    def _query(self, sql, params=()):
        with self._lock:
            if self._connection is None:
                return []
            try:
                return self._connection.execute(sql, params).fetchall()
            except sqlite3.Error as error:
                self._disable(error)
                return []

    def __getitem__(self, key):
        rows = self._query("SELECT value FROM symbols WHERE path=?", (key,))
        if not rows:
            raise KeyError(key)
        try:
            # Each request owns its decoded graph. Attaching a parent package
            # in request_full_symbol_tree cannot mutate the persistent cache.
            return pickle.loads(rows[0][0])
        except Exception:
            self._query("DELETE FROM symbols WHERE path=?", (key,))
            raise KeyError(key) from None

    def __setitem__(self, key, value):
        with self._lock:
            if self._connection is None:
                return
            try:
                payload = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
            except Exception:
                return
            if len(payload) > MAX_ENTRY_BYTES:
                self._query("DELETE FROM symbols WHERE path=?", (key,))
                return
            self._query("INSERT OR REPLACE INTO symbols VALUES (?, ?)", (key, payload))

    def __delitem__(self, key):
        with self._lock:
            if not self._query("SELECT 1 FROM symbols WHERE path=?", (key,)):
                raise KeyError(key)
            self._query("DELETE FROM symbols WHERE path=?", (key,))

    def __iter__(self):
        return iter(row[0] for row in self._query("SELECT path FROM symbols"))

    def __len__(self):
        rows = self._query("SELECT count(*) FROM symbols")
        return rows[0][0] if rows else 0

    def close(self):
        with self._lock:
            if self._connection is not None:
                self._connection.close()
                self._connection = None

    def __del__(self):
        self.close()


def _load_raw(self):
    self._raw_document_symbols_cache = DiskSymbolCache(
        self.cache_dir, "raw-symbols", self._raw_document_symbols_cache_version()
    )


def _load_documents(self):
    self._document_symbols_cache = DiskSymbolCache(
        self.cache_dir, "document-symbols", self._document_symbols_cache_version()
    )


def _save_raw(self):
    self._raw_document_symbols_cache_is_modified = False


def _save_documents(self):
    self._document_symbols_cache_is_modified = False


def install_symbol_cache():
    from solidlsp.ls import SolidLanguageServer

    SolidLanguageServer._load_raw_document_symbols_cache = _load_raw
    SolidLanguageServer._load_document_symbols_cache = _load_documents
    SolidLanguageServer._save_raw_document_symbols_cache = _save_raw
    SolidLanguageServer._save_document_symbols_cache = _save_documents
