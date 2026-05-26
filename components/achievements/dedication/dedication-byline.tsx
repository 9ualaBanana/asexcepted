import Link from "next/link";

import { userCollection } from "@/lib/routes";
import { cn } from "@/lib/utils";

type DedicationBylineProps = {
  accentClassName?: string;
  senderUserId: string;
  senderDisplayName: string;
  className?: string;
  prefix?: string;
};

export function DedicationByline({
  accentClassName,
  senderUserId,
  senderDisplayName,
  className,
  prefix = "dedicated by",
}: DedicationBylineProps) {
  const label = senderDisplayName.trim() || "Someone";
  return (
    <p
      className={cn(
        "text-center text-xs leading-snug text-white/55",
        className ?? "mt-2",
      )}
    >
      {prefix}{" "}
      <Link
        href={userCollection(senderUserId)}
        className={cn(
          "font-semibold underline-offset-2 hover:underline",
          accentClassName ?? "text-amber-200/95",
        )}
      >
        {label}
      </Link>
    </p>
  );
}
