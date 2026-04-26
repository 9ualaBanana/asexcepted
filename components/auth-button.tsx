import Link from "next/link";
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
    <div className="flex flex-col justify-center items-center w-full pt-2">
      <Link
        href="/profile"
        className="text-xs font-medium text-muted-foreground/90 tracking-tight hover:text-foreground hover:underline underline-offset-2"
      >
        {headerLabelFromUser(user)}
      </Link>
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
