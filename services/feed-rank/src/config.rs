use std::{env, net::SocketAddr};

use thiserror::Error;

const DEFAULT_BIND_ADDRESS: &str = "127.0.0.1:8081";
const MINIMUM_AUTH_TOKEN_BYTES: usize = 32;

pub struct ServiceConfig {
    pub bind_address: SocketAddr,
    pub auth_token: String,
}

impl ServiceConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let bind_address = env::var("FEED_RANKER_BIND_ADDRESS")
            .unwrap_or_else(|_| DEFAULT_BIND_ADDRESS.to_owned())
            .parse()
            .map_err(ConfigError::InvalidBindAddress)?;
        let auth_token =
            env::var("FEED_RANKER_AUTH_TOKEN").map_err(|_| ConfigError::MissingAuthToken)?;
        if auth_token.len() < MINIMUM_AUTH_TOKEN_BYTES {
            return Err(ConfigError::ShortAuthToken);
        }
        Ok(Self {
            bind_address,
            auth_token,
        })
    }
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("FEED_RANKER_BIND_ADDRESS is not a valid socket address: {0}")]
    InvalidBindAddress(std::net::AddrParseError),
    #[error("FEED_RANKER_AUTH_TOKEN is required")]
    MissingAuthToken,
    #[error("FEED_RANKER_AUTH_TOKEN must contain at least 32 bytes")]
    ShortAuthToken,
}
