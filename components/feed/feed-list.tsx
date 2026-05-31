"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FeedItem } from "@/components/feed/feed-item";
import { Button } from "@/components/ui/button";
import type { FeedPage } from "@/lib/feed-db";
import { fetchFollowingUnlockFeed } from "@/lib/feed-db";
import { useFeedLiveUpdates } from "@/lib/live-updates";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { useErrorToast } from "@/lib/toast";

type FeedListProps = {
  initialPage: FeedPage;
  initialError?: string | null;
};

export function FeedList({ initialPage, initialError = null }: FeedListProps) {
  const pathname = usePathname();
  const feedVisible = pathname === ROUTES.inspa;
  const [rows, setRows] = useState(initialPage.rows);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [userId, setUserId] = useState<string | null>(null);

  useErrorToast(error, { id: "feed" });

  const refreshFeed = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setRefreshing(true);
    setError(null);
    const supabase = createClient();
    const pageResult = await fetchFollowingUnlockFeed(supabase, { limit: 20 });
    if (pageResult.isErr()) {
      setError(pageResult.error);
    } else {
      setRows(pageResult.value.rows);
      setCursor(pageResult.value.nextCursor);
    }
    if (!silent) setRefreshing(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  useEffect(() => {
    if (!feedVisible) return;
    void refreshFeed({ silent: true });
  }, [feedVisible, pathname, refreshFeed]);

  useEffect(() => {
    if (!feedVisible) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshFeed({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [feedVisible, refreshFeed]);

  useFeedLiveUpdates({
    enabled: feedVisible,
    userId,
    onInvalidate: () => {
      void refreshFeed({ silent: true });
    },
  });

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const pageResult = await fetchFollowingUnlockFeed(supabase, {
      limit: 20,
      cursor,
    });

    if (pageResult.isErr()) {
      setError(pageResult.error);
      setLoading(false);
      return;
    }

    const { rows: nextRows, nextCursor: next } = pageResult.value;
    setRows((prev) => [...prev, ...nextRows]);
    setCursor(next);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-3 sm:space-y-4">
      {refreshing && rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Loading feed…</p>
      ) : null}
      {rows.map((row) => (
        <FeedItem
          key={`${row.event_type}-${row.event_id}`}
          row={row}
        />
      ))}
      {cursor ? (
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
