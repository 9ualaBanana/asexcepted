"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search } from "lucide-react";

import { ProfileAvatarSlot } from "@/components/profile/profile-avatar-slot";
import { useInspaUiStateMachine } from "@/components/social/use-inspa-ui-state-machine";
import { createClient } from "@/lib/supabase/client";
import { profileListLabel } from "@/lib/profile-label";
import { userCollection } from "@/lib/routes";
import { useErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ProfileLabelRow = { user_id: string; display_name: string };
type ProfileAvatarRow = { user_id: string; avatar_url: string | null };
type ProfileRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

type FriendsPanelProps = {
  viewerId: string;
};

type CaretMode = "hidden" | "blink-once";
type CaretPosition = "normal" | "backspaced";

function ProfilesRailSkeleton() {
  return (
    <div className="overflow-hidden py-0.5" aria-hidden>
      <div className="flex gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[4.6rem] shrink-0 sm:w-[5.1rem]">
            <div className="mx-auto h-[4.15rem] w-[4.15rem] rounded-full border border-white/10 bg-white/[0.05] sm:h-[4.75rem] sm:w-[4.75rem]" />
            <div className="mx-auto mt-2 h-3 w-12 rounded-full bg-white/[0.07]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FriendsPanel({ viewerId }: FriendsPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const searchRootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevPromptTargetRef = useRef("u");
  const [searchPending, setSearchPending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [following, setFollowing] = useState<ProfileRow[]>([]);
  const [followers, setFollowers] = useState<ProfileRow[]>([]);
  const [recommended, setRecommended] = useState<ProfileRow[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [listsLoading, setListsLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [leftPrompt, setLeftPrompt] = useState("u");
  const [caretMode, setCaretMode] = useState<CaretMode>("hidden");
  const [caretPosition, setCaretPosition] = useState<CaretPosition>("normal");

  const zeroRelationshipMode =
    !listsLoading && following.length === 0 && followers.length === 0;
  const {
    activeView,
    canToggleView,
    collapseSearch,
    openSearch,
    promptTarget,
    query,
    searchOpen,
    setQuery,
    toggleView,
  } = useInspaUiStateMachine({ zeroRelationshipMode });

  useErrorToast(searchError, { id: "friends-search" });

  const trimmedQuery = query.trim();
  const showingSearchResults = trimmedQuery.length > 0;

  const hydrateProfiles = useCallback(
    async (ids: string[], preferredLabels?: ProfileLabelRow[]) => {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return [] as ProfileRow[];

      const [labelsResult, avatarResult] = await Promise.all([
        preferredLabels
          ? Promise.resolve({ data: preferredLabels, error: null })
          : supabase.rpc("public_user_display_names_for_ids", {
              p_user_ids: uniqueIds,
            }),
        supabase.from("profile").select("user_id, avatar_url").in("user_id", uniqueIds),
      ]);

      const labelRows = Array.isArray(labelsResult.data)
        ? (labelsResult.data as ProfileLabelRow[])
        : [];
      const avatarRows = Array.isArray(avatarResult.data)
        ? (avatarResult.data as ProfileAvatarRow[])
        : [];

      const labelMap = new Map(labelRows.map((row) => [row.user_id, row.display_name ?? ""]));
      const avatarMap = new Map(avatarRows.map((row) => [row.user_id, row.avatar_url ?? null]));

      return uniqueIds.map((userId) => ({
        user_id: userId,
        display_name: labelMap.get(userId) ?? "",
        avatar_url: avatarMap.get(userId) ?? null,
      }));
    },
    [supabase],
  );

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

    const [fProfiles, gProfiles] = await Promise.all([
      hydrateProfiles(followingIds),
      hydrateProfiles(followerIds),
    ]);

    setFollowing(fProfiles);
    setFollowers(gProfiles);
    setListsLoading(false);
  }, [hydrateProfiles, supabase, viewerId]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    let cancelled = false;

    if (!zeroRelationshipMode) {
      setRecommended([]);
      setRecommendedLoading(false);
      return;
    }

    setRecommendedLoading(true);
    setSearchError(null);

    void (async () => {
      const { data, error } = await supabase
        .from("profile")
        .select("user_id")
        .neq("user_id", viewerId)
        .limit(40);

      if (cancelled) return;

      if (error) {
        setRecommended([]);
        setRecommendedLoading(false);
        setSearchError(error.message);
        return;
      }

      const ids = Array.isArray(data)
        ? data.map((row) => row.user_id as string)
        : [];
      const shuffledIds = [...ids];

      for (let i = shuffledIds.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
      }

      const hydrated = await hydrateProfiles(shuffledIds.slice(0, 16));
      if (cancelled) return;

      setRecommended(hydrated);
      setRecommendedLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateProfiles, supabase, viewerId, zeroRelationshipMode]);

  useEffect(() => {
    if (!searchOpen) {
      setResults([]);
      setSearchError(null);
      setSearchPending(false);
      setSearching(false);
      return;
    }
    if (trimmedQuery.length < 1) {
      setResults([]);
      setSearchError(null);
      setSearchPending(false);
      setSearching(false);
      return;
    }
    setSearchPending(true);
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        setSearchError(null);
        const { data, error } = await supabase.rpc("search_profiles", {
          p_search: trimmedQuery,
          p_exclude_user_id: viewerId,
          p_max: 20,
        });
        if (cancelled) return;
        setSearching(false);
        setSearchPending(false);
        if (error) {
          setSearchError(error.message);
          setResults([]);
          return;
        }
        const rows = Array.isArray(data) ? (data as ProfileLabelRow[]) : [];
        const hydrated = await hydrateProfiles(
          rows.map((row) => row.user_id),
          rows,
        );
        if (cancelled) return;
        setResults(hydrated);
      })();
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [hydrateProfiles, searchOpen, supabase, trimmedQuery, viewerId]);

  useEffect(() => {
    if (prevPromptTargetRef.current === promptTarget) return;
    prevPromptTargetRef.current = promptTarget;

    const timeouts: number[] = [];
    const schedule = (delay: number, action: () => void) => {
      timeouts.push(window.setTimeout(action, delay));
    };

    setCaretMode("hidden");
    schedule(110, () => {
      setLeftPrompt("");
      setCaretPosition("backspaced");
    });
    schedule(140, () => setCaretMode("blink-once"));
    schedule(500, () => {
      setLeftPrompt(promptTarget);
      setCaretPosition("normal");
    });

    if (promptTarget === "?") {
      schedule(520, () => setCaretMode("hidden"));
    } else {
      schedule(540, () => setCaretMode("blink-once"));
      schedule(980, () => setCaretMode("hidden"));
    }

    return () => {
      for (const timeout of timeouts) {
        window.clearTimeout(timeout);
      }
    };
  }, [promptTarget]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const root = searchRootRef.current;
      if (root && !root.contains(event.target as Node)) {
        collapseSearch();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        collapseSearch();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [collapseSearch, searchOpen]);

  const visibleProfiles = showingSearchResults
    ? results
    : zeroRelationshipMode
      ? recommended
      : activeView === "following"
      ? following
      : followers;

  const showNoMatches =
    showingSearchResults &&
    !searchPending &&
    !searching &&
    !searchError &&
    results.length === 0;
  const showProfilesRailSkeleton =
    !showingSearchResults &&
    (listsLoading || (zeroRelationshipMode && recommendedLoading));

  const leftSelected = promptTarget === "u" && activeView === "followers";
  const rightSelected = activeView === "following";

  return (
    <div className="mx-auto w-full max-w-3xl text-left">
      <section className="h-[15rem] rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-3.5 shadow-[0_14px_38px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:h-[15.5rem] sm:p-4">
        <div className="flex h-full flex-col" ref={searchRootRef}>
          <div className="flex justify-center">
            <div
              className={cn(
                "relative flex h-12 items-center overflow-hidden border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.085),rgba(255,255,255,0.035))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(0,0,0,0.18)] transition-[width,border-radius] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                searchOpen ? "w-full rounded-[1.35rem]" : "w-12 rounded-full",
              )}
            >
              <button
                type="button"
                aria-label="find inspiration"
                onClick={openSearch}
                className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Search className="h-4 w-4" aria-hidden />
              </button>
              <input
                ref={searchInputRef}
                id="friend-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="find inspiration"
                autoComplete="off"
                aria-label="find inspiration"
                className={cn(
                  "h-full min-w-0 flex-1 bg-transparent pr-4 text-sm text-white placeholder:text-white/35 focus:outline-none",
                  searchOpen ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
                if (!canToggleView) return;
                toggleView();
            }}
            className={cn(
              "mx-auto mt-4 flex w-full items-center justify-center gap-2.5 text-center",
                canToggleView ? "cursor-pointer" : "cursor-default",
            )}
            aria-label="Toggle between following and followers"
              aria-disabled={!canToggleView}
          >
            <span
              className={cn(
                "relative inline-flex w-[1.35ch] items-center justify-center text-base font-semibold lowercase tracking-[0.06em] transition-colors sm:text-[1.02rem]",
                  promptTarget === "?"
                  ? "text-white/88"
                  : leftSelected
                    ? "text-white"
                    : "text-white/40",
              )}
            >
              <span className="inline-block w-full text-center">
                {leftPrompt || "\u00A0"}
              </span>
              {caretMode !== "hidden" ? (
                <span
                  className="pointer-events-none absolute left-[calc(100%+2px)] top-1/2 inline-block h-[1.02em] w-px -translate-y-1/2 rounded-none bg-white shadow-[0_0_6px_rgba(255,255,255,0.32)] social-type-caret-once"
                  style={{
                    transform:
                      caretPosition === "backspaced"
                        ? "translate(-1.2ch, -50%)"
                        : "translate(0, -50%)",
                  }}
                  aria-hidden
                />
              ) : null}
            </span>
            <span className="text-[0.97rem] font-semibold tracking-[0.2em] text-white/92 sm:text-[1.02rem]">
              inspire
            </span>
            <span
              className={cn(
                "inline-flex min-w-[1.2ch] items-center justify-center text-base font-semibold lowercase tracking-[0.06em] transition-colors sm:text-[1.02rem]",
                rightSelected ? "text-white" : "text-white/40",
              )}
            >
              u
            </span>
          </button>

          <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center">
            {searchError ? null : showProfilesRailSkeleton ? (
              <ProfilesRailSkeleton />
            ) : showNoMatches ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-sm text-muted-foreground">no matches</p>
              </div>
            ) : visibleProfiles.length > 0 ? (
              <div className="overflow-hidden">
                <ul className="no-scrollbar flex gap-3 overflow-x-auto py-0.5 sm:gap-4">
                  {visibleProfiles.map((row) => (
                    <li key={row.user_id} className="w-[4.6rem] shrink-0 sm:w-[5.1rem]">
                      <Link
                        href={userCollection(row.user_id)}
                        className="group block text-center no-tap-highlight"
                      >
                        <div className="mx-auto mb-2 h-[4.15rem] w-[4.15rem] rounded-full border border-white/10 bg-white/[0.035] p-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition group-hover:border-white/18 group-hover:bg-white/[0.06] sm:h-[4.75rem] sm:w-[4.75rem]">
                          <ProfileAvatarSlot
                            imageUrl={row.avatar_url}
                            layout="feed-overlay"
                            editable={false}
                            className="h-full w-full"
                          />
                        </div>
                        <p className="truncate px-0.5 text-[11px] font-medium leading-tight text-white/84 sm:text-xs">
                          {profileListLabel(row)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
