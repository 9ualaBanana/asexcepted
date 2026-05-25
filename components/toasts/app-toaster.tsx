"use client";

import { Toaster } from "react-hot-toast";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      gutter={10}
      containerStyle={{ top: 18, left: 16, right: 16 }}
      toastOptions={{
        duration: 4000,
        style: {
          background: "rgba(20, 18, 28, 0.92)",
          color: "#f5f3ff",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "18px",
          boxShadow:
            "0 14px 40px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "12px 14px",
          maxWidth: "min(30rem, calc(100vw - 2rem))",
        },
      }}
    />
  );
}
