use std::time::Duration;

use crate::{
    domain::{FeedQuery, SourcedCandidate, VisibilityDecision},
    pipeline::CandidateFilter,
};

pub struct VisibilityFilter;

impl CandidateFilter for VisibilityFilter {
    fn name(&self) -> &'static str {
        "visibility"
    }

    fn allows(&self, _query: &FeedQuery, candidate: &SourcedCandidate) -> bool {
        candidate.candidate.visibility == VisibilityDecision::Allow
    }
}

pub struct ExcludedPostFilter;

impl CandidateFilter for ExcludedPostFilter {
    fn name(&self) -> &'static str {
        "excluded_posts"
    }

    fn allows(&self, query: &FeedQuery, candidate: &SourcedCandidate) -> bool {
        !query.excludes(&candidate.candidate.post_id)
    }
}

pub struct MaxAgeFilter {
    maximum_age: Duration,
}

impl MaxAgeFilter {
    #[must_use]
    pub fn new(maximum_age: Duration) -> Self {
        Self { maximum_age }
    }
}

impl CandidateFilter for MaxAgeFilter {
    fn name(&self) -> &'static str {
        "maximum_age"
    }

    fn allows(&self, _query: &FeedQuery, candidate: &SourcedCandidate) -> bool {
        candidate.candidate.features.age_seconds <= self.maximum_age.as_secs()
    }
}
