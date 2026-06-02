import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import { fetchFailureMessage, fetchJsonParsed, postJson } from "@/lib/client/fetch-json";

const pushRegisterSuccessSchema = z.object({
  ok: z.literal(true),
});

const pushStatusSchema = z.object({
  registeredForDevice: z.boolean().optional(),
});

const pushUnregisterSuccessSchema = z.object({
  ok: z.boolean().optional(),
});

export async function postPushRegister(args: {
  token: string;
  platform: string;
}): Promise<Result<void, string>> {
  const result = await postJson(
    "/api/push/register",
    args,
    pushRegisterSuccessSchema,
    "Push registration failed.",
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(undefined);
}

export async function fetchPushDeviceRegistered(
  token: string,
): Promise<Result<boolean, string>> {
  const params = new URLSearchParams({ token });
  const result = await fetchJsonParsed(
    `/api/push/status?${params.toString()}`,
    pushStatusSchema,
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(Boolean(result.value.registeredForDevice));
}

export async function postPushUnregister(token: string): Promise<Result<void, string>> {
  const result = await postJson(
    "/api/push/unregister",
    { token },
    pushUnregisterSuccessSchema,
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  if (!result.value.ok) {
    return err("Push unregister failed.");
  }
  return ok(undefined);
}
