use std::error::Error;

use kleos_feed_ranker::{api, config::ServiceConfig, default_pipeline};
use tokio::net::TcpListener;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let config = ServiceConfig::from_env()?;
    let listener = TcpListener::bind(config.bind_address).await?;
    let application = api::router(api::AppState::new(default_pipeline(), config.auth_token));

    info!(address = %config.bind_address, "Kleos feed ranker listening");
    axum::serve(listener, application)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    if let Err(error) = tokio::signal::ctrl_c().await {
        error!(%error, "failed to install shutdown signal handler");
    }
}
