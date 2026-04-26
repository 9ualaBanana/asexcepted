import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";

function headerLabelFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const meta = user.user_metadata ?? {};
  const dn = meta.display_name ?? meta.full_name ?? meta.name;
  if (typeof dn === "string" && dn.trim()) return dn.trim();
  return user.email ?? "";
}

export async function AuthButton() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  return user ? (
    <div className="flex w-full justify-center pt-2">
      <AccountMenu label={headerLabelFromUser(user)} />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
