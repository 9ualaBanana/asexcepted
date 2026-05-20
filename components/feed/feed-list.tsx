"use client";

import { useState } from "react";
import Link from "next/link";
import { FeedItem } from "@/components/feed/feed-item";
import { Button } from "@/components/ui/button";
import type { FeedPage, FeedUnlockRow } from "@/lib/feed-db";
import { fetchFollowingUnlockFeed } from "@/lib/feed-db";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

type FeedListProps = {
  initialPage: FeedPage;
};

export function FeedList({ initialPage }: FeedListProps) {
  const [rows, setRows] = useState<FeedUnlockRow[]>(initialPage.rows);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-sm text-muted-foreground/80">
          No unlocks from people you follow yet. Follow someone on Social to see
          their achievements here.
        </p>
        <Button asChild variant="outline">
          <Link href={ROUTES.social}>Find people to follow</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <FeedItem key={`${row.achievement_id}-${row.created_at}`} row={row} />
      ))}
      {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}
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
