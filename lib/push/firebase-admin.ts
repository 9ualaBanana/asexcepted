import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = requiredEnv("FCM_PROJECT_ID");
  const clientEmail = requiredEnv("FCM_CLIENT_EMAIL");
  const privateKey = requiredEnv("FCM_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

export function getFirebaseAdminMessaging() {
  return getMessaging(getAdminApp());
}
