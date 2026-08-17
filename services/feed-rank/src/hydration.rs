use async_trait::async_trait;

use crate::{
    domain::{FeedQuery, SourcedCandidate},
    pipeline::{FeatureHydrator, PipelineError},
};

/// Keeps the feature-hydration stage explicit while inventory is empty. Real
/// hydrators can later add viewer affinity, profile overlap, and aggregate data.
pub struct NoopFeatureHydrator;

#[async_trait]
impl FeatureHydrator for NoopFeatureHydrator {
    fn name(&self) -> &'static str {
        "noop"
    }

    async fn hydrate(
        &self,
        _query: &FeedQuery,
        _candidates: &mut [SourcedCandidate],
    ) -> Result<(), PipelineError> {
        Ok(())
    }
}
