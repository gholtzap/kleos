use std::sync::Arc;

use axum::{
    Json, Router,
    extract::{FromRequest, Request, State, rejection::JsonRejection},
    http::{HeaderMap, StatusCode, header::AUTHORIZATION},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::{FeedQuery, MAXIMUM_EXCLUDED_POSTS, PostId, ScoredCandidate, ViewerId},
    pipeline::FeedPipeline,
};

const SERVICE_NAME: &str = "kleos-feed-ranker";

#[derive(Clone)]
pub struct AppState {
    pipeline: Arc<FeedPipeline>,
    auth_token: Arc<str>,
}

impl AppState {
    #[must_use]
    pub fn new(pipeline: FeedPipeline, auth_token: String) -> Self {
        Self {
            pipeline: Arc::new(pipeline),
            auth_token: Arc::from(auth_token),
        }
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/v1/rank", post(rank_feed))
        .with_state(state)
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        service: SERVICE_NAME,
        status: "ok",
    })
}

async fn rank_feed(
    State(state): State<AppState>,
    headers: HeaderMap,
    StrictJson(request): StrictJson<RankFeedRequest>,
) -> Result<Json<RankFeedResponse>, ApiError> {
    authorize(&headers, &state.auth_token)?;
    let query = request.into_query()?;
    let ranked = state
        .pipeline
        .rank(&query)
        .await
        .map_err(|error| ApiError::unavailable(error.to_string()))?;
    Ok(Json(RankFeedResponse {
        request_id: Uuid::new_v4().to_string(),
        model_version: ranked.model_version,
        items: ranked.posts.into_iter().map(RankedPost::from).collect(),
        next_cursor: None,
    }))
}

fn authorize(headers: &HeaderMap, expected_token: &str) -> Result<(), ApiError> {
    let supplied = headers
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));
    if supplied == Some(expected_token) {
        Ok(())
    } else {
        Err(ApiError::unauthorized())
    }
}

struct StrictJson<T>(T);

impl<S, T> FromRequest<S> for StrictJson<T>
where
    S: Send + Sync,
    T: for<'de> Deserialize<'de>,
{
    type Rejection = ApiError;

    async fn from_request(request: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Json(value) = Json::<T>::from_request(request, state)
            .await
            .map_err(ApiError::invalid_json)?;
        Ok(Self(value))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RankFeedRequest {
    viewer_id: String,
    page_size: u16,
    #[serde(default)]
    excluded_post_ids: Vec<String>,
}

impl RankFeedRequest {
    fn into_query(self) -> Result<FeedQuery, ApiError> {
        if self.excluded_post_ids.len() > MAXIMUM_EXCLUDED_POSTS {
            return Err(ApiError::bad_request(format!(
                "excludedPostIds cannot contain more than {MAXIMUM_EXCLUDED_POSTS} items"
            )));
        }
        let viewer_id = ViewerId::try_from(self.viewer_id)
            .map_err(|error| ApiError::bad_request(error.to_string()))?;
        let excluded_post_ids = self
            .excluded_post_ids
            .into_iter()
            .map(PostId::try_from)
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| ApiError::bad_request(error.to_string()))?;
        FeedQuery::new(viewer_id, self.page_size, excluded_post_ids)
            .map_err(|error| ApiError::bad_request(error.to_string()))
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RankFeedResponse {
    pub request_id: String,
    pub model_version: String,
    pub items: Vec<RankedPost>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RankedPost {
    pub post_id: String,
    pub score: f64,
    pub source: crate::domain::CandidateSourceKind,
}

impl From<ScoredCandidate> for RankedPost {
    fn from(value: ScoredCandidate) -> Self {
        Self {
            post_id: value.candidate.post_id.to_string(),
            score: value.score,
            source: value.source,
        }
    }
}

#[derive(Serialize)]
struct HealthResponse {
    service: &'static str,
    status: &'static str,
}

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: String,
}

impl ApiError {
    fn bad_request(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            code: "invalid_request",
            message: message.into(),
        }
    }

    fn invalid_json(rejection: JsonRejection) -> Self {
        Self::bad_request(rejection.body_text())
    }

    fn unauthorized() -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            code: "unauthorized",
            message: "A valid service bearer token is required.".to_owned(),
        }
    }

    fn unavailable(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::SERVICE_UNAVAILABLE,
            code: "ranking_unavailable",
            message: message.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ErrorEnvelope {
                error: ErrorBody {
                    code: self.code,
                    message: self.message,
                },
            }),
        )
            .into_response()
    }
}

#[derive(Serialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
}

#[cfg(test)]
mod tests {
    use axum::{
        body::{Body, to_bytes},
        http::{Request, StatusCode, header::CONTENT_TYPE},
    };
    use tower::ServiceExt;

    use super::*;
    use crate::default_pipeline;

    const TOKEN: &str = "local-test-token-with-at-least-32-bytes";

    #[tokio::test]
    async fn returns_an_empty_typed_page_until_a_source_is_connected() {
        let application = router(AppState::new(default_pipeline(), TOKEN.to_owned()));
        let request = Request::builder()
            .method("POST")
            .uri("/v1/rank")
            .header(AUTHORIZATION, format!("Bearer {TOKEN}"))
            .header(CONTENT_TYPE, "application/json")
            .body(Body::from(r#"{"viewerId":"viewer-1","pageSize":20}"#))
            .expect("request should be valid");
        let response = application
            .oneshot(request)
            .await
            .expect("router should respond");

        assert_eq!(response.status(), StatusCode::OK);
        let bytes = to_bytes(response.into_body(), 64 * 1024)
            .await
            .expect("response body should be readable");
        let page: RankFeedResponse =
            serde_json::from_slice(&bytes).expect("response should match its contract");
        assert_eq!(page.model_version, "heuristic-v0");
        assert!(page.items.is_empty());
        assert!(page.next_cursor.is_none());
    }

    #[tokio::test]
    async fn rejects_missing_service_authentication() {
        let application = router(AppState::new(default_pipeline(), TOKEN.to_owned()));
        let request = Request::builder()
            .method("POST")
            .uri("/v1/rank")
            .header(CONTENT_TYPE, "application/json")
            .body(Body::from(r#"{"viewerId":"viewer-1","pageSize":20}"#))
            .expect("request should be valid");
        let response = application
            .oneshot(request)
            .await
            .expect("router should respond");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn rejects_unknown_request_fields() {
        let application = router(AppState::new(default_pipeline(), TOKEN.to_owned()));
        let request = Request::builder()
            .method("POST")
            .uri("/v1/rank")
            .header(AUTHORIZATION, format!("Bearer {TOKEN}"))
            .header(CONTENT_TYPE, "application/json")
            .body(Body::from(
                r#"{"viewerId":"viewer-1","pageSize":20,"untyped":true}"#,
            ))
            .expect("request should be valid");
        let response = application
            .oneshot(request)
            .await
            .expect("router should respond");

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
