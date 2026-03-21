"""
API Endpoint Template for Backend Agent

This template demonstrates best practices for FastAPI endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Resource
from app.schemas import ResourceCreate, ResourceUpdate, ResourceResponse
from app.services import ResourceService

# Type aliases for cleaner code
DatabaseDep = Annotated[Session, Depends(get_db)]
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
    resources = service.list_resources(
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
    resource = service.get_resource(resource_id)

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
        resource = service.create_resource(
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
    resource = service.get_resource(resource_id)

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
        updated_resource = service.update_resource(resource, resource_data)
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
    resource = service.get_resource(resource_id)

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

    service.delete_resource(resource, hard=hard)
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
    created_resources = []

    try:
        for data in resources_data:
            resource = service.create_resource(
                user_id=current_user.id,
                data=data
            )
            created_resources.append(resource)

        return created_resources
    except ValueError as e:
        db.rollback()  # Rollback on error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Service class template (separate file: app/services/resource_service.py)
"""
from sqlalchemy.orm import Session
from app.models import Resource
from app.schemas import ResourceCreate, ResourceUpdate
from datetime import datetime
from uuid import UUID

class ResourceService:
    def __init__(self, db: Session):
        self.db = db

    def list_resources(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        status: str | None = None,
    ):
        query = self.db.query(Resource).filter(
            Resource.user_id == user_id,
            Resource.deleted_at.is_(None)
        )

        if search:
            query = query.filter(Resource.name.ilike(f"%{search}%"))

        if status:
            query = query.filter(Resource.status == status)

        return query.offset(skip).limit(limit).all()

    def get_resource(self, resource_id: UUID) -> Resource | None:
        return self.db.query(Resource).filter(
            Resource.id == resource_id,
            Resource.deleted_at.is_(None)
        ).first()

    def create_resource(self, user_id: UUID, data: ResourceCreate) -> Resource:
        resource = Resource(
            **data.model_dump(),
            user_id=user_id
        )
        self.db.add(resource)
        self.db.commit()
        self.db.refresh(resource)
        return resource

    def update_resource(self, resource: Resource, data: ResourceUpdate) -> Resource:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(resource, field, value)

        self.db.commit()
        self.db.refresh(resource)
        return resource

    def delete_resource(self, resource: Resource, hard: bool = False):
        if hard:
            self.db.delete(resource)
        else:
            resource.deleted_at = datetime.utcnow()

        self.db.commit()
"""
