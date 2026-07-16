"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Menu, Moon, RefreshCw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface TopBarProps {
  lastUpdated: string;
}

export function TopBar({ lastUpdated }: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // next-themes tarayıcıda hazır olana kadar tema bilinmiyor (sunucu/istemci
  // uyuşmazlığı olmasın diye) - ilk render'da ikon yerine boşluk gösteriyoruz.
  const [mounted, setMounted] = useState(false);
  // "Client'ta hazırız" bilgisi tanım gereği sadece bir effect'le öğrenilebilir
  // (mount sonrası çalışır) - burada "render sırasında ayarlama" deseni uygulanamaz.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-outline-variant/14 bg-surface px-container-padding">
      <div className="flex items-center gap-4">
        <button type="button" className="text-on-surface hover:text-primary md:hidden">
          <Menu size={20} />
        </button>
        <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
          İhaleler
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-caption-mono text-caption-mono text-on-surface-variant">
          son güncelleme {lastUpdated}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Yenile"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["tenders"] })}
            className="rounded p-1 text-on-surface opacity-80 transition-colors hover:bg-surface-variant"
          >
            <RefreshCw size={18} />
          </button>
          <button
            type="button"
            aria-label="Tema değiştir"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded p-1 text-on-surface opacity-80 transition-colors hover:bg-surface-variant"
          >
            {mounted && resolvedTheme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
