"use client";

import { useEffect } from "react";

import { showErrorToast } from "@/lib/toast";

type ErrorToastOnceProps = {
  message: string;
  id?: string;
};

export function ErrorToastOnce({ message, id }: ErrorToastOnceProps) {
  useEffect(() => {
    showErrorToast(message, { id });
  }, [id, message]);

  return null;
}
