-- Replace OAuth connectors with encrypted API-key / IMAP credentials.
-- Allow many connectors per provider. Drop Gmail OAuth in favor of email IMAP.

DROP TABLE IF EXISTS oauth_states;

ALTER TABLE connectors DROP CONSTRAINT IF EXISTS connectors_owner_id_provider_key;
ALTER TABLE connectors DROP CONSTRAINT IF EXISTS connectors_provider_check;
ALTER TABLE connectors DROP CONSTRAINT IF EXISTS connectors_status_check;

UPDATE connectors
SET status = 'revoked',
    access_token_ciphertext = NULL,
    access_token_nonce = NULL,
    refresh_token_ciphertext = NULL,
    refresh_token_nonce = NULL,
    token_expires_at = NULL,
    last_error = 're-connect with an API key or IMAP app password',
    updated_at = now()
WHERE status IN ('pending', 'connected', 'syncing', 'error');

ALTER TABLE connectors
    ADD COLUMN IF NOT EXISTS label TEXT,
    ADD COLUMN IF NOT EXISTS credential_ciphertext BYTEA,
    ADD COLUMN IF NOT EXISTS credential_nonce BYTEA;

UPDATE connectors
SET label = COALESCE(
    NULLIF(label, ''),
    NULLIF(external_account_name, ''),
    initcap(provider)
)
WHERE label IS NULL OR label = '';

ALTER TABLE connectors
    ALTER COLUMN label SET NOT NULL;

ALTER TABLE connectors
    DROP COLUMN IF EXISTS scopes,
    DROP COLUMN IF EXISTS access_token_ciphertext,
    DROP COLUMN IF EXISTS access_token_nonce,
    DROP COLUMN IF EXISTS refresh_token_ciphertext,
    DROP COLUMN IF EXISTS refresh_token_nonce,
    DROP COLUMN IF EXISTS token_expires_at;

UPDATE connectors
SET provider = 'email'
WHERE provider = 'gmail';

ALTER TABLE connectors
    ADD CONSTRAINT connectors_provider_check
        CHECK (provider IN ('github', 'linear', 'slack', 'email')),
    ADD CONSTRAINT connectors_status_check
        CHECK (status IN ('connected', 'error', 'revoked'));

CREATE UNIQUE INDEX IF NOT EXISTS connectors_owner_provider_account_uidx
    ON connectors (owner_id, provider, external_account_id)
    WHERE external_account_id IS NOT NULL AND status IN ('connected', 'error');
