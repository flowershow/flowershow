#!/usr/bin/env bash
setup_test_data() {
    local site_id="$1"
    local blob_id="$2"
    local path="$3"
    
    # Create test site
    docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -c \
        "INSERT INTO \"Site\" (
            id, gh_repository, gh_branch, \"project_name\", \"created_at\", \"updated_at\",
            \"auto_aync\", \"enable_comments\", plan
        ) VALUES (
            '$site_id', 'test/repo', 'main', 'Test Project', NOW(), NOW(),
            false, false, 'FREE'
        ) ON CONFLICT (id) DO NOTHING;"

    # Create blob for test file
    docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -c \
        "INSERT INTO \"Blob\" (
            id, \"siteId\", path, \"app_path\", size, sha, metadata, extension,
            \"sync_status\", \"sync_error\", \"created_at\", \"updated_at\"
        ) VALUES (
            '$blob_id', '$site_id', '$path', '$4', 100, 'test-sha',
            '{}'::jsonb, 'md', 'PENDING', NULL, NOW(), NOW()
        ) ON CONFLICT (\"siteId\", path) DO NOTHING;"
}

cleanup_test_data() {
    local site_id="$1"
    
    # The Blob records will be automatically deleted due to ON DELETE CASCADE
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