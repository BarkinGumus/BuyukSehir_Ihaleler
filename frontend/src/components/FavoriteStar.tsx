"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { addFavorite, getFavoriteIds, removeFavorite } from "@/lib/api";

// Sadece giriş yapmış kullanıcıya görünür (favorileme kişiye özel bir özellik).
// Tablo satırına tıklayınca detay paneli açıldığı için yıldıza tıklamanın
// satırın kendi onClick'ini tetiklememesi gerekiyor (stopPropagation).
export function FavoriteStar({ tenderId }: { tenderId: number }) {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds } = useQuery({
    queryKey: ["favorite-ids"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      return getFavoriteIds(token);
    },
    enabled: !!isSignedIn,
  });

  const isFavorite = favoriteIds?.includes(tenderId) ?? false;

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadı");
      if (isFavorite) {
        await removeFavorite(tenderId, token);
      } else {
        await addFavorite(tenderId, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  if (!isSignedIn) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleMutation.mutate();
      }}
      disabled={toggleMutation.isPending}
      aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      className="flex items-center justify-center rounded p-1 text-on-surface-variant transition-colors hover:text-[#F59E0B] disabled:opacity-50"
    >
      <Star
        size={16}
        fill={isFavorite ? "#F59E0B" : "none"}
        color={isFavorite ? "#F59E0B" : "currentColor"}
      />
    </button>
  );
}
