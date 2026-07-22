# Module 9 — Notifications

## Overview

Notifications are persistent, tenant-scoped in-app messages for related CRM users. They are created after a successful CRM mutation and delivered immediately through the `/notifications` Socket.IO namespace. The database is authoritative, so clients reload through REST after reconnecting.

## API

All endpoints require JWT authentication, the active `x-tenant-id`, and `notifications:read`:

- `GET /api/v1/notifications?status=all|unread&page=1&limit=20`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:id/read`
- `POST /api/v1/notifications/mark-all-read`

Users can only read and update their own notifications in the active tenant.

## Real-time delivery

Connect to the Socket.IO `/notifications` namespace with `auth.token` (JWT) and `auth.organizationId`. A verified member joins a private `notifications:{organizationId}:{userId}` room. New items arrive as `notification.created`. Set `NEXT_PUBLIC_SOCKET_URL` to the public backend origin when the frontend and backend are on different origins.

Redis provides the Socket.IO adapter for multi-instance fan-out. `REDIS_URL` is already mandatory backend configuration.

## Scheduled work and retention

The scheduler runs every minute. It sends task reminders 24 hours before due dates, one overdue reminder per task per day, and attendee reminders 15 minutes before timed calendar events. Dedupe keys guarantee one delivery for each reminder window. Read notifications older than 90 days are deleted; unread items are retained.

## Migration and deployment

`backend/prisma/migrations/20260721000000_add_notifications/migration.sql` is additive and creates only notification types, table, foreign keys, and indexes. The configured database predates Prisma migration history and reported drift, so it must be applied by the deployment database workflow instead of using `prisma migrate reset`.
