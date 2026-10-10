import Link from "next/link";

import { AtomicLabeledText } from "@/components/ui/atomic-labeled-text";
import {
  EncryptedText,
  EncryptedTextPlaceholder,
} from "@/components/ui/encrypted-text";
import { userCollection } from "@/lib/routes";
import { clampNickname, NICKNAME_MAX_LENGTH } from "@/lib/ui/dynamic-text";
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
  const resolvedName = clampNickname(senderDisplayName ?? "");
  const showPlaceholder = senderNameLoading || !resolvedName;

  return (
    <AtomicLabeledText
      prefix={prefix}
      className={cn(
        "text-xs leading-snug text-white/55",
        className ?? "mt-2",
      )}
    >
      {showPlaceholder ? (
        <EncryptedTextPlaceholder
          length={resolvedName.length || NICKNAME_MAX_LENGTH}
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
    </AtomicLabeledText>
  );
}
