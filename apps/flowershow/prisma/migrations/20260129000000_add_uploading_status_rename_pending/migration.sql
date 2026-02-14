-- Add UPLOADING status to track files awaiting upload to R2
ALTER TYPE "Status" ADD VALUE 'UPLOADING' BEFORE 'PENDING';

-- Rename PENDING to PROCESSING for clarity (processing = parsing md/mdx content)
ALTER TYPE "Status" RENAME VALUE 'PENDING' TO 'PROCESSING';
