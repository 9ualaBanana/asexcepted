/** Shared Firebase web config for client SDK and service worker bootstrap. */
export type FirebasePushConfig = {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
};

export function readFirebasePushConfigFromEnv(): FirebasePushConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();

  if (!apiKey || !projectId || !messagingSenderId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, messagingSenderId, appId };
}

export function serializeFirebasePushConfigScript(config: FirebasePushConfig): string {
  return `self.FIREBASE_PUSH_CONFIG = ${JSON.stringify(config)};`;
}
