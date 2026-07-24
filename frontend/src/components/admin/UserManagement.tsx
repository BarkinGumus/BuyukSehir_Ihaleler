"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserRole, type UserRole } from "@/lib/api";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  viewer: "Görüntüleyici",
};

export function UserManagement() {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadı");
      return getUsers(token);
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadı");
      return updateUserRole(userId, role, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
        Kullanıcı Yönetimi
      </h3>
      <div className="flex flex-col overflow-hidden rounded border border-outline-variant/14 bg-surface">
        <div className="grid grid-cols-[2fr_1fr_auto] items-center gap-4 border-b border-outline-variant bg-surface-container-lowest px-4 py-2 font-label-compact text-[12px] uppercase text-on-surface-variant">
          <span>E-posta</span>
          <span>Rol</span>
          <span>İşlem</span>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-body-default text-on-surface-variant">
            Yükleniyor...
          </div>
        )}
        {users?.map((u) => {
          const isSelf = u.id === currentUser?.id;
          return (
            <div
              key={u.id}
              className="grid grid-cols-[2fr_1fr_auto] items-center gap-4 border-b border-outline-variant/60 px-4 py-3 last:border-b-0"
            >
              <span className="text-body-default text-on-surface">
                {u.email ?? "—"}
                {isSelf && (
                  <span className="ml-2 font-caption-mono text-caption-mono text-on-surface-variant">
                    (sen)
                  </span>
                )}
              </span>
              <span className="text-body-default text-on-surface-variant">{ROLE_LABELS[u.role]}</span>
              <select
                value={u.role}
                disabled={isSelf || roleMutation.isPending}
                onChange={(e) =>
                  roleMutation.mutate({ userId: u.id, role: e.target.value as UserRole })
                }
                className="h-input-height rounded border border-outline-variant/14 bg-surface px-2 text-body-default text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
