"""
API Endpoint Template for Backend Agent

This template demonstrates best practices for FastAPI endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, List
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Resource
from app.schemas import ResourceCreate, ResourceUpdate, ResourceResponse
from app.services import ResourceService

# Type aliases for cleaner code
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]
UserDep = Annotated[User, Depends(get_current_user)]

# Router setup
router = APIRouter(
    prefix="/api/resources",
    tags=["resources"],
    responses={404: {"description": "Not found"}},
)


# List endpoint with pagination and filtering
@router.get(
    "/",
    response_model=List[ResourceResponse],
    summary="List resources",
    description="Retrieve a paginated list of resources with optional filtering"
)
async def list_resources(
    db: DatabaseDep,
    current_user: UserDep,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    search: str | None = Query(None, description="Search query"),
    status: str | None = Query(None, description="Filter by status"),
):
    """
    List resources with pagination.

    - **skip**: Offset for pagination
    - **limit**: Maximum number of records
    - **search**: Optional search term
    - **status**: Optional status filter
    """
    service = ResourceService(db)
    resources = await service.list_resources(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        search=search,
        status=status,
    )
    return resources


# Get single resource
@router.get(
    "/{resource_id}",
    response_model=ResourceResponse,
    summary="Get resource",
    responses={
        200: {"description": "Resource found"},
        404: {"description": "Resource not found"},
        403: {"description": "Access denied"}
    }
)
async def get_resource(
    resource_id: UUID,
    db: DatabaseDep,
    current_user: UserDep,
):
    """
    Get a specific resource by ID.

    Raises:
        404: Resource not found
        403: User doesn't own this resource
    """
    service = ResourceService(db)
    resource = await service.get_resource(resource_id)

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource {resource_id} not found"
        )

    # Authorization check
    if resource.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return resource


# Create resource
@router.post(
    "/",
    response_model=ResourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create resource",
)
async def create_resource(
    resource_data: ResourceCreate,
    db: DatabaseDep,
    current_user: UserDep,
):
    """
    Create a new resource.

    - **name**: Resource name (required)
    - **description**: Optional description
    - **status**: Initial status (default: active)
    """
    service = ResourceService(db)

    try:
        resource = await service.create_resource(
            user_id=current_user.id,
            data=resource_data
        )
        return resource
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Update resource
@router.patch(
    "/{resource_id}",
    response_model=ResourceResponse,
    summary="Update resource",
)
async def update_resource(
    resource_id: UUID,
    resource_data: ResourceUpdate,
    db: DatabaseDep,
    current_user: UserDep,
):
    """
    Update an existing resource (partial update).

    Only provided fields will be updated.
    """
    service = ResourceService(db)
    resource = await service.get_resource(resource_id)

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource {resource_id} not found"
        )

    if resource.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    try:
        updated_resource = await service.update_resource(resource, resource_data)
        return updated_resource
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Delete resource
@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete resource",
)
async def delete_resource(
    resource_id: UUID,
    db: DatabaseDep,
    current_user: UserDep,
    hard: bool = Query(False, description="Perform hard delete instead of soft delete"),
):
    """
    Delete a resource.

    - **hard=false**: Soft delete (default) - sets deleted_at timestamp
    - **hard=true**: Hard delete - permanently removes from database
    """
    service = ResourceService(db)
    resource = await service.get_resource(resource_id)

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource {resource_id} not found"
        )

    if resource.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    await service.delete_resource(resource, hard=hard)
    # 204 No Content - no response body


# Bulk operations example
@router.post(
    "/bulk",
    response_model=List[ResourceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Bulk create resources",
)
async def bulk_create_resources(
    resources_data: List[ResourceCreate],
    db: DatabaseDep,
    current_user: UserDep,
):
    """
    Create multiple resources in one request.

    Useful for batch imports.
    """
    if len(resources_data) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 100 resources per bulk operation"
        )

    service = ResourceService(db)
    try:
        return await service.bulk_create_resources(
            user_id=current_user.id,
            resources_data=resources_data,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Repository and service templates (separate files in app/repositories and app/services)
"""
from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Resource
from app.schemas import ResourceCreate, ResourceUpdate


class ResourceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_for_user(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        status: str | None = None,
    ) -> Sequence[Resource]:
        statement = select(Resource).where(
            Resource.user_id == user_id,
            Resource.deleted_at.is_(None),
        )
        if search:
            statement = statement.where(Resource.name.ilike(f"%{search}%"))
        if status:
            statement = statement.where(Resource.status == status)
        result = await self.db.execute(statement.offset(skip).limit(limit))
        return result.scalars().all()

    async def get(self, resource_id: UUID) -> Resource | None:
        statement = select(Resource).where(
            Resource.id == resource_id,
            Resource.deleted_at.is_(None),
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    def add(self, resource: Resource) -> None:
        self.db.add(resource)

    async def delete(self, resource: Resource) -> None:
        await self.db.delete(resource)


class ResourceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = ResourceRepository(db)

    async def list_resources(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        status: str | None = None,
    ) -> Sequence[Resource]:
        return await self.repository.list_for_user(
            user_id=user_id,
            skip=skip,
            limit=limit,
            search=search,
            status=status,
        )

    async def get_resource(self, resource_id: UUID) -> Resource | None:
        return await self.repository.get(resource_id)

    async def create_resource(self, user_id: UUID, data: ResourceCreate) -> Resource:
        resource = Resource(**data.model_dump(), user_id=user_id)
        self.repository.add(resource)
        try:
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise
        await self.db.refresh(resource)
        return resource

    async def update_resource(self, resource: Resource, data: ResourceUpdate) -> Resource:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(resource, field, value)

        await self.db.commit()
        await self.db.refresh(resource)
        return resource

    async def delete_resource(self, resource: Resource, hard: bool = False) -> None:
        if hard:
            await self.repository.delete(resource)
        else:
            resource.deleted_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def bulk_create_resources(
        self,
        user_id: UUID,
        resources_data: list[ResourceCreate],
    ) -> list[Resource]:
        resources = [
            Resource(**data.model_dump(), user_id=user_id)
            for data in resources_data
        ]
        for resource in resources:
            self.repository.add(resource)

        try:
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise

        for resource in resources:
            await self.db.refresh(resource)
        return resources
"""
