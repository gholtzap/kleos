use std::{collections::HashSet, sync::Arc};

use async_trait::async_trait;
use futures::future::join_all;
use thiserror::Error;
use tracing::warn;

use crate::domain::{
    Candidate, CandidateSourceKind, FeedQuery, PostId, RankedFeed, ScoredCandidate,
    SourcedCandidate,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SourceFailurePolicy {
    BestEffort,
    Required,
}

#[async_trait]
pub trait CandidateSource: Send + Sync {
    fn kind(&self) -> CandidateSourceKind;
    fn failure_policy(&self) -> SourceFailurePolicy;
    async fn candidates(&self, query: &FeedQuery) -> Result<Vec<Candidate>, PipelineError>;
}

#[async_trait]
pub trait FeatureHydrator: Send + Sync {
    fn name(&self) -> &'static str;
    async fn hydrate(
        &self,
        query: &FeedQuery,
        candidates: &mut [SourcedCandidate],
    ) -> Result<(), PipelineError>;
}

pub trait CandidateFilter: Send + Sync {
    fn name(&self) -> &'static str;
    fn allows(&self, query: &FeedQuery, candidate: &SourcedCandidate) -> bool;
}

pub trait CandidateScorer: Send + Sync {
    fn model_version(&self) -> &'static str;
    fn score(&self, query: &FeedQuery, candidate: &SourcedCandidate) -> Result<f64, PipelineError>;
}

pub trait FeedReranker: Send + Sync {
    fn rerank(&self, query: &FeedQuery, candidates: &mut [ScoredCandidate]);
}

pub struct FeedPipeline {
    sources: Vec<Arc<dyn CandidateSource>>,
    hydrators: Vec<Arc<dyn FeatureHydrator>>,
    filters: Vec<Arc<dyn CandidateFilter>>,
    scorer: Arc<dyn CandidateScorer>,
    reranker: Arc<dyn FeedReranker>,
}

impl FeedPipeline {
    #[must_use]
    pub fn new(
        sources: Vec<Arc<dyn CandidateSource>>,
        hydrators: Vec<Arc<dyn FeatureHydrator>>,
        filters: Vec<Arc<dyn CandidateFilter>>,
        scorer: Arc<dyn CandidateScorer>,
        reranker: Arc<dyn FeedReranker>,
    ) -> Self {
        Self {
            sources,
            hydrators,
            filters,
            scorer,
            reranker,
        }
    }

    pub async fn rank(&self, query: &FeedQuery) -> Result<RankedFeed, PipelineError> {
        let source_results = join_all(
            self.sources
                .iter()
                .map(|source| async move { (source.as_ref(), source.candidates(query).await) }),
        )
        .await;
        let mut seen_post_ids = HashSet::<PostId>::new();
        let mut candidates = Vec::<SourcedCandidate>::new();

        for (source, result) in source_results {
            match result {
                Ok(source_candidates) => {
                    for candidate in source_candidates {
                        if seen_post_ids.insert(candidate.post_id.clone()) {
                            candidates.push(SourcedCandidate {
                                candidate,
                                source: source.kind(),
                            });
                        }
                    }
                }
                Err(error) if source.failure_policy() == SourceFailurePolicy::BestEffort => {
                    warn!(source = %source.kind(), %error, "candidate source failed; continuing");
                }
                Err(error) => return Err(error),
            }
        }

        for hydrator in &self.hydrators {
            hydrator
                .hydrate(query, &mut candidates)
                .await
                .map_err(|error| PipelineError::Hydration {
                    hydrator: hydrator.name(),
                    message: error.to_string(),
                })?;
        }
        for candidate in &candidates {
            if let Err(feature) = candidate.candidate.features.validate() {
                return Err(PipelineError::InvalidFeature {
                    post_id: candidate.candidate.post_id.clone(),
                    feature,
                });
            }
        }
        for filter in &self.filters {
            candidates.retain(|candidate| filter.allows(query, candidate));
        }

        let mut scored = candidates
            .into_iter()
            .map(|sourced| {
                let score = self.scorer.score(query, &sourced)?;
                if !score.is_finite() {
                    return Err(PipelineError::NonFiniteScore {
                        post_id: sourced.candidate.post_id,
                    });
                }
                Ok(ScoredCandidate {
                    candidate: sourced.candidate,
                    source: sourced.source,
                    score,
                })
            })
            .collect::<Result<Vec<_>, PipelineError>>()?;
        sort_by_score(&mut scored);
        self.reranker.rerank(query, &mut scored);
        sort_by_score(&mut scored);
        scored.truncate(query.page_size);

        Ok(RankedFeed {
            model_version: self.scorer.model_version().to_owned(),
            posts: scored,
        })
    }
}

fn sort_by_score(candidates: &mut [ScoredCandidate]) {
    candidates.sort_by(|left, right| {
        right
            .score
            .total_cmp(&left.score)
            .then_with(|| left.candidate.post_id.cmp(&right.candidate.post_id))
    });
}

#[derive(Debug, Error)]
pub enum PipelineError {
    #[error("candidate source {source_kind} failed: {message}")]
    CandidateSource {
        source_kind: CandidateSourceKind,
        message: String,
    },
    #[error("feature hydrator {hydrator} failed: {message}")]
    Hydration {
        hydrator: &'static str,
        message: String,
    },
    #[error("post {post_id} has invalid feature {feature}")]
    InvalidFeature {
        post_id: PostId,
        feature: &'static str,
    },
    #[error("the scorer produced a non-finite score for post {post_id}")]
    NonFiniteScore { post_id: PostId },
}

impl PipelineError {
    #[must_use]
    pub fn source(source: CandidateSourceKind, message: impl Into<String>) -> Self {
        Self::CandidateSource {
            source_kind: source,
            message: message.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{sync::Arc, time::Duration};

    use async_trait::async_trait;

    use super::*;
    use crate::{
        domain::{AuthorId, CandidateFeatures, ViewerId, VisibilityDecision},
        filters::{ExcludedPostFilter, MaxAgeFilter, VisibilityFilter},
        hydration::NoopFeatureHydrator,
        reranking::AuthorDiversityReranker,
        scoring::HeuristicScorer,
    };

    struct StaticSource {
        kind: CandidateSourceKind,
        failure_policy: SourceFailurePolicy,
        candidates: Vec<Candidate>,
        fails: bool,
    }

    #[async_trait]
    impl CandidateSource for StaticSource {
        fn kind(&self) -> CandidateSourceKind {
            self.kind
        }

        fn failure_policy(&self) -> SourceFailurePolicy {
            self.failure_policy
        }

        async fn candidates(&self, _query: &FeedQuery) -> Result<Vec<Candidate>, PipelineError> {
            if self.fails {
                Err(PipelineError::source(self.kind, "test source failure"))
            } else {
                Ok(self.candidates.clone())
            }
        }
    }

    fn candidate(
        post_id: &str,
        author_id: &str,
        quality: f64,
        age_seconds: u64,
        visibility: VisibilityDecision,
    ) -> Candidate {
        Candidate {
            post_id: PostId::try_from(post_id).expect("test post ID should be valid"),
            author_id: AuthorId::try_from(author_id).expect("test author ID should be valid"),
            features: CandidateFeatures {
                age_seconds,
                author_affinity: 1.0,
                expertise_overlap: 1.0,
                in_network: true,
                quality,
                slop_score: 0,
            },
            visibility,
        }
    }

    fn query(excluded_post_ids: Vec<PostId>) -> FeedQuery {
        FeedQuery::new(
            ViewerId::try_from("viewer-1").expect("test viewer ID should be valid"),
            20,
            excluded_post_ids,
        )
        .expect("test query should be valid")
    }

    fn pipeline(sources: Vec<Arc<dyn CandidateSource>>) -> FeedPipeline {
        FeedPipeline::new(
            sources,
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

    #[tokio::test]
    async fn deduplicates_filters_scores_and_diversifies_candidates() {
        let following = StaticSource {
            kind: CandidateSourceKind::Following,
            failure_policy: SourceFailurePolicy::Required,
            candidates: vec![
                candidate("post-1", "author-1", 1.0, 0, VisibilityDecision::Allow),
                candidate("post-2", "author-1", 0.9, 0, VisibilityDecision::Allow),
                candidate("post-drop", "author-3", 1.0, 0, VisibilityDecision::Drop),
            ],
            fails: false,
        };
        let discovery = StaticSource {
            kind: CandidateSourceKind::Discovery,
            failure_policy: SourceFailurePolicy::BestEffort,
            candidates: vec![
                candidate("post-1", "author-9", 0.0, 0, VisibilityDecision::Allow),
                candidate("post-3", "author-2", 0.8, 0, VisibilityDecision::Allow),
                candidate(
                    "post-old",
                    "author-4",
                    1.0,
                    49 * 60 * 60,
                    VisibilityDecision::Allow,
                ),
                candidate(
                    "post-excluded",
                    "author-5",
                    1.0,
                    0,
                    VisibilityDecision::Allow,
                ),
            ],
            fails: false,
        };
        let excluded = PostId::try_from("post-excluded").expect("test post ID should be valid");

        let ranked = pipeline(vec![Arc::new(following), Arc::new(discovery)])
            .rank(&query(vec![excluded]))
            .await
            .expect("pipeline should rank valid candidates");
        let post_ids = ranked
            .posts
            .iter()
            .map(|post| post.candidate.post_id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(post_ids, vec!["post-1", "post-3", "post-2"]);
        assert_eq!(ranked.posts[0].source, CandidateSourceKind::Following);
        assert_eq!(ranked.model_version, "heuristic-v0");
    }

    #[tokio::test]
    async fn continues_after_a_best_effort_source_fails() {
        let failed = StaticSource {
            kind: CandidateSourceKind::Discovery,
            failure_policy: SourceFailurePolicy::BestEffort,
            candidates: Vec::new(),
            fails: true,
        };
        let fallback = StaticSource {
            kind: CandidateSourceKind::Fallback,
            failure_policy: SourceFailurePolicy::Required,
            candidates: vec![candidate(
                "post-1",
                "author-1",
                1.0,
                0,
                VisibilityDecision::Allow,
            )],
            fails: false,
        };

        let ranked = pipeline(vec![Arc::new(failed), Arc::new(fallback)])
            .rank(&query(Vec::new()))
            .await
            .expect("best-effort source failure should not fail the feed");

        assert_eq!(ranked.posts.len(), 1);
        assert_eq!(ranked.posts[0].candidate.post_id.as_str(), "post-1");
    }

    #[tokio::test]
    async fn fails_when_a_required_source_fails() {
        let source = StaticSource {
            kind: CandidateSourceKind::Following,
            failure_policy: SourceFailurePolicy::Required,
            candidates: Vec::new(),
            fails: true,
        };

        let result = pipeline(vec![Arc::new(source)])
            .rank(&query(Vec::new()))
            .await;

        assert!(matches!(
            result,
            Err(PipelineError::CandidateSource {
                source_kind: CandidateSourceKind::Following,
                ..
            })
        ));
    }
}
