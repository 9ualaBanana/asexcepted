import { err, ok, type Result } from "neverthrow";
import type { z } from "zod";

export type FetchJsonFailure = {
  message: string;
  status: number;
};

const NETWORK_RETRY_ATTEMPTS = 3;
const NETWORK_RETRY_BASE_MS = 220;

function readErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string" &&
    (data as { error: string }).error.trim().length > 0
  ) {
    return (data as { error: string }).error.trim();
  }
  return fallback;
}

export function isTransientNetworkFailureMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("load failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed") ||
    normalized.includes("fetch failed") ||
    normalized.includes("the network connection was lost")
  );
}

export function normalizeNetworkFailureMessage(message: string): string {
  if (isTransientNetworkFailureMessage(message)) {
    return "Network error. Check your connection and try again.";
  }
  return message;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryOnTransientNetworkError<T>(
  run: () => Promise<Result<T, string>>,
  attempts = NETWORK_RETRY_ATTEMPTS,
): Promise<Result<T, string>> {
  let last: Result<T, string> = err("Network error.");
  for (let attempt = 0; attempt < attempts; attempt++) {
    last = await run();
    if (last.isOk()) return last;
    const canRetry =
      isTransientNetworkFailureMessage(last.error) && attempt < attempts - 1;
    if (!canRetry) {
      return err(normalizeNetworkFailureMessage(last.error));
    }
    await sleep(NETWORK_RETRY_BASE_MS * (attempt + 1));
  }
  return err(normalizeNetworkFailureMessage(last.error));
}

/** Low-level JSON fetch; validates HTTP status only. */
export async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<Result<unknown, FetchJsonFailure>> {
  let lastNetworkFailure: FetchJsonFailure | null = null;

  for (let attempt = 0; attempt < NETWORK_RETRY_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Network error.";
      lastNetworkFailure = {
        message: normalizeNetworkFailureMessage(raw),
        status: 0,
      };
      if (attempt < NETWORK_RETRY_ATTEMPTS - 1) {
        await sleep(NETWORK_RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      return err(lastNetworkFailure);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (!response.ok) {
        return err({
          message: `Request failed (${response.status}).`,
          status: response.status,
        });
      }
      return err({
        message: "Invalid response from server.",
        status: response.status,
      });
    }

    if (!response.ok) {
      return err({
        message: readErrorMessage(data, `Request failed (${response.status}).`),
        status: response.status,
      });
    }

    return ok(data);
  }

  return err(
    lastNetworkFailure ?? {
      message: "Network error. Check your connection and try again.",
      status: 0,
    },
  );
}

export async function fetchJsonParsed<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
  invalidMessage = "Invalid response from server.",
): Promise<Result<T, FetchJsonFailure>> {
  const result = await fetchJson(url, init);
  if (result.isErr()) {
    return err(result.error);
  }

  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    return err({ message: invalidMessage, status: result.isOk() ? 200 : 0 });
  }
  return ok(parsed.data);
}

export async function postJson<T>(
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
  invalidMessage?: string,
): Promise<Result<T, FetchJsonFailure>> {
  return fetchJsonParsed(
    url,
    schema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    invalidMessage,
  );
}

export async function deleteJson(
  url: string,
  body?: unknown,
): Promise<Result<void, FetchJsonFailure>> {
  const result = await fetchJson(url, {
    method: "DELETE",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(undefined);
}

/** Maps {@link FetchJsonFailure} to a plain message for UI / toasts. */
export function fetchFailureMessage(failure: FetchJsonFailure): string {
  return normalizeNetworkFailureMessage(failure.message);
}
