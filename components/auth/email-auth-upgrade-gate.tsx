"use client";

import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { isEmailOnlyAuthUser } from "@/lib/auth/is-email-only-auth-user";
import { useBodyScrollLock } from "@/lib/dom/body-scroll-lock";
import { isAuthPath, loginWithNext, ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function EmailAuthUpgradeGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthPath(pathname)) {
      setOpen(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    async function refreshGate() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setOpen(Boolean(user && isEmailOnlyAuthUser(user)));
    }

    void refreshGate();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshGate();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname]);

  useBodyScrollLock(open);

  async function handleContinue() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      const next = pathname && !isAuthPath(pathname) ? pathname : undefined;
      router.push(next ? loginWithNext(next) : ROUTES.login);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-auth-upgrade-title"
      className="fixed inset-0 z-[250] flex min-h-0 w-full min-w-0 flex-col overscroll-contain min-h-screen min-h-[100dvh]"
    >
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-black/[65.5%] backdrop-blur-sm"
      />
      <div className="pointer-events-none relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div
          className={cn(
            "pointer-events-auto relative mx-auto my-auto flex w-full max-w-lg max-h-[min(92dvh,56rem)] min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-3xl border border-white/12 bg-card p-4 pb-6 text-card-foreground sm:p-6 sm:pb-6",
            "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_-1px_0_0_rgba(0,0,0,0.12)]",
          )}
        >
          <h2
            id="email-auth-upgrade-title"
            className="text-center text-xl font-semibold tracking-tight"
          >
            Quick sign-in change
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              ! switched the app to Google sign-in — it&apos;s easier and modernly reasonable.
              Password login is no more from now on.
            </p>
            <p>
              Please sign in again with Google using the same email you used
              before - it'll take a minute of ur time. Your collection and everything else will be untouched.
            </p>
            <p>
              If Google somehow drops you into a brand-new empty account (wrong
              Google email, mismatch, weird edge case), hmu to lmk
              and I&apos;ll sort it out for u.
            </p>
          </div>
          <Button
            type="button"
            className="mt-6 w-full"
            disabled={busy}
            onClick={() => void handleContinue()}
          >
            {busy ? "Redirecting…" : "ok got it"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
