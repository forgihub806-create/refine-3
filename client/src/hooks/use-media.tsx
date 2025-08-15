import { useQuery } from "@tanstack/react-query";
import { getMediaItems, getMediaItem } from "@/lib/api";
import type { MediaItemWithTagsAndCategories, MediaSearchParams } from "@shared/schema";

export function useMediaItems(params: MediaSearchParams) {
  return useQuery<{ items: MediaItemWithTagsAndCategories[]; total: number }>({
    queryKey: ['mediaItems', params],
    queryFn: () => getMediaItems(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMediaItem(id: string | null) {
  return useQuery<MediaItemWithTagsAndCategories>({
    queryKey: ['mediaItem', id],
    queryFn: () => getMediaItem(id!),
    enabled: !!id,
  });
}
