"""
API Endpoint Template for Backend Agent (Python / Litestar)

Demonstrates the Controller -> Service -> Repository pattern
using Litestar, Advanced Alchemy (SQLAlchemy 2.0 async), and msgspec.

File layout (split into real modules in production):
  app/core/database.py           <- SQLAlchemy plugin config
  app/core/errors.py             <- AppError types + exception handler
  app/models/resource.py         <- SQLAlchemy model (Advanced Alchemy base)
  app/schemas/resource.py        <- msgspec request/response Structs
  app/services/resource.py       <- service (business logic) + inner repository
  app/controllers/resource.py    <- controller (HTTP concerns only)
  app/main.py                    <- application wiring
"""

import os
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

import msgspec
from advanced_alchemy.base import UUIDv7AuditBase
from advanced_alchemy.extensions.litestar import (
    AsyncSessionConfig,
    SQLAlchemyAsyncConfig,
    SQLAlchemyPlugin,
    providers,
)
from advanced_alchemy.filters import FilterTypes
from advanced_alchemy.repository import SQLAlchemyAsyncRepository
from advanced_alchemy.service import (
    OffsetPagination,
    SQLAlchemyAsyncRepositoryService,
    schema_dump,
)
from litestar import Controller, Litestar, Request, Response, delete, get, patch, post
from litestar.di import NamedDependency
from litestar.params import FromPath, JSONBody, SkipValidation
from litestar.security.jwt import Token
from litestar.status_codes import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.auth import jwt_auth  # JWTAuth instance, see snippets.md
from app.models.user import User

# ---------------------------------------------------------------------------
# app/core/database.py: SQLAlchemy plugin config
# ---------------------------------------------------------------------------

alchemy_config = SQLAlchemyAsyncConfig(
    connection_string=os.environ["DATABASE_URL"],  # fails at startup when unset
    session_config=AsyncSessionConfig(expire_on_commit=False),
    # One request is one unit of work: commit on a 2xx response, roll back otherwise
    before_send_handler="autocommit",
)

# ---------------------------------------------------------------------------
# app/core/errors.py: centralized error types
# Services raise these; controllers never build HTTP errors by hand.
# ---------------------------------------------------------------------------


class AppError(Exception):
    status_code = HTTP_500_INTERNAL_SERVER_ERROR
    code = "internal_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BadRequestError(AppError):
    status_code = HTTP_400_BAD_REQUEST
    code = "bad_request"


class UnauthorizedError(AppError):
    status_code = HTTP_401_UNAUTHORIZED
    code = "unauthorized"


class ForbiddenError(AppError):
    status_code = HTTP_403_FORBIDDEN
    code = "forbidden"


class NotFoundError(AppError):
    status_code = HTTP_404_NOT_FOUND
    code = "not_found"


def app_error_handler(_request: Request[Any, Any, Any], exc: AppError) -> Response[dict[str, str]]:
    return Response(
        {"code": exc.code, "message": exc.message},
        status_code=exc.status_code,
    )


# ---------------------------------------------------------------------------
# app/models/resource.py: SQLAlchemy model
# UUIDv7AuditBase supplies `id`, `created_at`, and `updated_at` (timezone-aware UTC).
# ---------------------------------------------------------------------------


class Resource(UUIDv7AuditBase):
    __tablename__ = "resources"

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    # Soft delete: stamped on delete, and every read filters on it
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------------------------------------------------------------------------
# app/schemas/resource.py: request/response Structs
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# app/services/resource.py: business logic and authorization
# The inner repository owns data access; writes are flushed and the
# request-scoped session commits them (see database.py).
# ---------------------------------------------------------------------------


class ResourceService(SQLAlchemyAsyncRepositoryService[Resource]):
    class Repo(SQLAlchemyAsyncRepository[Resource]):
        model_type = Resource

    repository_type = Repo

    async def list_for_user(
        self, user_id: UUID, *filters: FilterTypes
    ) -> tuple[Sequence[Resource], int]:
        return await self.get_many_and_count(
            *filters, Resource.user_id == user_id, Resource.deleted_at.is_(None)
        )

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


# ---------------------------------------------------------------------------
# app/controllers/resource.py: controller layer (NO business logic here)
# ---------------------------------------------------------------------------


class ResourceController(Controller):
    path = "/api/resources"
    # Provides `resource_service` plus the query-parameter filters aggregated as `filters`
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

    @get("/{resource_id:uuid}")
    async def get_resource(
        self,
        request: Request[User, Token, Any],
        resource_service: NamedDependency[ResourceService],
        resource_id: FromPath[UUID],
    ) -> ResourceResponse:
        resource = await resource_service.get_for_user(resource_id, request.user.id)
        return resource_service.to_schema(resource, schema_type=ResourceResponse)

    @post()
    async def create_resource(
        self,
        request: Request[User, Token, Any],
        resource_service: NamedDependency[ResourceService],
        data: JSONBody[ResourceCreate],
    ) -> ResourceResponse:
        """POST /api/resources (201 by default)"""
        resource = await resource_service.create_for_user(request.user.id, data)
        return resource_service.to_schema(resource, schema_type=ResourceResponse)

    @patch("/{resource_id:uuid}")
    async def update_resource(
        self,
        request: Request[User, Token, Any],
        resource_service: NamedDependency[ResourceService],
        resource_id: FromPath[UUID],
        data: JSONBody[ResourceUpdate],
    ) -> ResourceResponse:
        """Partial update: only provided fields change."""
        resource = await resource_service.update_for_user(
            resource_id, request.user.id, data
        )
        return resource_service.to_schema(resource, schema_type=ResourceResponse)

    @delete("/{resource_id:uuid}")
    async def delete_resource(
        self,
        request: Request[User, Token, Any],
        resource_service: NamedDependency[ResourceService],
        resource_id: FromPath[UUID],
    ) -> None:
        """DELETE /api/resources/{resource_id} (soft delete, 204 by default)"""
        await resource_service.delete_for_user(resource_id, request.user.id)


# ---------------------------------------------------------------------------
# app/main.py: application wiring
# ---------------------------------------------------------------------------

app = Litestar(
    route_handlers=[ResourceController],
    plugins=[SQLAlchemyPlugin(config=alchemy_config)],
    on_app_init=[jwt_auth.on_app_init],
    exception_handlers={AppError: app_error_handler},
)
