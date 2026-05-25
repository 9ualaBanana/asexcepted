"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

export { toast };

type ErrorToastOptions = {
  id?: string;
};

export function showErrorToast(message: string, options: ErrorToastOptions = {}) {
  return toast.error(message, {
    id: options.id ? `error:${options.id}` : undefined,
    duration: 5000,
  });
}

export function useErrorToast(
  error: string | null | undefined,
  options: ErrorToastOptions = {},
) {
  const id = options.id;
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null;
      return;
    }

    if (lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    showErrorToast(error, { id });
  }, [error, id]);
}
