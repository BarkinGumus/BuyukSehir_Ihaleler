import { BookOpen, CalendarDays, Gavel, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";

const inactiveLinkClass =
  "flex h-8 cursor-not-allowed items-center gap-3 pl-4 text-on-surface-variant/60";

export function Sidebar() {
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
        {/* Henüz sayfası olmayan gezinme öğeleri - şimdilik pasif (tıklanamaz) */}
        <li>
          <span className={inactiveLinkClass}>
            <LayoutDashboard size={16} />
            <span className="font-body-default text-body-default">Dashboard</span>
          </span>
        </li>
        <li>
          <Link
            href="/"
            className="flex h-8 items-center gap-3 border-l-2 border-primary bg-surface-variant/30 pl-3 font-body-strong text-body-strong text-primary"
          >
            <Gavel size={16} />
            <span>İhaleler</span>
          </Link>
        </li>
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
        <li>
          <span className={`mt-4 ${inactiveLinkClass}`}>
            <Settings size={16} />
            <span className="font-body-default text-body-default">Ayarlar</span>
          </span>
        </li>
      </ul>
    </nav>
  );
}
