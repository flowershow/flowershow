#!/usr/bin/env bash
setup_test_data() {
    local site_id="$1"
    local blob_id="$2"
    local path="$3"
    local app_path="$4"
    local publish_id="$5"
    local publish_file_id="$6"

    # Create test site
    docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -c \
        "INSERT INTO \"Site\" (
            id, gh_repository, gh_branch, \"project_name\", \"created_at\", \"updated_at\",
            \"enable_comments\", plan
        ) VALUES (
            '$site_id', 'test/repo', 'main', 'Test Project', NOW(), NOW(),
            false, 'FREE'
        ) ON CONFLICT (id) DO NOTHING;"

    # Create blob for test file
    docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -c \
        "INSERT INTO \"Blob\" (
            id, \"site_id\", path, \"app_path\", size, sha, metadata, extension,
            \"created_at\", \"updated_at\"
        ) VALUES (
            '$blob_id', '$site_id', '$path', '$app_path', 100, 'test-sha',
            '{}'::jsonb, 'md', NOW(), NOW()
        ) ON CONFLICT (\"site_id\", path) DO NOTHING;"

    # Create Publish record
    docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -c \
        "INSERT INTO \"Publish\" (id, site_id, source, started_at)
         VALUES ('$publish_id', '$site_id', 'github_webhook', NOW())
         ON CONFLICT (id) DO NOTHING;"

    # Create PublishFile record (uploading state)
    docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -c \
        "INSERT INTO \"PublishFile\" (id, publish_id, path, change_type, status)
         VALUES ('$publish_file_id', '$publish_id', '$path', 'added', 'uploading')
         ON CONFLICT (id) DO NOTHING;"
}

cleanup_test_data() {
    local site_id="$1"

    # The Blob and Publish records will be automatically deleted due to ON DELETE CASCADE
    docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -c \
        "DELETE FROM \"Site\" WHERE id = '$site_id';"
}

create_test_content() {
    local title="$1"
    local description="$2"
    local date="$3"

    cat > test_content.md << EOF
---
title: $title
description: $description
date: $date
---

# $title

This is a test markdown file used to verify the S3 event trigger and queue processing functionality.
EOF
}
