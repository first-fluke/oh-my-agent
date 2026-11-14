# Backend Agent - Code Snippets (Python / Litestar)

Copy-paste ready patterns. Use these as starting points, adapt to the specific task.

---

## 1. Litestar Controller with Auth

```python
# app/controllers/resource.py
from typing import Any
from uuid import UUID

from advanced_alchemy.extensions.litestar import providers
from litestar import Controller, Request, get, post
from litestar.di import NamedDependency
from litestar.params import FromPath, JSONBody
from litestar.security.jwt import Token

from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceResponse
from app.services.resource import ResourceService

class ResourceController(Controller):
    path = "/api/resources"
    dependencies = providers.create_service_dependencies(ResourceService, "resource_service")

    # JWTAuth protects every route that is not excluded and sets request.user
    @post()
    async def create_resource(
        self,
        request: Request[User, Token, Any],
        resource_service: NamedDependency[ResourceService],
        data: JSONBody[ResourceCreate],
    ) -> ResourceResponse:
        # HTTP concerns only: the service owns business rules and ownership checks
        resource = await resource_service.create_for_user(request.user.id, data)
        return resource_service.to_schema(resource, schema_type=ResourceResponse)

    @get("/{resource_id:uuid}")
    async def get_resource(
        self,
        request: Request[User, Token, Any],
        resource_service: NamedDependency[ResourceService],
        resource_id: FromPath[UUID],
    ) -> ResourceResponse:
        resource = await resource_service.get_for_user(resource_id, request.user.id)
        return resource_service.to_schema(resource, schema_type=ResourceResponse)
```

---

## 2. msgspec Request/Response Structs

```python
# app/schemas/resource.py
from datetime import datetime
from typing import Annotated
from uuid import UUID

import msgspec

Title = Annotated[str, msgspec.Meta(min_length=1, max_length=200)]
Description = Annotated[str, msgspec.Meta(max_length=1000)]

class ResourceCreate(msgspec.Struct):
    title: Title
    description: Description | None = None

class ResourceUpdate(msgspec.Struct, omit_defaults=True):
    # UNSET separates "field omitted" from "field set to null"
    title: Title | msgspec.UnsetType = msgspec.UNSET
    description: Description | None | msgspec.UnsetType = msgspec.UNSET

class ResourceResponse(msgspec.Struct):
    id: UUID
    title: str
    description: str | None
    user_id: UUID
    created_at: datetime
    updated_at: datetime
```

Litestar validates a `JSONBody[...]` Struct before the handler runs and answers 400 on a constraint violation. Add a Litestar DTO only where the wire shape must differ from the Struct.

---

## 3. SQLAlchemy Model

```python
# app/models/resource.py
from datetime import datetime
from uuid import UUID

from advanced_alchemy.base import UUIDv7AuditBase
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

# UUIDv7AuditBase supplies `id`, `created_at`, and `updated_at` (timezone-aware UTC)
class Resource(UUIDv7AuditBase):
    __tablename__ = "resources"

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    # Soft delete: stamped on delete, and every read filters on it
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="resources")
```

---

## 4. Dependency Injection

```python
# app/core/database.py
import os

from advanced_alchemy.extensions.litestar import (
    AsyncSessionConfig,
    SQLAlchemyAsyncConfig,
    SQLAlchemyPlugin,
)

alchemy_config = SQLAlchemyAsyncConfig(
    connection_string=os.environ["DATABASE_URL"],  # fails at startup when unset
    session_config=AsyncSessionConfig(expire_on_commit=False),
    # One request is one unit of work: commit on a 2xx response, roll back otherwise
    before_send_handler="autocommit",
)
alchemy_plugin = SQLAlchemyPlugin(config=alchemy_config)  # provides `db_session`
```

```python
# Service on a controller: builds the service on the request-scoped session
from advanced_alchemy.extensions.litestar import providers

dependencies = providers.create_service_dependencies(ResourceService, "resource_service")

# Service for a single handler or another provider
provide_users_service = providers.create_service_provider(UserService)

# Injected parameters are marked explicitly
async def handler(resource_service: NamedDependency[ResourceService]) -> None: ...
```

```python
# app/main.py
from litestar import Litestar

from app.controllers.resource import ResourceController
from app.core.auth import jwt_auth, login
from app.core.database import alchemy_plugin
from app.core.errors import AppError, app_error_handler

app = Litestar(
    route_handlers=[ResourceController, login],
    plugins=[alchemy_plugin],
    on_app_init=[jwt_auth.on_app_init],
    exception_handlers={AppError: app_error_handler},
)
```

---

## 5. JWT Auth

```python
# app/core/auth.py
import os
from datetime import timedelta
from typing import Any
from uuid import UUID

from litestar import Response, post
from litestar.connection import ASGIConnection
from litestar.di import NamedDependency, Provide
from litestar.params import JSONBody
from litestar.security.jwt import JWTAuth, Token

from app.core.database import alchemy_config
from app.models.user import User
from app.schemas.auth import LoginRequest
from app.services.user import UserService, provide_users_service

async def retrieve_user_handler(
    token: Token, connection: ASGIConnection[Any, Any, Any, Any]
) -> User | None:
    try:
        user_id = UUID(token.sub)
    except ValueError:
        return None  # the middleware answers 401
    db_session = alchemy_config.provide_session(connection.app.state, connection.scope)
    async with UserService.new(session=db_session) as users_service:
        return await users_service.get_one_or_none(id=user_id)

jwt_auth = JWTAuth[User](
    retrieve_user_handler=retrieve_user_handler,
    token_secret=os.environ["JWT_SECRET"],  # fails at startup when unset
    default_token_expiration=timedelta(minutes=15),
    exclude=["/api/auth/login", "/schema"],
)

@post("/api/auth/login", dependencies={"users_service": Provide(provide_users_service)})
async def login(
    data: JSONBody[LoginRequest],
    users_service: NamedDependency[UserService],
) -> Response[Any]:
    user = await users_service.authenticate(data.email, data.password)  # raises UnauthorizedError
    return jwt_auth.login(identifier=str(user.id), send_token_as_response_body=True)
```

---

## 6. Password Hashing

```python
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

# The first hasher (Argon2id) is used for new hashes; bcrypt stays verifiable
# so legacy hashes can be upgraded on the next successful login.
# Requires pwdlib[argon2,bcrypt]. With no legacy hashes, use PasswordHash.recommended().
password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(plain: str, hashed: str) -> tuple[bool, str | None]:
    """Return (valid, upgraded_hash). Persist upgraded_hash when it is not None."""
    return password_hash.verify_and_update(plain, hashed)
```

---

## 7. Repository and Service Pattern

```python
# app/services/resource.py
from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from advanced_alchemy.filters import FilterTypes
from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from advanced_alchemy.service import SQLAlchemyAsyncRepositoryService, schema_dump

from app.core.errors import ForbiddenError, NotFoundError
from app.models.resource import Resource
from app.schemas.resource import ResourceCreate, ResourceUpdate

class ResourceService(SQLAlchemyAsyncRepositoryService[Resource]):
    """Business rules and ownership checks. Writes are flushed; the request-scoped session commits them."""

    class Repo(SQLAlchemyAsyncRepository[Resource]):
        """Data access only."""

        model_type = Resource

    repository_type = Repo

    async def get_for_user(self, resource_id: UUID, user_id: UUID) -> Resource:
        resource = await self.get_one_or_none(
            Resource.deleted_at.is_(None), id=resource_id
        )
        if resource is None:
            raise NotFoundError(f"Resource {resource_id} not found")
        if resource.user_id != user_id:
            raise ForbiddenError("Access denied")
        return resource

    async def create_for_user(self, user_id: UUID, data: ResourceCreate) -> Resource:
        return await self.create({**schema_dump(data), "user_id": user_id})

    async def update_for_user(
        self, resource_id: UUID, user_id: UUID, data: ResourceUpdate
    ) -> Resource:
        await self.get_for_user(resource_id, user_id)
        # schema_dump drops UNSET fields, so only provided fields change
        return await self.update(schema_dump(data), item_id=resource_id)

    async def delete_for_user(self, resource_id: UUID, user_id: UUID) -> None:
        await self.get_for_user(resource_id, user_id)
        # Soft delete: stamp deleted_at instead of removing the row
        await self.update({"deleted_at": datetime.now(UTC)}, item_id=resource_id)
```

---

## 8. Paginated Query

```python
# app/services/resource.py (continued)
    async def list_for_user(
        self, user_id: UUID, *filters: FilterTypes
    ) -> tuple[Sequence[Resource], int]:
        return await self.get_many_and_count(
            *filters, Resource.user_id == user_id, Resource.deleted_at.is_(None)
        )
```

```python
# app/controllers/resource.py (continued)
from advanced_alchemy.filters import FilterTypes
from advanced_alchemy.service import OffsetPagination
from litestar.params import SkipValidation

    # Limit/offset and search query parameters are parsed into the aggregated `filters` dependency
    dependencies = providers.create_service_dependencies(
        ResourceService,
        "resource_service",
        filters={
            "pagination_type": "limit_offset",
            "pagination_size": 20,
            "search": "title",
            "search_ignore_case": True,
        },
    )

    @get()
    async def list_resources(
        self,
        request: Request[User, Token, Any],
        resource_service: NamedDependency[ResourceService],
        filters: NamedDependency[SkipValidation[list[FilterTypes]]],
    ) -> OffsetPagination[ResourceResponse]:
        results, total = await resource_service.list_for_user(request.user.id, *filters)
        return resource_service.to_schema(
            results, total, filters=filters, schema_type=ResourceResponse
        )
```

---

## 9. Alembic Migration

```bash
# Generate a revision from the model metadata, review it, then apply it
litestar database make-migrations
litestar database upgrade
```

```python
"""add deleted_at to resources

Revision ID: xxxx
"""
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    op.add_column(
        "resources",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

def downgrade() -> None:
    op.drop_column("resources", "deleted_at")
```

---

## 10. Test with `AsyncTestClient`

```python
# Async tests and fixtures need the project's async pytest plugin (anyio or pytest-asyncio)
from collections.abc import AsyncIterator

import pytest
from litestar import Litestar
from litestar.status_codes import HTTP_201_CREATED, HTTP_401_UNAUTHORIZED
from litestar.testing import AsyncTestClient

from app.main import app

@pytest.fixture
async def client() -> AsyncIterator[AsyncTestClient[Litestar]]:
    async with AsyncTestClient(app=app) as test_client:
        yield test_client

async def test_create_resource(
    client: AsyncTestClient[Litestar], auth_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/resources",
        json={"title": "Test", "description": "Test desc"},
        headers=auth_headers,  # {"Authorization": "Bearer <token>"}
    )
    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "Test"
    assert "id" in data

async def test_list_resources_requires_auth(client: AsyncTestClient[Litestar]) -> None:
    response = await client.get("/api/resources")
    assert response.status_code == HTTP_401_UNAUTHORIZED
```
