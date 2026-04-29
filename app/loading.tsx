import Image from "next/image";

export default function Loading() {
  return (
    <main className="min-h-screen w-full bg-[#14121c] text-[#f5f3ff]">
      <div className="mx-auto flex min-h-screen w-full items-center justify-center px-6">
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="loading-icon-pulse absolute h-[15.5rem] w-[15.5rem] rounded-full bg-white/10 blur-3xl"
          />
          <Image
            src="/icons/icon-512.png"
            alt="AsExcepted"
            width={256}
            height={256}
            priority
            className="loading-icon-pulse relative h-48 w-48 select-none rounded-[22%] sm:h-56 sm:w-56"
          />
        </div>
      </div>
    </main>
  );
}
