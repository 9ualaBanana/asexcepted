/** Client-side call to delete a file from ImageKit (server uses private key). */
export async function deleteImageKitFile(fileId: string) {
  const res = await fetch("/api/imagekit/file", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `ImageKit delete failed (${res.status})`);
  }
}

type ImageKitUploadAuth = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  folder?: string;
};

/** Client-side call to request short-lived ImageKit upload auth from server route. */
export async function getImageKitUploadAuth(): Promise<ImageKitUploadAuth> {
  const res = await fetch("/api/imagekit/auth", { method: "POST" });
  const data = (await res.json()) as {
    error?: string;
    token?: string;
    expire?: number;
    signature?: string;
    publicKey?: string;
    folder?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Could not start upload.");
  }
  if (!data.token || data.expire == null || !data.signature || !data.publicKey) {
    throw new Error("Invalid upload authentication.");
  }

  return {
    token: data.token,
    expire: data.expire,
    signature: data.signature,
    publicKey: data.publicKey,
    folder: data.folder,
  };
}
