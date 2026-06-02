import { err, ok, type Result } from "neverthrow";
import type { z } from "zod";

export type FetchJsonFailure = {
  message: string;
  status: number;
};

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

/** Low-level JSON fetch; validates HTTP status only. */
export async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<Result<unknown, FetchJsonFailure>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    return err({
      message: e instanceof Error ? e.message : "Network error.",
      status: 0,
    });
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
  return failure.message;
}
