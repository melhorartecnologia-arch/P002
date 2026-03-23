#!/bin/bash
set -e

MINIO_HOST="${MINIO_HOST:-http://minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-dora_minio}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-dora_minio_secret}"
BUCKET_NAME="${MINIO_BUCKET:-dora-documents}"

echo "Waiting for MinIO to be ready..."
until curl -sf "${MINIO_HOST}/minio/health/live" > /dev/null 2>&1; do
  echo "  MinIO not ready yet, retrying in 2s..."
  sleep 2
done
echo "MinIO is ready."

# Configure MinIO Client alias
mc alias set dora "${MINIO_HOST}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

# Create bucket if it doesn't exist
if mc ls dora/"${BUCKET_NAME}" > /dev/null 2>&1; then
  echo "Bucket '${BUCKET_NAME}' already exists."
else
  echo "Creating bucket '${BUCKET_NAME}'..."
  mc mb dora/"${BUCKET_NAME}"
  echo "Bucket '${BUCKET_NAME}' created."
fi

# Set bucket policy for read access
echo "Setting bucket policy for read access..."
mc anonymous set download dora/"${BUCKET_NAME}"

echo "MinIO initialization complete."
