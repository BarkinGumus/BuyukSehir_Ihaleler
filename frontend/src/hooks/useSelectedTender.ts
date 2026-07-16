"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

// Hangi ihalenin detay drawer'ında açık olduğu URL'de (?tender=123) tutulur -
// bu sayede bir ihalenin linki paylaşılabilir ve tarayıcı geri tuşu çalışır.
export function useSelectedTender() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedId = useMemo(() => {
    const raw = searchParams.get("tender");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const selectTender = useCallback(
    (id: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tender", String(id));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const closeTender = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tender");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return { selectedId, selectTender, closeTender };
}
