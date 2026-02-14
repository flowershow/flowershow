#!/usr/bin/env bats

load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'
load 'test_helper.bash'

# Run once before all tests
setup_file() {
    docker compose up -d --remove-orphans
    
    echo "Waiting for services to be healthy..."
    while ! docker compose ps | grep -q "healthy"; do
        sleep 1
    done
    
    echo "Setting up environment variables for the worker..."
    cat > .dev.vars << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:15432/postgres
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_REGION=us-east-1
S3_BUCKET=flowershow
S3_ENDPOINT=http://localhost:19000
S3_FORCE_PATH_STYLE=true
FILE_PROCESSOR_QUEUE=markdown-processing-queue-dev
EOF
    
    # Ensure worker is not running
    pkill -f "wrangler dev" || true
    sleep 2
    
    echo "Starting worker..."
    npm run dev &

    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f http://localhost:8787/ > /dev/null; then
            echo "Worker is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    if [ $attempt -eq $max_attempts ]; then
        echo "Worker failed to become ready"
        exit 1
    fi
    
    echo "Configuring MinIO..."
    docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
    
    echo "Creating bucket..."
    if ! docker compose exec minio mc ls local/flowershow &>/dev/null; then
        docker compose exec minio mc mb local/flowershow
    fi

    echo "Setting up MinIO events..."
    docker compose exec minio mc admin config set local \
        notify_webhook:worker \
        enable="on" \
        endpoint="http://host.docker.internal:8787/queue"

    echo "Restart MinIO container to apply webhook config..."
    docker compose restart minio

    while ! docker compose ps minio | grep -q "healthy"; do
        sleep 1
    done
    
    echo "Adding event configuration..."
    docker compose exec minio mc event add local/flowershow arn:minio:sqs::worker:webhook --event put
 
    if ! docker compose exec minio mc event list local/flowershow | grep -q "arn:minio:sqs::worker:webhook"; then
        echo "Failed to verify event configuration"
        exit 1
    fi
}

# Run once after all tests
teardown_file() {
    echo "Cleaning up infrastructure..."
    pkill -f "wrangler dev" || true
    docker compose down -v
}

# Run before each test
setup() {
    # Test parameters
    export SITE_ID="test-site-123"
    export BRANCH="main"
    export PATH_IN_REPO="articles/Test Article.md"
    export APP_PATH="articles/Test Article"
    export BLOB_ID="test-blob-123"
    
    echo "Setting up test data..."
    setup_test_data "$SITE_ID" "$BLOB_ID" "$PATH_IN_REPO" "$APP_PATH"
}

# Run after each test
teardown() {
    echo "Cleaning up test data..."
    cleanup_test_data "$SITE_ID"
}

@test "Full E2E flow: Initial upload and subsequent update" {
    echo "Testing initial upload..."
    create_test_content "Initial Article" "First version" "2024-03-20"
    docker compose cp test_content.md minio:/test_content.md
    docker compose exec minio mc cp /test_content.md "local/flowershow/$SITE_ID/$BRANCH/raw/$PATH_IN_REPO"
    rm test_content.md
    
    echo "Waiting for initial processing..."
    sleep 10
    
    result=$(docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -t -c \
        "SELECT json_build_object(
            'metadata', metadata,
            'syncStatus', \"syncStatus\",
            'syncError', \"syncError\"
         ) as result
         FROM \"Blob\"
         WHERE \"siteId\" = '$SITE_ID'
         AND path = '$PATH_IN_REPO'
         LIMIT 1;")
    
    assert [ ! -z "$result" ]
    
    # Parse the JSON result
    parsed=$(echo "$result" | sed -e 's/^[[:space:]]*//' | jq '.')
    
    # Extract metadata fields
    title=$(echo "$parsed" | jq -r '.metadata.title')
    description=$(echo "$parsed" | jq -r '.metadata.description')
    date=$(echo "$parsed" | jq -r '.metadata.date')
    
    # Extract status fields
    sync_status=$(echo "$parsed" | jq -r '.syncStatus')
    sync_error=$(echo "$parsed" | jq -r '.syncError')
    
    # Assert metadata
    assert_equal "$title" "Initial Article"
    assert_equal "$description" "First version"
    assert_equal "$date" "2024-03-20T00:00:00.000Z"
    
    # Assert status
    assert_equal "$sync_status" "SUCCESS"
    assert_equal "$sync_error" "null"
    
    echo "Testing update..."
    # Upload updated file
    create_test_content "Updated Article" "Second version" "2024-03-21"
    docker compose cp test_content.md minio:/test_content.md
    docker compose exec minio mc cp /test_content.md "local/flowershow/$SITE_ID/$BRANCH/raw/$PATH_IN_REPO"
    rm test_content.md
    
    echo "Waiting for update processing..."
    sleep 5
    
    result=$(docker compose exec postgres psql postgresql://postgres:postgres@localhost:5432/postgres -t -c \
        "SELECT json_build_object(
            'metadata', metadata,
            'syncStatus', \"syncStatus\",
            'syncError', \"syncError\"
         ) as result
         FROM \"Blob\"
         WHERE \"siteId\" = '$SITE_ID'
         AND path = '$PATH_IN_REPO'
         LIMIT 1;")
    
    assert [ ! -z "$result" ]
    
    # Parse the JSON result
    parsed=$(echo "$result" | sed -e 's/^[[:space:]]*//' | jq '.')
    
    # Extract metadata fields
    title=$(echo "$parsed" | jq -r '.metadata.title')
    description=$(echo "$parsed" | jq -r '.metadata.description')
    date=$(echo "$parsed" | jq -r '.metadata.date')
    
    # Extract status fields
    sync_status=$(echo "$parsed" | jq -r '.syncStatus')
    sync_error=$(echo "$parsed" | jq -r '.syncError')
    
    # Assert metadata
    assert_equal "$title" "Updated Article"
    assert_equal "$description" "Second version"
    assert_equal "$date" "2024-03-21T00:00:00.000Z"
    
    # Assert status
    assert_equal "$sync_status" "SUCCESS"
    assert_equal "$sync_error" "null"
}