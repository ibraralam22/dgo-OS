-- This migration is intentionally additive. The repository predates Prisma
-- migration history, so apply it through the deployment database workflow.
CREATE TYPE "NotificationCategory" AS ENUM ('CRM_ACTIVITY', 'TASK_REMINDER', 'CALENDAR_REMINDER');
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "actorId" UUID,
  "resourceType" VARCHAR(50) NOT NULL,
  "resourceId" UUID,
  "category" "NotificationCategory" NOT NULL DEFAULT 'CRM_ACTIVITY',
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "title" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "dedupeKey" VARCHAR(255) NOT NULL,
  "readAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "notifications_recipientId_dedupeKey_key" ON "notifications"("recipientId", "dedupeKey");
CREATE INDEX "notifications_organizationId_recipientId_createdAt_idx" ON "notifications"("organizationId", "recipientId", "createdAt" DESC);
CREATE INDEX "notifications_recipientId_readAt_createdAt_idx" ON "notifications"("recipientId", "readAt", "createdAt" DESC);
CREATE INDEX "notifications_readAt_idx" ON "notifications"("readAt");
