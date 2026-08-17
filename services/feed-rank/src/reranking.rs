use std::collections::HashMap;

use thiserror::Error;

use crate::{
    domain::{AuthorId, FeedQuery, ScoredCandidate},
    pipeline::FeedReranker,
};

/// Applies a transparent multiplicative decay to repeated authors. This is a
/// slate-level policy after per-candidate scoring, not a learned feature.
pub struct AuthorDiversityReranker {
    decay: f64,
    floor: f64,
}

impl AuthorDiversityReranker {
    pub fn try_new(decay: f64, floor: f64) -> Result<Self, DiversityConfigError> {
        if !decay.is_finite() || !(0.0..=1.0).contains(&decay) {
            return Err(DiversityConfigError::InvalidDecay);
        }
        if !floor.is_finite() || !(0.0..=1.0).contains(&floor) {
            return Err(DiversityConfigError::InvalidFloor);
        }
        Ok(Self { decay, floor })
    }
}

impl Default for AuthorDiversityReranker {
    fn default() -> Self {
        Self {
            decay: 0.75,
            floor: 0.35,
        }
    }
}

impl FeedReranker for AuthorDiversityReranker {
    fn rerank(&self, _query: &FeedQuery, candidates: &mut [ScoredCandidate]) {
        let mut author_counts = HashMap::<AuthorId, i32>::new();
        for candidate in candidates {
            let repeated = author_counts
                .entry(candidate.candidate.author_id.clone())
                .or_insert(0);
            let multiplier = self.decay.powi(*repeated).max(self.floor);
            if candidate.score > 0.0 {
                candidate.score *= multiplier;
            }
            *repeated += 1;
        }
    }
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum DiversityConfigError {
    #[error("author-diversity decay must be finite and between zero and one")]
    InvalidDecay,
    #[error("author-diversity floor must be finite and between zero and one")]
    InvalidFloor,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_diversity_configuration() {
        let result = AuthorDiversityReranker::try_new(1.5, 0.35);
        assert!(matches!(result, Err(DiversityConfigError::InvalidDecay)));
    }
}
