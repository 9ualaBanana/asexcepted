import Link from "next/link";

import { userCollection } from "@/lib/routes";
import { cn } from "@/lib/utils";

type DedicationBylineProps = {
  senderUserId: string;
  senderDisplayName: string;
  className?: string;
};

export function DedicationByline({
  senderUserId,
  senderDisplayName,
  className,
}: DedicationBylineProps) {
  const label = senderDisplayName.trim() || "Someone";
  return (
    <p
      className={cn(
        "text-center text-xs leading-snug text-white/55",
        className ?? "mt-2",
      )}
    >
      dedicated by{" "}
      <Link
        href={userCollection(senderUserId)}
        className="font-semibold text-amber-200/95 underline-offset-2 hover:underline"
      >
        {label}
      </Link>
    </p>
  );
}
