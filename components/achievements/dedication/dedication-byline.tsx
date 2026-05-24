import Link from "next/link";

import { userCollection } from "@/lib/routes";

type DedicationBylineProps = {
  senderUserId: string;
  senderDisplayName: string;
};

export function DedicationByline({
  senderUserId,
  senderDisplayName,
}: DedicationBylineProps) {
  const label = senderDisplayName.trim() || "Someone";
  return (
    <p className="mt-2 text-center text-sm leading-snug text-white/55">
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
