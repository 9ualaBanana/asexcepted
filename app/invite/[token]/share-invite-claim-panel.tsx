"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { WelcomeCollectButton } from "@/components/welcome/welcome-collect-button";
import {
  achievementShareInvitePath,
  ROUTES,
  userCollection,
} from "@/lib/routes";
import { postClaimAchievementShareInvite } from "@/lib/share-invites/share-invite-api";
import { createClient } from "@/lib/supabase/client";
import { showErrorToast } from "@/lib/toast";

type ShareInviteClaimPanelProps = {
  token: string;
  senderUserId: string;
  inviteStatus: string;
  pageKind: "invite" | "showcase";
  ownerDetailPath: string | null;
};

type AuthState =
  | { ready: false; userId: null }
  | { ready: true; userId: string | null };

export function ShareInviteClaimPanel({
  token,
  senderUserId,
  inviteStatus,
  pageKind,
  ownerDetailPath,
}: ShareInviteClaimPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>({ ready: false, userId: null });
  const [busy, setBusy] = useState(false);
  const autoClaimAttemptedRef = useRef(false);
  const senderFallbackPath = ownerDetailPath ?? userCollection(senderUserId);

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
      if (busy) return;
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
    [busy, router, token],
  );

  useEffect(() => {
    if (pageKind !== "invite") return;
    if (!authState.ready || !authState.userId || !claimRequested) return;
    if (inviteStatus !== "pending") return;
    if (autoClaimAttemptedRef.current) return;
    autoClaimAttemptedRef.current = true;
    void runClaim(autoAccept);
  }, [authState, autoAccept, claimRequested, inviteStatus, pageKind, runClaim]);

  if (inviteStatus !== "pending") {
    return null;
  }

  if (!authState.ready) {
    return (
      <div className="pt-2 text-center text-sm text-white/55">
        Checking collection access...
      </div>
    );
  }

  if (!authState.userId) {
    const signUpNext =
      pageKind === "showcase" ? senderFallbackPath : `${pathname}?claim=1&auto=1`;
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 pt-2">
        <WelcomeCollectButton
          href={`${ROUTES.signUp}?next=${encodeURIComponent(signUpNext)}`}
        />
      </div>
    );
  }

  if (pageKind === "showcase") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 pt-2">
        <WelcomeCollectButton href={senderFallbackPath} />
      </div>
    );
  }

  if (authState.userId === senderUserId) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 pt-2">
        <WelcomeCollectButton href={senderFallbackPath} />
      </div>
    );
  }

  if (busy) {
    return (
      <p className="pt-2 text-center text-sm text-white/55">
        Opening collection...
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 pt-2">
      <WelcomeCollectButton onClick={() => void runClaim(false)} />
    </div>
  );
}

