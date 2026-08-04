"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OAuthProviderButtons } from "@/components/auth/oauth-provider-buttons";
import { hasEnabledOAuthProviders } from "@/lib/auth/oauth-providers";

type LoginFormProps = React.ComponentPropsWithoutRef<"div"> & {
  next?: string;
};

export function LoginForm({ className, next, ...props }: LoginFormProps) {
  const showOAuth = hasEnabledOAuthProviders();

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          {showOAuth ? (
            <OAuthProviderButtons next={next} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in is temporarily unavailable. Try again later.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
