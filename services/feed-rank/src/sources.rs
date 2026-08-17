use async_trait::async_trait;

use crate::{
    domain::{Candidate, CandidateSourceKind, FeedQuery},
    pipeline::{CandidateSource, PipelineError, SourceFailurePolicy},
};

/// Placeholder inventory boundary. Replace this with explicit following and
/// discovery implementations once their tables and eligibility rules exist.
pub struct EmptyCandidateSource;

#[async_trait]
impl CandidateSource for EmptyCandidateSource {
    fn kind(&self) -> CandidateSourceKind {
        CandidateSourceKind::Fallback
    }

    fn failure_policy(&self) -> SourceFailurePolicy {
        SourceFailurePolicy::Required
    }

    async fn candidates(&self, _query: &FeedQuery) -> Result<Vec<Candidate>, PipelineError> {
        Ok(Vec::new())
    }
}
