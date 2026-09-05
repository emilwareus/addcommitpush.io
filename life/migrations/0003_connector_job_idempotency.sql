CREATE UNIQUE INDEX ingestion_jobs_one_active_connector_sync_idx
    ON ingestion_jobs (connector_id, job_kind)
    WHERE connector_id IS NOT NULL AND status IN ('queued', 'running');
