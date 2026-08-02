"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { OAuthProviderButtons } from "@/components/auth/oauth-provider-buttons";
import { hasEnabledOAuthProviders } from "@/lib/auth/oauth-providers";
import { loginWithNext, ROUTES } from "@/lib/routes";

type SignUpFormProps = {
  className?: string;
  next?: string;
};

export function SignUpForm({ className, next }: SignUpFormProps) {
  const showOAuth = hasEnabledOAuthProviders();

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create a new account with Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showOAuth ? (
            <OAuthProviderButtons next={next} intent="sign-up" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign up is temporarily unavailable. Try again later.
            </p>
          )}
          <div className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link
              href={next ? loginWithNext(next) : ROUTES.login}
              className="underline underline-offset-4"
            >
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
