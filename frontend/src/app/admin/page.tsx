"use client";

import { useUser } from "@clerk/nextjs";
import { Suspense } from "react";
import { AdminTenderList } from "@/components/admin/AdminTenderList";
import { ScraperControls } from "@/components/admin/ScraperControls";
import { UserManagement } from "@/components/admin/UserManagement";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageContent />
    </Suspense>
  );
}

function AdminPageContent() {
  const { user, isLoaded } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar />
      <main className="flex h-full w-full flex-col md:ml-sidebar-width">
        <TopBar title="Admin" />
        <div className="hide-scrollbar flex flex-1 flex-col gap-8 overflow-y-auto overflow-x-hidden p-container-padding">
          {!isLoaded ? (
            <span className="text-body-default text-on-surface-variant">Yükleniyor...</span>
          ) : !isAdmin ? (
            <span className="text-body-default text-on-surface-variant">
              Bu sayfaya erişim yetkin yok.
            </span>
          ) : (
            <>
              <UserManagement />
              <ScraperControls />
              <AdminTenderList />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
