ALTER TABLE "files" ALTER COLUMN "storage_medium" SET DEFAULT 'local';--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "storage_medium" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "secured" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "secured" DROP NOT NULL;