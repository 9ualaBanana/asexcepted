"use client";

import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  onBeforeLogout?: () => boolean | Promise<boolean>;
};

export function LogoutButton({ onBeforeLogout }: LogoutButtonProps = {}) {
  const router = useRouter();

  const logout = async () => {
    if (onBeforeLogout) {
      const allowed = await onBeforeLogout();
      if (!allowed) return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(ROUTES.home);
  };

  return (
    <Button
      onClick={() => void logout()}
      variant="link"
      size="sm"
      className="text-xs font-medium tracking-tight text-muted-foreground/50 hover:text-foreground"
    >
      logout
    </Button>
  );
}
