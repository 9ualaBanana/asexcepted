import { redirect } from "next/navigation";
import { loginWithNext, ROUTES } from "@/lib/routes";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { next } = await searchParams;
  redirect(next?.trim() ? loginWithNext(next) : ROUTES.login);
}
