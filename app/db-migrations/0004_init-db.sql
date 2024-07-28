ALTER TABLE "files" ALTER COLUMN "storage_medium" SET DEFAULT 'disk';--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "storage_medium" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "secured" SET NOT NULL;