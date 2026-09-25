"""Dart project diagnostics on Serena's existing language server (Serena 1.7).

Installed as serena.tools.oma_dart. No second analysis server is launched.
"""

import hashlib
import json
import os
import subprocess
import threading
import time
from contextvars import ContextVar
from pathlib import Path
from urllib.parse import unquote, urlparse

from serena.tools.tools_base import Tool, ToolMarkerSymbolicRead
from solidlsp.language_servers.dart_language_server import DartLanguageServer
from solidlsp.ls_config import LanguageServerId


def snapshot(root):
    """Detect edits during analysis, including new/deleted files and options."""
    result = {}
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = [
            d
            for d in dirs
            if d
            not in {
                ".git",
                ".dart_tool",
                "build",
                "node_modules",
                ".venv",
                "android",
                "ios",
                "macos",
                "windows",
                "linux",
            }
            and not Path(directory, d).is_symlink()
        ]
        for name in files:
            path = Path(directory, name)
            if (
                path.suffix in {".dart", ".yaml", ".yml", ".lock"}
                or name == "package_config.json"
            ):
                result[str(path.relative_to(root))] = hashlib.sha256(
                    path.read_bytes()
                ).hexdigest()
    package_config = root / ".dart_tool/package_config.json"
    if package_config.is_file():
        result[".dart_tool/package_config.json"] = hashlib.sha256(
            package_config.read_bytes()
        ).hexdigest()
    return result


_original_setup = DartLanguageServer._setup_runtime_dependencies
_original_init = DartLanguageServer.__init__
_original_observe = DartLanguageServer._observe_server_notification
_sdk_root = ContextVar("oma_dart_project_root", default=None)


class AnalysisBarrier:
    """Require a new start/end pair, as the Dart 3.13 reanalyze test does."""

    def __init__(self):
        self.condition = threading.Condition()
        self.started = 0
        self.completed = 0
        self.busy = False

    def notify(self, busy):
        with self.condition:
            if busy:
                self.started += 1
            else:
                self.completed = self.started
            self.busy = busy
            self.condition.notify_all()

    def wait(self, after, timeout):
        with self.condition:
            if not self.condition.wait_for(
                lambda: (
                    self.started > after
                    and self.completed == self.started
                    and not self.busy
                ),
                timeout=timeout,
            ):
                raise TimeoutError("Dart did not report a new completed analysis cycle")


def _init(self, *args, **kwargs):
    self._oma_analysis = AnalysisBarrier()
    root = args[1] if len(args) > 1 else kwargs["repository_root_path"]
    token = _sdk_root.set(root)
    try:
        _original_init(self, *args, **kwargs)
    finally:
        _sdk_root.reset(token)
    command = self._get_process_launch_info().cmd
    self._oma_sdk_executable = command[0] if isinstance(command, list) else None
    self.server.on_notification("$/analyzerStatus", lambda _: None)


def _observe(self, method, params):
    _original_observe(self, method, params)
    if method == "$/analyzerStatus" and isinstance(params, dict):
        busy = params.get("isAnalyzing")
        if isinstance(busy, bool):
            self._oma_analysis.notify(busy)


def _setup(cls, settings):
    executable = settings.get_ls_specific_settings(LanguageServerId.DART).get(
        "dart_executable"
    )
    if not executable:
        return _original_setup(settings)
    if executable == "mise":
        try:
            flutter = subprocess.check_output(
                ["mise", "which", "flutter"], cwd=_sdk_root.get(),
                text=True, stderr=subprocess.PIPE, timeout=5,
            ).strip()
            executable = str(Path(flutter).parent / "cache/dart-sdk/bin/dart")
            if not Path(executable).is_file():
                raise FileNotFoundError(executable)
        except (subprocess.SubprocessError, FileNotFoundError):
            executable = subprocess.check_output(
                ["mise", "which", "dart"], cwd=_sdk_root.get(),
                text=True, timeout=5,
            ).strip()
    path = Path(executable).expanduser().resolve(strict=True)
    if not path.is_file() or not os.access(path, os.X_OK):
        raise ValueError(f"Not an executable Dart SDK: {path}")
    # An argv list also supports SDK paths containing spaces.
    return [str(path), "language-server", "--client-id", "oma.serena"]


DartLanguageServer._setup_runtime_dependencies = classmethod(_setup)
DartLanguageServer.__init__ = _init
DartLanguageServer._observe_server_notification = _observe


def refresh(ls, timeout):
    barrier = ls._oma_analysis
    baseline = barrier.started
    started_at = time.monotonic()
    ls.server.send_request("dart/reanalyze")
    barrier.wait(baseline, max(0, timeout - (time.monotonic() - started_at)))


def file_diagnostics(
    self, relative_file_path, start_line=0, end_line=-1, min_severity=4
):
    uri = self._validate_text_document_diagnostics_request(
        relative_file_path,
        start_line,
        end_line,
        min_severity,
    )
    with self.open_file(relative_file_path):
        refresh(self, 60)
        diagnostics = self._get_cached_published_diagnostics(uri) or []
    return self._filter_diagnostics(diagnostics, start_line, end_line, min_severity)


DartLanguageServer.request_text_document_diagnostics = file_diagnostics


def collect(ls, package, repository, timeout):
    """A missing completion method/timeout is an error, never empty diagnostics."""
    before = snapshot(package)
    candidates = sorted(name for name in before if name.endswith(".dart"))
    if not candidates:
        raise ValueError("No Dart source files in the requested package")
    entry = (
        "lib/main.dart"
        if "lib/main.dart" in candidates
        else next(
            (name for name in candidates if name.startswith("lib/")), candidates[0]
        )
    )
    anchor = str((package / entry).relative_to(repository))
    # Keep one real file open per package, preserving its analysis context
    # between hook calls. open_file refreshes an existing buffer from disk.
    anchors = getattr(ls, "_oma_dart_anchors", {})
    for name in list(anchors):
        if not (repository / name).is_file():
            anchors.pop(name).__exit__(None, None, None)
    if anchor not in anchors:
        context = ls.open_file(anchor)
        context.__enter__()
        anchors[anchor] = context
        ls._oma_dart_anchors = anchors
    old_timeout = ls.server._request_timeout
    try:
        ls.server._request_timeout = timeout
        with ls.open_file(anchor):
            # The server watches disk asynchronously; explicitly refresh before
            # asking for its completion barrier, including package/config edits.
            # Dart 3.13.4 does not yet implement workspace/analysis/complete.
            # Do not mistake an old idle event for completion of this refresh.
            refresh(ls, timeout)
            diagnostics = {}
            with ls._published_diagnostics_condition:
                for uri, entries in ls._published_diagnostics.items():
                    path = Path(unquote(urlparse(uri).path))
                    if path.is_relative_to(package) and path.is_file() and entries:
                        diagnostics[str(path.relative_to(repository))] = entries.copy()
    finally:
        ls.server._request_timeout = old_timeout
    if before != snapshot(package):
        raise RuntimeError(
            "Project changed during analysis; retry on a stable working tree"
        )
    return diagnostics


class GetDartProjectDiagnosticsTool(Tool, ToolMarkerSymbolicRead):
    """Wait for Dart project analysis and return all published diagnostics."""

    def apply(self, relative_path: str, timeout_seconds: int = 60) -> str:
        """Analyze a pub package using the existing Dart LSP.

        :param relative_path: package directory containing pubspec.yaml.
        :param timeout_seconds: maximum wait per analysis request (1..120).
        :return: complete diagnostics, SDK identity, and package scope.
        """
        if not 1 <= timeout_seconds <= 120:
            raise ValueError("timeout_seconds must be between 1 and 120")
        repository = Path(self.project.project_root).resolve()
        package = (repository / relative_path).resolve()
        if (
            not package.is_relative_to(repository)
            or not (package / "pubspec.yaml").is_file()
        ):
            raise ValueError("Expected a pub package inside the active project")
        self.project.ls_sync_file_system_changes()
        sources = sorted(package.glob("lib/**/*.dart")) or sorted(
            package.glob("*.dart")
        )
        if not sources:
            raise ValueError("Package has no Dart entry file")
        ls = self.create_language_server_symbol_retriever().get_language_server(
            str(sources[0].relative_to(repository))
        )
        if not isinstance(ls, DartLanguageServer):
            raise ValueError("Requested file is not managed by Dart LSP")
        executable = ls.custom_settings.get("dart_executable")
        if not executable:
            raise ValueError(
                "Set ls_specific_settings.dart.dart_executable to the project SDK, "
                "then restart Serena"
            )
        if executable == "mise":
            # Query the actual launched argv, not the possibly changed PATH.
            executable = ls._oma_sdk_executable
        version = subprocess.check_output(
            [executable, "--version"], text=True, timeout=5
        ).strip()
        diagnostics = collect(ls, package, repository, timeout_seconds)
        return json.dumps(
            {
                "complete": True,
                "project_root": str(repository),
                "scope": str(package.relative_to(repository)),
                "sdk_executable": str(Path(executable).resolve()),
                "sdk_version": version,
                "diagnostics": diagnostics,
            }
        )
