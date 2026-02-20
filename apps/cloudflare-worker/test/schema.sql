DROP TABLE IF EXISTS "Blob";
DROP TABLE IF EXISTS "Site";

CREATE TABLE "Site" (
    id TEXT PRIMARY KEY,
    gh_repository TEXT NOT NULL,
    gh_branch TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    custom_domain TEXT UNIQUE,
    root_dir TEXT,
    project_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    auto_sync BOOLEAN NOT NULL DEFAULT false,
    webhook_id TEXT UNIQUE,
    enable_comments BOOLEAN NOT NULL DEFAULT false,
    giscus_repo_id TEXT,
    giscus_category_id TEXT,
    plan TEXT NOT NULL DEFAULT 'FREE',
    tree JSONB,
    UNIQUE(user_id, project_name)
);

CREATE INDEX site_user_id_idx ON "Site"(user_id);

CREATE TABLE "Blob" (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES "Site"(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    app_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    sha TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    extension TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, path),
    UNIQUE(site_id, app_path)
);

CREATE INDEX blob_site_id_idx ON "Blob"(site_id);
CREATE INDEX blob_app_path_idx ON "Blob"(app_path);