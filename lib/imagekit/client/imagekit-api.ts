import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import { deleteJson, fetchFailureMessage, postJson } from "@/lib/client/fetch-json";

export type ImageKitUploadPurpose = "badge" | "avatar";

const imageKitUploadAuthSchema = z.object({
  token: z.string().min(1),
  expire: z.number(),
  signature: z.string().min(1),
  publicKey: z.string().min(1),
  folder: z.string().optional(),
  fileName: z.string().optional(),
});

export type ImageKitUploadAuth = z.infer<typeof imageKitUploadAuthSchema>;

export async function deleteImageKitFile(fileId: string): Promise<Result<void, string>> {
  const result = await deleteJson("/api/imagekit/file", { fileId });
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(undefined);
}

export async function getImageKitUploadAuth(
  options: { purpose?: ImageKitUploadPurpose } = {},
): Promise<Result<ImageKitUploadAuth, string>> {
  const result = await postJson(
    "/api/imagekit/auth",
    { purpose: options.purpose ?? "badge" },
    imageKitUploadAuthSchema,
    "Invalid upload authentication.",
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(result.value);
}
