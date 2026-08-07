import { useCallback, useEffect, useState } from "react";
import { apiService } from "../services/api";
import type { NotificationCounts } from "../types/notifications";

const POLL_INTERVAL_MS = 60_000;

const EMPTY: NotificationCounts = { total: 0, newPosts: 0, replies: 0, likes: 0 };

/**
 * Polls the unread counts behind the notification badge.
 *
 * `enabled` is the signed-in check — the endpoint requires auth, so polling
 * while signed out would just produce 401s. Failures are swallowed on purpose:
 * a badge that can't refresh should go quiet, not surface an error over the
 * scene.
 */
export function useNotifications(enabled: boolean) {
  const [counts, setCounts] = useState<NotificationCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setCounts(await apiService.getNotifications());
    } catch {
      setCounts(EMPTY);
    }
  }, [enabled]);

  const markRead = useCallback(async () => {
    if (!enabled) return;
    // Clear locally first so the badge responds to the click immediately; the
    // next poll re-reads the server's view either way.
    setCounts(EMPTY);
    try {
      await apiService.markNotificationsRead();
    } catch {
      // Leave the badge cleared; the next poll restores it if the write failed.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCounts(EMPTY);
      return undefined;
    }

    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return { counts, refresh, markRead };
}
