"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ProfilePreferenceRowProps = {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function ProfilePreferenceRow({
  id,
  title,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: ProfilePreferenceRowProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 space-y-1">
          <Label htmlFor={id} className="cursor-pointer">
            {title}
          </Label>
          <p className="text-pretty text-xs leading-4 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center self-center">
          <Checkbox
            id={id}
            checked={checked}
            disabled={disabled}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            className="h-4 w-4"
          />
        </div>
      </div>
    </div>
  );
}

export function ProfilePreferenceRowSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/20 p-3",
        className,
      )}
      aria-busy
      aria-hidden
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 space-y-1">
          <div className="h-3.5 w-28 animate-pulse rounded bg-muted/45" />
          <div className="h-4 w-full max-w-[17rem] animate-pulse rounded bg-muted/30" />
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center self-center">
          <div className="h-4 w-4 animate-pulse rounded-sm bg-muted/45" />
        </div>
      </div>
    </div>
  );
}
