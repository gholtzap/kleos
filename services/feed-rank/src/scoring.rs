use thiserror::Error;

use crate::{
    domain::{FeedQuery, SourcedCandidate},
    pipeline::{CandidateScorer, PipelineError},
};

const MODEL_VERSION: &str = "heuristic-v0";

#[derive(Clone, Copy, Debug)]
pub struct HeuristicWeights {
    pub author_affinity: f64,
    pub expertise_overlap: f64,
    pub freshness: f64,
    pub in_network: f64,
    pub quality: f64,
    pub slop_penalty: f64,
}

impl HeuristicWeights {
    fn validate(self) -> Result<Self, ScoringConfigError> {
        for (name, value) in [
            ("author_affinity", self.author_affinity),
            ("expertise_overlap", self.expertise_overlap),
            ("freshness", self.freshness),
            ("in_network", self.in_network),
            ("quality", self.quality),
            ("slop_penalty", self.slop_penalty),
        ] {
            if !value.is_finite() || value < 0.0 {
                return Err(ScoringConfigError::InvalidWeight { name });
            }
        }
        Ok(self)
    }
}

impl Default for HeuristicWeights {
    fn default() -> Self {
        Self {
            author_affinity: 0.30,
            expertise_overlap: 0.20,
            freshness: 0.25,
            in_network: 0.20,
            quality: 0.15,
            slop_penalty: 0.20,
        }
    }
}

pub struct HeuristicScorer {
    weights: HeuristicWeights,
    freshness_half_life_seconds: f64,
}

impl HeuristicScorer {
    pub fn try_new(
        weights: HeuristicWeights,
        freshness_half_life_seconds: f64,
    ) -> Result<Self, ScoringConfigError> {
        if !freshness_half_life_seconds.is_finite() || freshness_half_life_seconds <= 0.0 {
            return Err(ScoringConfigError::InvalidFreshnessHalfLife);
        }
        Ok(Self {
            weights: weights.validate()?,
            freshness_half_life_seconds,
        })
    }
}

impl Default for HeuristicScorer {
    fn default() -> Self {
        Self {
            weights: HeuristicWeights::default(),
            freshness_half_life_seconds: 12.0 * 60.0 * 60.0,
        }
    }
}

impl CandidateScorer for HeuristicScorer {
    fn model_version(&self) -> &'static str {
        MODEL_VERSION
    }

    fn score(
        &self,
        _query: &FeedQuery,
        candidate: &SourcedCandidate,
    ) -> Result<f64, PipelineError> {
        let features = &candidate.candidate.features;
        let freshness = (-std::f64::consts::LN_2 * features.age_seconds as f64
            / self.freshness_half_life_seconds)
            .exp();
        let in_network = if features.in_network { 1.0 } else { 0.0 };
        let slop = f64::from(features.slop_score) / 100.0;

        Ok(self.weights.freshness * freshness
            + self.weights.in_network * in_network
            + self.weights.author_affinity * features.author_affinity
            + self.weights.expertise_overlap * features.expertise_overlap
            + self.weights.quality * features.quality
            - self.weights.slop_penalty * slop)
    }
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum ScoringConfigError {
    #[error("scoring weight {name} must be finite and non-negative")]
    InvalidWeight { name: &'static str },
    #[error("freshness half-life must be finite and greater than zero")]
    InvalidFreshnessHalfLife,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_scoring_configuration() {
        let result = HeuristicScorer::try_new(HeuristicWeights::default(), 0.0);
        assert!(matches!(
            result,
            Err(ScoringConfigError::InvalidFreshnessHalfLife)
        ));
    }
}
