"use client";

import { Show, SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import {
  BookOpen,
  CalendarDays,
  Gavel,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const inactiveLinkClass =
  "flex h-8 cursor-not-allowed items-center gap-3 pl-4 text-on-surface-variant/60";
const activeLinkClass =
  "flex h-8 items-center gap-3 border-l-2 border-primary bg-surface-variant/30 pl-3 font-body-strong text-body-strong text-primary";
const linkClass =
  "flex h-8 items-center gap-3 pl-4 font-body-default text-body-default text-on-surface-variant hover:text-on-surface";

export function Sidebar() {
  const { user } = useUser();
  const pathname = usePathname();
  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <nav className="fixed left-0 top-0 z-10 hidden h-full w-sidebar-width flex-col border-r border-outline-variant/14 bg-surface py-container-padding md:flex">
      <div className="mb-8 px-4">
        <h1 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
          İhale Takip
        </h1>
        <span className="mt-1 block font-label-compact text-label-compact text-on-surface-variant">
          Internal Tool
        </span>
      </div>
      <ul className="flex w-full flex-col gap-1">
        <li>
          <Link href="/dashboard" className={pathname === "/dashboard" ? activeLinkClass : linkClass}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
        </li>
        <li>
          <Link href="/" className={pathname === "/" ? activeLinkClass : linkClass}>
            <Gavel size={16} />
            <span>İhaleler</span>
          </Link>
        </li>
        {/* Henüz sayfası olmayan gezinme öğeleri - şimdilik pasif (tıklanamaz) */}
        <li>
          <span className={inactiveLinkClass}>
            <CalendarDays size={16} />
            <span className="font-body-default text-body-default">Yaklaşan</span>
          </span>
        </li>
        <li>
          <span className={inactiveLinkClass}>
            <BookOpen size={16} />
            <span className="font-body-default text-body-default">Kaynaklar</span>
          </span>
        </li>
        {isAdmin && (
          <li>
            <Link href="/admin" className={pathname === "/admin" ? activeLinkClass : linkClass}>
              <ShieldCheck size={16} />
              <span>Admin</span>
            </Link>
          </li>
        )}
        <li>
          <span className={`mt-4 ${inactiveLinkClass}`}>
            <Settings size={16} />
            <span className="font-body-default text-body-default">Ayarlar</span>
          </span>
        </li>
      </ul>
      <Show when="signed-in">
        <div className="mt-auto flex flex-col gap-3 border-t border-outline-variant/14 px-4 pt-4">
          <div className="flex items-center gap-3">
            <UserButton />
            <span className="truncate font-caption-mono text-caption-mono text-on-surface-variant">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
          <SignOutButton redirectUrl="/sign-in">
            <button
              type="button"
              className="flex h-8 items-center gap-3 text-body-default text-on-surface-variant hover:text-red-400"
            >
              <LogOut size={16} />
              <span>Çıkış Yap</span>
            </button>
          </SignOutButton>
        </div>
      </Show>
    </nav>
  );
}
