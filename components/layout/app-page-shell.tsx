import { Suspense, type ReactNode } from "react";
import { AuthButton } from "@/components/auth-button";
import { cn } from "@/lib/utils";

type AppPageShellProps = {
  children: ReactNode;
  headerExtra?: ReactNode;
  className?: string;
};

export function AppPageShell({
  children,
  headerExtra,
  className,
}: AppPageShellProps) {
  return (
    <main
      className={cn(
        "relative min-h-[100dvh] flex flex-col items-center overflow-x-hidden pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))]",
        className,
      )}
    >
      <div className="flex w-full flex-1 flex-col gap-10 items-center">
        <nav className="w-full flex shrink-0 justify-center border-b border-b-foreground/10 h-14">
          <div className="relative w-full max-w-5xl flex justify-center items-center p-3 px-5 text-sm">
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </nav>

        <section className="w-full max-w-5xl flex-1 px-5 pb-12 space-y-6">
          <header className="space-y-2 text-center">
            {headerExtra}
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
