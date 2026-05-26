"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { achievementShareInvitePath, loginWithNext, ROUTES } from "@/lib/routes";
import { postClaimAchievementShareInvite } from "@/lib/share-invites/share-invite-api";
import { createClient } from "@/lib/supabase/client";
import { showErrorToast } from "@/lib/toast";

type ShareInviteClaimPanelProps = {
  token: string;
  senderUserId: string;
  inviteStatus: string;
};

type AuthState =
  | { ready: false; userId: null }
  | { ready: true; userId: string | null };

export function ShareInviteClaimPanel({
  token,
  senderUserId,
  inviteStatus,
}: ShareInviteClaimPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>({ ready: false, userId: null });
  const [busy, setBusy] = useState(false);
  const autoClaimAttemptedRef = useRef(false);

  const claimRequested = searchParams.get("claim") === "1";
  const autoAccept = searchParams.get("auto") === "1";

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthState({ ready: true, userId: user?.id ?? null });
    });
  }, []);

  const runClaim = useCallback(
    async (claimAutoAccept: boolean) => {
      setBusy(true);
      const result = await postClaimAchievementShareInvite({
        token,
        autoAccept: claimAutoAccept,
      });
      if (result.isErr()) {
        showErrorToast(result.error, { id: "share-invite-claim" });
        router.replace(achievementShareInvitePath(token));
        setBusy(false);
        return;
      }

      router.replace(result.value.redirectPath);
    },
    [router, token],
  );

  useEffect(() => {
    if (!authState.ready || !authState.userId || !claimRequested) return;
    if (inviteStatus !== "pending") return;
    if (autoClaimAttemptedRef.current) return;
    autoClaimAttemptedRef.current = true;
    void runClaim(autoAccept);
  }, [authState, autoAccept, claimRequested, inviteStatus, runClaim]);

  if (inviteStatus !== "pending") {
    return null;
  }

  if (!authState.ready) {
    return (
      <div className="pt-2 text-center text-sm text-white/55">
        Checking claim options...
      </div>
    );
  }

  if (!authState.userId) {
    const signUpNext = `${pathname}?claim=1&auto=1`;
    const loginNext = `${pathname}?claim=1`;
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 pt-2">
        <Button asChild size="lg" className="rounded-full">
          <Link href={`${ROUTES.signUp}?next=${encodeURIComponent(signUpNext)}`}>
            Create account to claim
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="rounded-full">
          <Link href={loginWithNext(loginNext)}>Sign in to claim</Link>
        </Button>
      </div>
    );
  }

  if (authState.userId === senderUserId) {
    return (
      <p className="pt-2 text-center text-sm text-white/55">
        This invite is already yours to share.
      </p>
    );
  }

  if (busy) {
    return (
      <p className="pt-2 text-center text-sm text-white/55">
        Claiming this achievement...
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 pt-2">
      <Button
        type="button"
        size="lg"
        className="rounded-full"
        onClick={() => void runClaim(false)}
      >
        Claim this achievement
      </Button>
      <p className="text-center text-xs text-white/45">
        Existing accounts still confirm the claim inside the app.
      </p>
    </div>
  );
}

