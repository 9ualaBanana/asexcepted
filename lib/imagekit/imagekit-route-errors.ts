const REACHABILITY_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

function collectErrorCodes(err: unknown, maxDepth: number): string[] {
  const codes: string[] = [];
  let cur: unknown = err;
  for (let d = 0; d < maxDepth && cur != null; d += 1) {
    if (typeof cur === "object" && "code" in cur) {
      const c = (cur as { code: unknown }).code;
      if (typeof c === "string") codes.push(c);
    }
    cur =
      typeof cur === "object" && cur !== null && "cause" in cur
        ? (cur as { cause: unknown }).cause
        : null;
  }
  return codes;
}

export function isImageKitReachabilityError(err: unknown): boolean {
  return collectErrorCodes(err, 6).some((c) => REACHABILITY_CODES.has(c));
}

export function logImageKitRouteError(context: string, err: unknown, extra?: Record<string, string>) {
  const codes = collectErrorCodes(err, 6);
  const message = err instanceof Error ? err.message : String(err);
  console.error(context, { ...extra, message, codes: codes.length ? codes.join(",") : undefined });
}
