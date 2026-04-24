// API Template for Backend Agent (Rust / Axum)
//
// Demonstrates the Handler -> Service -> Repository pattern with SQLx.
// Each layer has a single responsibility:
//   - handlers/  : HTTP concerns only (extract, validate, respond)
//   - services/  : Business logic, authorization, orchestration
//   - repositories/ : Raw DB access, no business logic
//
// Cargo.toml dependencies required:
//   axum = "0.8"
//   sqlx = { version = "0.8", features = ["postgres", "uuid", "chrono", "runtime-tokio-native-tls", "macros"] }
//   tokio = { version = "1", features = ["full"] }
//   serde = { version = "1", features = ["derive"] }
//   serde_json = "1"
//   uuid = { version = "1", features = ["v4", "serde"] }
//   chrono = { version = "0.4", features = ["serde"] }
//   thiserror = "1"
//   validator = { version = "0.18", features = ["derive"] }
//   jsonwebtoken = "9"
//   async-trait = "0.1"

// ============================================================
// error.rs — Centralized error type
// ============================================================

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found")]
    NotFound,

    #[error("forbidden")]
    Forbidden,

    #[error("unauthorized")]
    Unauthorized,

    #[error("validation error: {0}")]
    Validation(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, self.to_string()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::Validation(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            AppError::Database(_) | AppError::Internal(_) => {
                tracing::error!(error = %self, "unhandled error");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".to_string())
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

// ============================================================
// models/resource.rs — Domain model + request/response types
// ============================================================

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// Represents a row in the `resources` table.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Resource {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request body for POST /api/resources
#[derive(Debug, Deserialize, Validate)]
pub struct ResourceCreate {
    #[validate(length(min = 1, max = 200, message = "title must be 1-200 characters"))]
    pub title: String,

    #[validate(length(max = 2000, message = "description must not exceed 2000 characters"))]
    pub description: Option<String>,
}

/// Request body for PATCH /api/resources/:id
#[derive(Debug, Deserialize, Validate)]
pub struct ResourceUpdate {
    #[validate(length(min = 1, max = 200, message = "title must be 1-200 characters"))]
    pub title: Option<String>,

    /// `None` means "do not change"; `Some(None)` means "set to null"
    pub description: Option<Option<String>>,
}

/// Paginated list query params
#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_size")]
    pub size: i64,
}

fn default_page() -> i64 { 1 }
fn default_size() -> i64 { 20 }

/// Generic paginated response envelope
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub size: i64,
}

// ============================================================
// extractors/auth.rs — JWT extractor as Axum FromRequestParts
// ============================================================

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap},
    RequestPartsExt,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Claims {
    sub: Uuid,
    exp: i64,
}

/// Authenticated user injected by the JWT extractor.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
}

#[async_trait]
impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let headers: &HeaderMap = &parts.headers;

        let token = headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or(AppError::Unauthorized)?;

        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());

        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser {
            id: token_data.claims.sub,
        })
    }
}

// ============================================================
// repositories/resource_repository.rs — DB access layer
// ============================================================

use sqlx::PgPool;

pub struct ResourceRepository;

impl ResourceRepository {
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Resource>, AppError> {
        let row = sqlx::query_as!(
            Resource,
            r#"
            SELECT id, title, description, user_id, created_at, updated_at
            FROM resources
            WHERE id = $1
              AND deleted_at IS NULL
            "#,
            id
        )
        .fetch_optional(pool)
        .await?;

        Ok(row)
    }

    pub async fn find_all_by_user(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Resource>, i64), AppError> {
        let (rows, total) = tokio::try_join!(
            sqlx::query_as!(
                Resource,
                r#"
                SELECT id, title, description, user_id, created_at, updated_at
                FROM resources
                WHERE user_id = $1
                  AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
                user_id,
                limit,
                offset,
            )
            .fetch_all(pool),
            sqlx::query_scalar!(
                "SELECT COUNT(*) FROM resources WHERE user_id = $1 AND deleted_at IS NULL",
                user_id
            )
            .fetch_one(pool),
        )?;

        Ok((rows, total.unwrap_or(0)))
    }

    pub async fn insert(
        pool: &PgPool,
        user_id: Uuid,
        title: &str,
        description: Option<&str>,
    ) -> Result<Resource, AppError> {
        let row = sqlx::query_as!(
            Resource,
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

        Ok(row)
    }

    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        title: Option<&str>,
        description: Option<Option<&str>>,
    ) -> Result<Resource, AppError> {
        // Build a targeted update; only changed fields are written
        let row = sqlx::query_as!(
            Resource,
            r#"
            UPDATE resources
            SET title       = COALESCE($2, title),
                description = CASE WHEN $3 THEN $4 ELSE description END,
                updated_at  = NOW()
            WHERE id = $1
              AND deleted_at IS NULL
            RETURNING id, title, description, user_id, created_at, updated_at
            "#,
            id,
            title,
            description.is_some(),        // $3: whether to touch the column
            description.flatten() as _,   // $4: the new value (may be NULL)
        )
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)?;

        Ok(row)
    }

    pub async fn soft_delete(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query!(
            "UPDATE resources SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
            id
        )
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound);
        }

        Ok(())
    }
}

// ============================================================
// services/resource_service.rs — Business logic layer
// ============================================================

use validator::Validate;

pub struct ResourceService;

impl ResourceService {
    pub async fn list(
        &self,
        pool: &PgPool,
        user_id: Uuid,
        params: &PaginationParams,
    ) -> Result<PaginatedResponse<Resource>, AppError> {
        let size = params.size.clamp(1, 100);
        let page = params.page.max(1);
        let offset = (page - 1) * size;

        let (items, total) =
            ResourceRepository::find_all_by_user(pool, user_id, size, offset).await?;

        Ok(PaginatedResponse { items, total, page, size })
    }

    pub async fn get_for_user(
        &self,
        pool: &PgPool,
        resource_id: Uuid,
        user_id: Uuid,
    ) -> Result<Resource, AppError> {
        let resource = ResourceRepository::find_by_id(pool, resource_id)
            .await?
            .ok_or(AppError::NotFound)?;

        if resource.user_id != user_id {
            return Err(AppError::Forbidden);
        }

        Ok(resource)
    }

    pub async fn create(
        &self,
        pool: &PgPool,
        user_id: Uuid,
        payload: ResourceCreate,
    ) -> Result<Resource, AppError> {
        payload.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        ResourceRepository::insert(pool, user_id, &payload.title, payload.description.as_deref())
            .await
    }

    pub async fn update(
        &self,
        pool: &PgPool,
        resource_id: Uuid,
        user_id: Uuid,
        payload: ResourceUpdate,
    ) -> Result<Resource, AppError> {
        payload.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        // Confirm ownership before mutating
        let _ = self.get_for_user(pool, resource_id, user_id).await?;

        ResourceRepository::update(
            pool,
            resource_id,
            payload.title.as_deref(),
            payload.description.as_ref().map(|opt| opt.as_deref()),
        )
        .await
    }

    pub async fn delete(
        &self,
        pool: &PgPool,
        resource_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        let _ = self.get_for_user(pool, resource_id, user_id).await?;
        ResourceRepository::soft_delete(pool, resource_id).await
    }
}

// ============================================================
// handlers/resource.rs — HTTP layer (thin wrappers)
// ============================================================

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub resource_service: Arc<ResourceService>,
}

/// GET /api/resources?page=1&size=20
pub async fn list_resources(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<Resource>>, AppError> {
    let result = state.resource_service.list(&state.db, user.id, &params).await?;
    Ok(Json(result))
}

/// GET /api/resources/:id
pub async fn get_resource(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(resource_id): Path<Uuid>,
) -> Result<Json<Resource>, AppError> {
    let resource = state
        .resource_service
        .get_for_user(&state.db, resource_id, user.id)
        .await?;
    Ok(Json(resource))
}

/// POST /api/resources
pub async fn create_resource(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<ResourceCreate>,
) -> Result<(StatusCode, Json<Resource>), AppError> {
    let resource = state
        .resource_service
        .create(&state.db, user.id, payload)
        .await?;
    Ok((StatusCode::CREATED, Json(resource)))
}

/// PATCH /api/resources/:id
pub async fn update_resource(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(resource_id): Path<Uuid>,
    Json(payload): Json<ResourceUpdate>,
) -> Result<Json<Resource>, AppError> {
    let resource = state
        .resource_service
        .update(&state.db, resource_id, user.id, payload)
        .await?;
    Ok(Json(resource))
}

/// DELETE /api/resources/:id
pub async fn delete_resource(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(resource_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    state
        .resource_service
        .delete(&state.db, resource_id, user.id)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ============================================================
// main.rs — Router wiring and server startup
// ============================================================

use axum::{routing, Router};

pub fn resource_router(state: AppState) -> Router {
    Router::new()
        .route(
            "/api/resources",
            routing::get(list_resources).post(create_resource),
        )
        .route(
            "/api/resources/:id",
            routing::get(get_resource)
                .patch(update_resource)
                .delete(delete_resource),
        )
        .with_state(state)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::PgPool::connect(&database_url).await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    let state = AppState {
        db: pool,
        resource_service: Arc::new(ResourceService),
    };

    let app = resource_router(state);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;

    tracing::info!("listening on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;

    Ok(())
}

// ============================================================
// tests/resource_integration.rs — Integration tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{header, Method, Request, StatusCode},
    };
    use tower::ServiceExt;

    async fn build_test_app() -> (Router, PgPool) {
        let pool = sqlx::PgPool::connect(&std::env::var("DATABASE_URL_TEST").unwrap())
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        let state = AppState {
            db: pool.clone(),
            resource_service: Arc::new(ResourceService),
        };
        (resource_router(state), pool)
    }

    fn mint_jwt(user_id: Uuid) -> String {
        use jsonwebtoken::{encode, EncodingKey, Header};
        let claims = serde_json::json!({
            "sub": user_id.to_string(),
            "exp": (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
        });
        encode(&Header::default(), &claims, &EncodingKey::from_secret(b"secret")).unwrap()
    }

    #[tokio::test]
    async fn create_and_fetch_resource() {
        let (app, _pool) = build_test_app().await;
        let user_id = Uuid::new_v4();
        let token = mint_jwt(user_id);

        // Create
        let create_req = Request::builder()
            .method(Method::POST)
            .uri("/api/resources")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::from(r#"{"title":"hello","description":"world"}"#))
            .unwrap();

        let create_resp = app.clone().oneshot(create_req).await.unwrap();
        assert_eq!(create_resp.status(), StatusCode::CREATED);

        let bytes = axum::body::to_bytes(create_resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        let resource_id = body["id"].as_str().unwrap().to_owned();

        // Fetch
        let get_req = Request::builder()
            .method(Method::GET)
            .uri(format!("/api/resources/{resource_id}"))
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap();

        let get_resp = app.oneshot(get_req).await.unwrap();
        assert_eq!(get_resp.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn delete_resource_returns_no_content() {
        let (app, pool) = build_test_app().await;
        let user_id = Uuid::new_v4();
        let token = mint_jwt(user_id);

        // Seed directly via repository
        let resource = ResourceRepository::insert(&pool, user_id, "temp", None)
            .await
            .unwrap();

        let req = Request::builder()
            .method(Method::DELETE)
            .uri(format!("/api/resources/{}", resource.id))
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap();

        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::NO_CONTENT);
    }
}
