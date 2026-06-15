"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const rootPaths = new Set(["/", "/dashboard", "/admin"]);

export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const pathname = usePathname();
  const router = useRouter();

  if (rootPaths.has(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-pitch shadow-sm sm:hidden"
      aria-label="Zurück"
      title="Zurück"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
