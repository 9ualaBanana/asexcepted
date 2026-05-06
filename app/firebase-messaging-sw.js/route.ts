import { NextResponse } from "next/server";

function json(value: string | undefined): string {
  return JSON.stringify(value ?? "");
}

export async function GET() {
  const source = `
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: ${json(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)},
  authDomain: ${json(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)},
  projectId: ${json(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)},
  messagingSenderId: ${json(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)},
  appId: ${json(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)},
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "AsExcepted";
  const body = payload?.notification?.body || "";
  const icon = payload?.notification?.icon || "/icons/icon-192.png";
  self.registration.showNotification(title, { body, icon });
});
`.trim();

  return new NextResponse(source, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
