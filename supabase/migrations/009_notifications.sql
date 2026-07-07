-- =============================================================================
-- Migration 009: Notifications
-- =============================================================================
-- Depends on: 001, 002
-- Creates: notifications, user_notifications
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: notifications
-- A notification template/event record created by an admin.
-- One notification row represents a single send event (broadcast or targeted).
--
-- target_type = 'all': one notifications row; user_notifications rows created
--   for each customer at delivery time (by Edge Function or on-demand).
-- target_type = 'individual': one notifications row + one user_notifications row.
--
-- Push notification provider integration is NOT implemented in this step.
-- This table is the source of truth for in-app notification delivery.
--
-- created_by_admin_user_id: nullable; NULL for system-generated notifications
--   (e.g. order status change notifications triggered by the backend).
--   ON DELETE SET NULL: admin user deactivation does not erase notification history.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
    id                          UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type           notification_type           NOT NULL,
    target_type                 notification_target_type    NOT NULL,
    title                       TEXT                        NOT NULL,
    message                     TEXT                        NOT NULL,
    metadata                    JSONB                       DEFAULT '{}',   -- e.g. order_id for order updates
    created_by_admin_user_id    UUID                        REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_notifications_title   CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT chk_notifications_message CHECK (LENGTH(TRIM(message)) > 0)
);

COMMENT ON TABLE notifications IS
    'Notification events created by admins or the backend system. '
    'target_type = all: fan-out to all users via Edge Function. '
    'target_type = individual: one user_notifications row. '
    'Push delivery is not implemented in v1; in-app polling reads user_notifications.';

-- ---------------------------------------------------------------------------
-- TABLE: user_notifications
-- Per-user delivery record for a notification.
-- Tracks read state independently per user.
--
-- notification_id ON DELETE CASCADE: if a notification is retracted (admin
--   action), all per-user delivery records are removed.
-- user_id ON DELETE CASCADE: if a customer deletes their account, their
--   notification delivery records are removed.
--
-- UNIQUE (notification_id, user_id): prevents duplicate delivery records
--   for the same notification to the same user.
-- ---------------------------------------------------------------------------
CREATE TABLE user_notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID        NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (notification_id, user_id),

    -- read_at must be set when is_read = TRUE
    CONSTRAINT chk_user_notifications_read_at
        CHECK (
            (is_read = FALSE AND read_at IS NULL) OR
            (is_read = TRUE AND read_at IS NOT NULL)
        )
);

COMMENT ON TABLE user_notifications IS
    'Per-user notification delivery and read-state record. '
    'One row per (notification, user) pair. '
    'is_read = TRUE requires read_at to be set (constraint enforced).';

COMMENT ON COLUMN user_notifications.is_read IS
    'Updated to TRUE + read_at = NOW() when customer reads the notification.';

-- =============================================================================
-- END OF MIGRATION 009
-- =============================================================================
