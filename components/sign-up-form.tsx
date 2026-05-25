"use client";

import * as Sentry from "@sentry/nextjs";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { OAuthProviderButtons } from "@/components/auth/oauth-provider-buttons";
import { hasEnabledOAuthProviders } from "@/lib/auth/oauth-providers";
import { validatePassword } from "@/lib/auth/password-policy";
import { ROUTES } from "@/lib/routes";
import { useErrorToast } from "@/lib/toast";
import { completeOnboardingAfterSignup } from "@/lib/welcome/complete-onboarding";

type SignUpFormProps = {
  className?: string;
  next?: string;
};

export function SignUpForm({ className, next }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const showOAuth = hasEnabledOAuthProviders();

  useErrorToast(error, { id: "sign-up" });

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      Sentry.captureMessage("auth.signup.password_mismatch", "warning");
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (data.session && data.user) {
        Sentry.captureEvent({
          level: "info",
          message: "auth.signup.succeeded",
          tags: { area: "auth", flow: "signup" },
          user: { id: data.user.id },
          extra: { hasEmail: Boolean(data.user.email) },
        });
        void fetch("/api/push/events/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email ?? undefined,
          }),
        }).catch(() => undefined);
        const destination = await completeOnboardingAfterSignup(
          data.user.id,
          supabase,
        );
        router.push(destination);
        router.refresh();
        return;
      }
      if (data.user && !data.session) {
        setError(
          "Account created but no session was returned. Sign in with your email and password.",
        );
        return;
      }
      Sentry.captureMessage("auth.signup.no_user_or_session", "warning");
      setError("Sign up did not return a session. Try again or contact support.");
    } catch (error: unknown) {
      Sentry.captureException(error, {
        tags: { area: "auth", flow: "signup" },
      });
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          {showOAuth ? <OAuthProviderButtons next={next} /> : null}
          {showOAuth ? (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
          ) : null}
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repeat Password</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link
                href={
                  next
                    ? `${ROUTES.login}?next=${encodeURIComponent(next)}`
                    : ROUTES.login
                }
                className="underline underline-offset-4"
              >
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
