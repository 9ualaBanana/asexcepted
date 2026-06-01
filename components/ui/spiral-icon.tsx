import { forwardRef, type SVGProps } from "react";

import { cn } from "@/lib/utils";

/** Smooth outward spiral for 24×24 icon grid (lucide-style stroke). */
function buildSpiralPath(): string {
  const cx = 12;
  const cy = 12;
  const turns = 2.35;
  const steps = 80;
  const startRadius = 1.1;
  const maxRadius = 9.4;
  const startAngle = -Math.PI / 2;

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + t * turns * Math.PI * 2;
    const radius = startRadius + t * (maxRadius - startRadius);
    points.push([
      Math.round((cx + radius * Math.cos(angle)) * 100) / 100,
      Math.round((cy + radius * Math.sin(angle)) * 100) / 100,
    ]);
  }

  const [firstX, firstY] = points[0]!;
  let d = `M ${firstX} ${firstY}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!;
    d += ` L ${x} ${y}`;
  }
  return d;
}

const SPIRAL_PATH = buildSpiralPath();

/** Lucide-style spiral (not in lucide-react@0.511). */
export const SpiralIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function SpiralIcon({ className, ...props }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("lucide lucide-spiral", className)}
        aria-hidden
        {...props}
      >
        <path d={SPIRAL_PATH} />
      </svg>
    );
  },
);

SpiralIcon.displayName = "SpiralIcon";
