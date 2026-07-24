use std::env;
use std::str::FromStr as _;

use anyhow::{Context as _, bail};
use sha2::{Digest as _, Sha256};
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use uuid::Uuid;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let database_url = required("DATABASE_URL")?;
    let owner_id = Uuid::parse_str(&required("LIFE_OWNER_ID")?).context("parse LIFE_OWNER_ID")?;
    let credential_id =
        Uuid::parse_str(&required("LIFE_CREDENTIAL_ID")?).context("parse LIFE_CREDENTIAL_ID")?;
    let display_name = required("LIFE_OWNER_DISPLAY_NAME")?;
    let timezone = required("LIFE_OWNER_TIMEZONE")?;
    let locale = required("LIFE_OWNER_LOCALE")?;
    let token = required("LIFE_USER_TOKEN")?;
    if token.len() < 32 {
        bail!("LIFE_USER_TOKEN must contain at least 32 characters");
    }

    let options = PgConnectOptions::from_str(&database_url).context("parse DATABASE_URL")?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect_with(options)
        .await
        .context("connect to PostgreSQL")?;
    sqlx::migrate!()
        .run(&pool)
        .await
        .context("run database migrations")?;

    let token_hash = Sha256::digest(token.as_bytes());
    let mut transaction = pool
        .begin()
        .await
        .context("begin provisioning transaction")?;
    sqlx::query(
        r"
        INSERT INTO owners (id, display_name, timezone, locale, profile_markdown)
        VALUES ($1, $2, $3, $4, '')
        ON CONFLICT (id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            timezone = EXCLUDED.timezone,
            locale = EXCLUDED.locale,
            updated_at = now()
        ",
    )
    .bind(owner_id)
    .bind(display_name)
    .bind(timezone)
    .bind(locale)
    .execute(&mut *transaction)
    .await
    .context("provision owner")?;
    sqlx::query(
        r"
        INSERT INTO api_credentials (id, owner_id, label, token_hash)
        VALUES ($1, $2, 'primary', $3)
        ON CONFLICT (id) DO UPDATE
        SET owner_id = EXCLUDED.owner_id,
            label = EXCLUDED.label,
            token_hash = EXCLUDED.token_hash,
            expires_at = NULL,
            revoked_at = NULL
        ",
    )
    .bind(credential_id)
    .bind(owner_id)
    .bind(token_hash.as_slice())
    .execute(&mut *transaction)
    .await
    .context("provision API credential")?;
    transaction
        .commit()
        .await
        .context("commit provisioning transaction")?;

    println!("provisioned owner {owner_id}");
    Ok(())
}

fn required(name: &'static str) -> anyhow::Result<String> {
    env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .with_context(|| format!("{name} is required"))
}
