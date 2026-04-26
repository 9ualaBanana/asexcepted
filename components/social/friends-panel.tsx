"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { profileListLabel } from "@/lib/profile-label";
import { userAchievementsPath } from "@/lib/user-achievements-path";

type ProfileRow = { user_id: string; display_name: string };

type FriendsPanelProps = {
  viewerId: string;
};

export function FriendsPanel({ viewerId }: FriendsPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [following, setFollowing] = useState<ProfileRow[]>([]);
  const [followers, setFollowers] = useState<ProfileRow[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setListsLoading(true);
    const { data: outRows, error: outErr } = await supabase
      .from("profile_follow")
      .select("following_id")
      .eq("follower_id", viewerId);
    const { data: inRows, error: inErr } = await supabase
      .from("profile_follow")
      .select("follower_id")
      .eq("following_id", viewerId);

    const followingIds =
      !outErr && Array.isArray(outRows) ? outRows.map((r) => r.following_id as string) : [];
    const followerIds =
      !inErr && Array.isArray(inRows) ? inRows.map((r) => r.follower_id as string) : [];

    const uniq = (ids: string[]) => [...new Set(ids)];

    async function profilesFor(ids: string[]) {
      const u = uniq(ids);
      if (u.length === 0) return [] as ProfileRow[];
      const { data, error } = await supabase.rpc("public_user_display_names_for_ids", {
        p_user_ids: u,
      });
      if (error || !Array.isArray(data)) return [];
      return data as ProfileRow[];
    }

    const [fProfiles, gProfiles] = await Promise.all([
      profilesFor(followingIds),
      profilesFor(followerIds),
    ]);

    const byId = (rows: ProfileRow[]) => {
      const m = new Map(rows.map((r) => [r.user_id, r]));
      return (id: string) => m.get(id) ?? { user_id: id, display_name: "" };
    };
    const fMap = byId(fProfiles);
    const gMap = byId(gProfiles);

    setFollowing(followingIds.map((id) => fMap(id)));
    setFollowers(followerIds.map((id) => gMap(id)));
    setListsLoading(false);
  }, [supabase, viewerId]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setSearchError(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        setSearchError(null);
        const { data, error } = await supabase.rpc("search_profiles", {
          p_search: q,
          p_exclude_user_id: viewerId,
          p_max: 20,
        });
        setSearching(false);
        if (error) {
          setSearchError(error.message);
          setResults([]);
          return;
        }
        const rows = Array.isArray(data) ? (data as ProfileRow[]) : [];
        setResults(rows);
      })();
    }, 320);
    return () => window.clearTimeout(t);
  }, [query, supabase, viewerId]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-10 text-left">
      <section className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="friend-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder=""
            autoComplete="off"
            aria-label="Search people"
            className="pl-9"
          />
        </div>
        {searchError ? (
          <p className="text-sm text-red-500">{searchError}</p>
        ) : null}
        {searching ? (
          <p className="text-sm text-muted-foreground">Searching…</p>
        ) : null}
        {results.length > 0 ? (
          <ul className="rounded-xl border border-border/80 divide-y divide-border/60 overflow-hidden">
            {results.map((r) => (
              <li key={r.user_id}>
                <Link
                  href={userAchievementsPath(r.user_id)}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/50"
                >
                  <span className="font-medium truncate">
                    {profileListLabel(r)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground font-mono">
                    Achievements
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : query.trim().length >= 1 && !searching && !searchError ? (
          <p className="text-sm text-muted-foreground">No matches.</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Following
        </h2>
        {listsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : following.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You are not following anyone yet. Follow people from their achievements page.
          </p>
        ) : (
          <ul className="rounded-xl border border-border/80 divide-y divide-border/60 overflow-hidden">
            {following.map((r) => (
              <li key={r.user_id}>
                <Link
                  href={userAchievementsPath(r.user_id)}
                  className="block px-3 py-2.5 text-sm font-medium hover:bg-muted/50 truncate"
                >
                  {profileListLabel(r)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Followers
        </h2>
        {listsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : followers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No followers yet.</p>
        ) : (
          <ul className="rounded-xl border border-border/80 divide-y divide-border/60 overflow-hidden">
            {followers.map((r) => (
              <li key={r.user_id}>
                <Link
                  href={userAchievementsPath(r.user_id)}
                  className="block px-3 py-2.5 text-sm font-medium hover:bg-muted/50 truncate"
                >
                  {profileListLabel(r)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
