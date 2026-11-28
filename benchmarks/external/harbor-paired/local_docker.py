"""Docker environment for hosts whose `docker exec` runs with umask 0000.

OrbStack starts exec'd processes with umask 0000 (`docker run` uses 0022). Harbor
creates `/logs/verifier` through `docker exec ... mkdir -p`, so `/logs` ends up
world-writable, and the hardened Terminal-Bench 4.1 verifiers then refuse to
write a reward ("Untrusted parent directory of /logs/verifier"). Even the
reference solution scores nothing.

This subclass only prefixes Harbor's directory-management commands with
`umask 022`, restoring the mode a standard Docker Engine produces. It changes
no task file, verifier file, resource limit, or timeout, and it applies to
both arms.
"""

from __future__ import annotations

from harbor.environments.docker.docker import DockerEnvironment
from harbor.models.task.config import TaskOS


class Umask022Docker(DockerEnvironment):
    def _with_umask(self, command: str) -> str:
        if self.os == TaskOS.WINDOWS or not command:
            return command
        return f"umask 022 && {command}"

    def _reset_dirs_command(self, **kwargs) -> str:
        return self._with_umask(super()._reset_dirs_command(**kwargs))

    def _ensure_dirs_command(self, dirs, *, chmod: bool = True) -> str:
        return self._with_umask(super()._ensure_dirs_command(dirs, chmod=chmod))

    def _empty_dirs_command(self, dirs, *, chmod: bool = True) -> str:
        return self._with_umask(super()._empty_dirs_command(dirs, chmod=chmod))
