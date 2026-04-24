# Backend Agent - Code Snippets (Rust / Axum)

Copy-paste ready patterns. Use these as starting points, adapt to the specific task.

---

## 1. Axum Handler with Auth Middleware

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::AuthUser,
    models::resource::{ResourceCreate, ResourceResponse},
    services::ResourceService,
    AppState,
};

pub async fn create_resource(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<ResourceCreate>,
) -> Result<(StatusCode, Json<ResourceResponse>), AppError> {
    let resource = state
        .resource_service
        .create(&state.db, user.id, payload)
        .await?;

    Ok((StatusCode::CREATED, Json(resource)))
}

pub async fn get_resource(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(resource_id): Path<Uuid>,
) -> Result<Json<ResourceResponse>, AppError> {
    let resource = state
        .resource_service
        .get_by_id(&state.db, resource_id)
        .await?;

    if resource.user_id != user.id {
        return Err(AppError::Forbidden);
    }

    Ok(Json(resource))
}
```

---

## 2. Serde + Validator Struct

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct ResourceCreate {
    #[validate(length(min = 1, max = 200))]
    pub title: String,

    #[validate(length(max = 2000))]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ResourceUpdate {
    #[validate(length(min = 1, max = 200))]
    pub title: Option<String>,

    #[validate(length(max = 2000))]
    pub description: Option<Option<String>>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ResourceResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

---

## 3. SQLx Query Example (Compile-Time Checked)

```rust
use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, models::resource::ResourceResponse};

// sqlx::query_as! performs compile-time SQL verification against DATABASE_URL
pub async fn find_by_id(
    pool: &PgPool,
    id: Uuid,
) -> Result<Option<ResourceResponse>, AppError> {
    let resource = sqlx::query_as!(
        ResourceResponse,
        r#"
        SELECT id, title, description, user_id, created_at, updated_at
        FROM resources
        WHERE id = $1 AND deleted_at IS NULL
        "#,
        id
    )
    .fetch_optional(pool)
    .await?;

    Ok(resource)
}

pub async fn insert(
    pool: &PgPool,
    user_id: Uuid,
    title: &str,
    description: Option<&str>,
) -> Result<ResourceResponse, AppError> {
    let resource = sqlx::query_as!(
        ResourceResponse,
        r#"
        INSERT INTO resources (id, title, description, user_id, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
        RETURNING id, title, description, user_id, created_at, updated_at
        "#,
        title,
        description,
        user_id,
    )
    .fetch_one(pool)
    .await?;

    Ok(resource)
}
```

---

## 4. Axum State-Based Dependency Injection

```rust
use axum::{routing::get, Router};
use sqlx::PgPool;
use std::sync::Arc;

use crate::services::{ResourceService, UserService};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub resource_service: Arc<ResourceService>,
    pub user_service: Arc<UserService>,
}

impl AppState {
    pub fn new(db: PgPool) -> Self {
        Self {
            db: db.clone(),
            resource_service: Arc::new(ResourceService::new()),
            user_service: Arc::new(UserService::new()),
        }
    }
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/api/resources", get(handlers::resource::list).post(handlers::resource::create))
        .route(
            "/api/resources/:id",
            get(handlers::resource::get_resource)
                .patch(handlers::resource::update)
                .delete(handlers::resource::delete),
        )
        .with_state(state)
}
```

---

## 5. Repository Pattern with SQLx

```rust
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, models::resource::{ResourceCreate, ResourceResponse}};

#[async_trait]
pub trait ResourceRepository: Send + Sync {
    async fn find_by_id(&self, pool: &PgPool, id: Uuid) -> Result<Option<ResourceResponse>, AppError>;
    async fn find_all_by_user(&self, pool: &PgPool, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<ResourceResponse>, AppError>;
    async fn create(&self, pool: &PgPool, user_id: Uuid, data: &ResourceCreate) -> Result<ResourceResponse, AppError>;
    async fn delete(&self, pool: &PgPool, id: Uuid) -> Result<(), AppError>;
}

pub struct PgResourceRepository;

#[async_trait]
impl ResourceRepository for PgResourceRepository {
    async fn find_by_id(&self, pool: &PgPool, id: Uuid) -> Result<Option<ResourceResponse>, AppError> {
        let row = sqlx::query_as!(
            ResourceResponse,
            "SELECT id, title, description, user_id, created_at, updated_at FROM resources WHERE id = $1 AND deleted_at IS NULL",
            id
        )
        .fetch_optional(pool)
        .await?;
        Ok(row)
    }

    async fn find_all_by_user(
        &self,
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<ResourceResponse>, AppError> {
        let rows = sqlx::query_as!(
            ResourceResponse,
            "SELECT id, title, description, user_id, created_at, updated_at FROM resources WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            user_id,
            limit,
            offset,
        )
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    async fn create(&self, pool: &PgPool, user_id: Uuid, data: &ResourceCreate) -> Result<ResourceResponse, AppError> {
        let row = sqlx::query_as!(
            ResourceResponse,
            "INSERT INTO resources (id, title, description, user_id, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW()) RETURNING id, title, description, user_id, created_at, updated_at",
            data.title,
            data.description,
            user_id,
        )
        .fetch_one(pool)
        .await?;
        Ok(row)
    }

    async fn delete(&self, pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        sqlx::query!(
            "UPDATE resources SET deleted_at = NOW() WHERE id = $1",
            id
        )
        .execute(pool)
        .await?;
        Ok(())
    }
}
```

---

## 6. Paginated Query

```rust
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, models::resource::ResourceResponse};

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub size: i64,
}

pub async fn list_resources_paginated(
    pool: &PgPool,
    user_id: Uuid,
    page: i64,
    size: i64,
) -> Result<PaginatedResponse<ResourceResponse>, AppError> {
    let offset = (page - 1) * size;

    // Run count and data queries concurrently
    let (total, items) = tokio::try_join!(
        async {
            sqlx::query_scalar!(
                "SELECT COUNT(*) FROM resources WHERE user_id = $1 AND deleted_at IS NULL",
                user_id
            )
            .fetch_one(pool)
            .await
            .map_err(AppError::from)
        },
        async {
            sqlx::query_as!(
                ResourceResponse,
                r#"
                SELECT id, title, description, user_id, created_at, updated_at
                FROM resources
                WHERE user_id = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
                user_id,
                size,
                offset,
            )
            .fetch_all(pool)
            .await
            .map_err(AppError::from)
        }
    )?;

    Ok(PaginatedResponse {
        items,
        total: total.unwrap_or(0),
        page,
        size,
    })
}
```

---

## 7. SQLx Migration

```sql
-- migrations/20240101000001_create_resources.sql

CREATE TABLE resources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_resources_user_id ON resources(user_id);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_set_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
```

Run migrations via:
```bash
sqlx migrate run
```

---

## 8. Integration Test with axum::test

```rust
#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::{header, Method, Request, StatusCode},
    };
    use serde_json::{json, Value};
    use tower::ServiceExt; // for `oneshot`

    use crate::{create_router, AppState};

    // Helper: build a test app connected to a test database
    async fn test_app() -> (axum::Router, sqlx::PgPool) {
        let pool = sqlx::PgPool::connect(&std::env::var("DATABASE_URL_TEST").unwrap())
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        let state = AppState::new(pool.clone());
        let app = create_router(state);
        (app, pool)
    }

    #[tokio::test]
    async fn test_create_resource_returns_201() {
        let (app, _pool) = test_app().await;
        let token = create_test_jwt(); // helper that mints a valid JWT

        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/resources")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::from(
                serde_json::to_string(&json!({
                    "title": "Test Resource",
                    "description": "Integration test"
                }))
                .unwrap(),
            ))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["title"], "Test Resource");
        assert!(json["id"].is_string());
    }

    #[tokio::test]
    async fn test_get_resource_not_found_returns_404() {
        let (app, _pool) = test_app().await;
        let token = create_test_jwt();
        let nonexistent_id = uuid::Uuid::new_v4();

        let request = Request::builder()
            .method(Method::GET)
            .uri(format!("/api/resources/{nonexistent_id}"))
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    fn create_test_jwt() -> String {
        use jsonwebtoken::{encode, EncodingKey, Header};
        use serde_json::json;

        let claims = json!({
            "sub": uuid::Uuid::new_v4().to_string(),
            "exp": (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
        });

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(b"test-secret"),
        )
        .unwrap()
    }
}
```
