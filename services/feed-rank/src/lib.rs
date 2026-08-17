pub mod api;
pub mod config;
pub mod domain;
pub mod filters;
pub mod hydration;
pub mod pipeline;
pub mod reranking;
pub mod scoring;
pub mod sources;

use std::{sync::Arc, time::Duration};

use filters::{ExcludedPostFilter, MaxAgeFilter, VisibilityFilter};
use hydration::NoopFeatureHydrator;
use pipeline::FeedPipeline;
use reranking::AuthorDiversityReranker;
use scoring::HeuristicScorer;
use sources::EmptyCandidateSource;

/// The deployable scaffold uses an empty source until a durable Postgres-backed
/// source exists. Tests inject deterministic sources through `FeedPipeline::new`.
#[must_use]
pub fn default_pipeline() -> FeedPipeline {
    FeedPipeline::new(
        vec![Arc::new(EmptyCandidateSource)],
        vec![Arc::new(NoopFeatureHydrator)],
        vec![
            Arc::new(VisibilityFilter),
            Arc::new(ExcludedPostFilter),
            Arc::new(MaxAgeFilter::new(Duration::from_secs(48 * 60 * 60))),
        ],
        Arc::new(HeuristicScorer::default()),
        Arc::new(AuthorDiversityReranker::default()),
    )
}
