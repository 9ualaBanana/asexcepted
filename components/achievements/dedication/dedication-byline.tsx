import Link from "next/link";

import {
  EncryptedText,
  EncryptedTextPlaceholder,
} from "@/components/ui/encrypted-text";
import { userCollection } from "@/lib/routes";
import { cn } from "@/lib/utils";

type DedicationBylineProps = {
  accentClassName?: string;
  senderUserId: string;
  senderDisplayName?: string | null;
  senderNameLoading?: boolean;
  className?: string;
  prefix?: string;
};

export function DedicationByline({
  accentClassName,
  senderUserId,
  senderDisplayName,
  senderNameLoading = false,
  className,
  prefix = "dedicated by",
}: DedicationBylineProps) {
  const resolvedName = senderDisplayName?.trim() ?? "";
  const showPlaceholder = senderNameLoading || !resolvedName;

  return (
    <p
      className={cn(
        "text-center text-xs leading-snug text-white/55",
        className ?? "mt-2",
      )}
    >
      {prefix}{" "}
      {showPlaceholder ? (
        <EncryptedTextPlaceholder
          length={10}
          className={accentClassName ?? "text-amber-200/95"}
          encryptedClassName="text-amber-200/70"
        />
      ) : (
        <Link
          href={userCollection(senderUserId)}
          className={cn(
            "font-semibold underline-offset-2 hover:underline",
            accentClassName ?? "text-amber-200/95",
          )}
        >
          <EncryptedText
            key={resolvedName}
            text={resolvedName}
            className="inline"
            revealedClassName="text-inherit"
            encryptedClassName="text-amber-200/55"
          />
        </Link>
      )}
      {showPlaceholder ? (
        <span className="sr-only">Loading name</span>
      ) : (
        <span className="sr-only">{resolvedName}</span>
      )}
    </p>
  );
}
