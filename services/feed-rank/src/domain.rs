use std::{collections::HashSet, fmt};

use serde::{Deserialize, Serialize};
use thiserror::Error;

const MAXIMUM_IDENTIFIER_BYTES: usize = 200;
pub const MAXIMUM_PAGE_SIZE: u16 = 100;
pub const MAXIMUM_EXCLUDED_POSTS: usize = 500;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum IdentifierKind {
    Author,
    Post,
    Viewer,
}

impl fmt::Display for IdentifierKind {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let name = match self {
            Self::Author => "author ID",
            Self::Post => "post ID",
            Self::Viewer => "viewer ID",
        };
        formatter.write_str(name)
    }
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum IdentifierError {
    #[error("{kind} cannot be empty")]
    Empty { kind: IdentifierKind },
    #[error("{kind} cannot start or end with whitespace")]
    SurroundingWhitespace { kind: IdentifierKind },
    #[error("{kind} cannot exceed {MAXIMUM_IDENTIFIER_BYTES} bytes")]
    TooLong { kind: IdentifierKind },
}

macro_rules! identifier {
    ($name:ident, $kind:expr) => {
        #[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
        pub struct $name(String);

        impl $name {
            #[must_use]
            pub fn as_str(&self) -> &str {
                &self.0
            }
        }

        impl TryFrom<String> for $name {
            type Error = IdentifierError;

            fn try_from(value: String) -> Result<Self, Self::Error> {
                if value.is_empty() {
                    return Err(IdentifierError::Empty { kind: $kind });
                }
                if value.trim() != value {
                    return Err(IdentifierError::SurroundingWhitespace { kind: $kind });
                }
                if value.len() > MAXIMUM_IDENTIFIER_BYTES {
                    return Err(IdentifierError::TooLong { kind: $kind });
                }
                Ok(Self(value))
            }
        }

        impl TryFrom<&str> for $name {
            type Error = IdentifierError;

            fn try_from(value: &str) -> Result<Self, Self::Error> {
                Self::try_from(value.to_owned())
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str(&self.0)
            }
        }
    };
}

identifier!(AuthorId, IdentifierKind::Author);
identifier!(PostId, IdentifierKind::Post);
identifier!(ViewerId, IdentifierKind::Viewer);

#[derive(Clone, Debug)]
pub struct FeedQuery {
    pub viewer_id: ViewerId,
    pub page_size: usize,
    excluded_post_ids: HashSet<PostId>,
}

impl FeedQuery {
    pub fn new(
        viewer_id: ViewerId,
        page_size: u16,
        excluded_post_ids: Vec<PostId>,
    ) -> Result<Self, FeedQueryError> {
        if !(1..=MAXIMUM_PAGE_SIZE).contains(&page_size) {
            return Err(FeedQueryError::InvalidPageSize);
        }
        if excluded_post_ids.len() > MAXIMUM_EXCLUDED_POSTS {
            return Err(FeedQueryError::TooManyExcludedPosts);
        }
        Ok(Self {
            viewer_id,
            page_size: usize::from(page_size),
            excluded_post_ids: excluded_post_ids.into_iter().collect(),
        })
    }

    #[must_use]
    pub fn excludes(&self, post_id: &PostId) -> bool {
        self.excluded_post_ids.contains(post_id)
    }
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum FeedQueryError {
    #[error("pageSize must be between 1 and {MAXIMUM_PAGE_SIZE}")]
    InvalidPageSize,
    #[error("excludedPostIds cannot contain more than {MAXIMUM_EXCLUDED_POSTS} items")]
    TooManyExcludedPosts,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CandidateSourceKind {
    Discovery,
    Fallback,
    Following,
    Popular,
}

impl fmt::Display for CandidateSourceKind {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let value = match self {
            Self::Discovery => "discovery",
            Self::Fallback => "fallback",
            Self::Following => "following",
            Self::Popular => "popular",
        };
        formatter.write_str(value)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum VisibilityDecision {
    Allow,
    Drop,
}

#[derive(Clone, Debug, PartialEq)]
pub struct CandidateFeatures {
    pub age_seconds: u64,
    pub author_affinity: f64,
    pub expertise_overlap: f64,
    pub in_network: bool,
    pub quality: f64,
    pub slop_score: u8,
}

impl CandidateFeatures {
    pub fn validate(&self) -> Result<(), &'static str> {
        for (name, value) in [
            ("author_affinity", self.author_affinity),
            ("expertise_overlap", self.expertise_overlap),
            ("quality", self.quality),
        ] {
            if !value.is_finite() || !(0.0..=1.0).contains(&value) {
                return Err(name);
            }
        }
        if self.slop_score > 100 {
            return Err("slop_score");
        }
        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Candidate {
    pub post_id: PostId,
    pub author_id: AuthorId,
    pub features: CandidateFeatures,
    pub visibility: VisibilityDecision,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SourcedCandidate {
    pub candidate: Candidate,
    pub source: CandidateSourceKind,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ScoredCandidate {
    pub candidate: Candidate,
    pub source: CandidateSourceKind,
    pub score: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RankedFeed {
    pub model_version: String,
    pub posts: Vec<ScoredCandidate>,
}
