-- AlterTable: store tags as JSON array string
ALTER TABLE "RetroItem" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '["Other"]';

-- Backfill tags from the existing single-tag column
UPDATE "RetroItem" SET "tags" = '["' || replace("tag", '"', '\"') || '"]';
