import ImageKit from "imagekit";

let client: ImageKit | null = null;

function readImageKitEnv() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim() ?? "";
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim() ?? "";
  return { publicKey, privateKey, urlEndpoint };
}

export function isImageKitServerConfigured(): boolean {
  const { publicKey, privateKey, urlEndpoint } = readImageKitEnv();
  return Boolean(publicKey && privateKey && urlEndpoint);
}

/** Lazy singleton ImageKit SDK client (auth + delete routes). */
export function getImageKitServerClient(): ImageKit {
  if (client) return client;
  const { publicKey, privateKey, urlEndpoint } = readImageKitEnv();
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error("ImageKit is not configured on the server.");
  }
  client = new ImageKit({ publicKey, privateKey, urlEndpoint });
  return client;
}
