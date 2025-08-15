import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, RefreshCw, Download, Play, Trash2, Plus, Folder, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "./video-player";
import { useMediaItem } from "@/hooks/use-media";
import { refreshMetadata, deleteMediaItem as deleteMediaItemApi, checkAndFetchMetadata, getDownloadUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { MediaItemWithTagsAndCategories, ApiOption } from "@shared/schema";
import { TagCategoryManager } from "./tag-category-manager";
import { MediaManagement } from "./media-management";

interface DetailModalProps {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
}

const getTagColor = (color: string | null) => {
  const colors = {
    primary: "bg-primary/20 text-primary border-primary/30",
    secondary: "bg-secondary/20 text-secondary border-secondary/30",
    emerald: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    rose: "bg-rose-500/20 text-rose-500 border-rose-500/30",
    orange: "bg-orange-500/20 text-orange-500 border-orange-500/30",
    red: "bg-red-500/20 text-red-500 border-red-500/30",
    purple: "bg-purple-500/20 text-purple-500 border-purple-500/30",
    blue: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    cyan: "bg-cyan-500/20 text-cyan-500 border-cyan-500/30",
    gray: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  };
  return colors[color as keyof typeof colors] || colors.primary;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return "Unknown size";
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "Unknown duration";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export function DetailModal({ mediaId, isOpen, onClose }: DetailModalProps) {
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mediaItem, isLoading: mediaLoading, error: mediaError } = useMediaItem(mediaId);

  // Check for missing metadata when detail modal opens
  useEffect(() => {
    if (mediaItem && (!mediaItem.title || mediaItem.title === "Processing..." || !mediaItem.thumbnail || !mediaItem.scrapedAt)) {
      checkAndFetchMetadata(mediaId)
        .then(() => {
          // Refresh the query to get updated data
          queryClient.invalidateQueries({ queryKey: ['mediaItem', mediaId] });
        })
        .catch(error => {
          console.error("Failed to fetch metadata:", error);
          toast({
            title: "Metadata Fetch Failed",
            description: "Could not fetch metadata automatically.",
            variant: "destructive",
          });
        });
    }
  }, [mediaItem, mediaId, queryClient, toast]);


  const { data: apiOptions = [] } = useQuery<ApiOption[]>({
    queryKey: ["/api/api-options"],
  });

  const refreshMetadataMutation = useMutation({
    mutationFn: () => refreshMetadata(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItem', mediaId] });
      toast({
        title: "Metadata Refreshed",
        description: "Successfully updated metadata from external sources.",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh metadata",
        variant: "destructive",
      });
    },
  });

  const getDownloadUrlMutation = useMutation({
    mutationFn: async () => {
      return getDownloadUrl(mediaId, selectedApiId || undefined);
    },
    onSuccess: (data) => {
      if (data.downloadUrl) {
        // Open download URL in new tab
        window.open(data.downloadUrl, '_blank');
        toast({
          title: "Download Started",
          description: `Using ${data.proxy || 'cached'} source`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to get download URL",
        variant: "destructive",
      });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: () => deleteMediaItemApi(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
      toast({
        title: "Media Deleted",
        description: "Successfully deleted the media item.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete media item",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    refreshMetadataMutation.mutate();
  };

  const handleDownload = () => {
    getDownloadUrlMutation.mutate();
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this media item? This action cannot be undone.")) {
      deleteMediaMutation.mutate();
    }
  };

  const handleApiSelect = (apiId: string) => {
    setSelectedApiId(apiId);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  if (mediaLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-surface-light border-slate-600">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (mediaError) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-surface-light border-slate-600">
          <div className="flex flex-col items-center justify-center h-96 text-destructive">
            <p>Error loading media: {mediaError.message}</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If mediaItem is still null or undefined after loading, but no error, it might mean the item doesn't exist.
  // However, the original code proceeds assuming mediaItem is available. We'll stick to that behavior.
  // If mediaItem is truly null/undefined here, the subsequent rendering will likely cause errors.
  // A more robust solution might involve handling this case explicitly if mediaId is valid but no data is returned.
  if (!mediaItem) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-surface-light border-slate-600">
          <div className="flex items-center justify-center h-96">
            <p className="text-slate-400">Media item not found.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isFolder = mediaItem.type === "folder";

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-surface-light border-slate-600">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
                {isFolder ? (
                  <Folder className="text-amber-500 text-xl" />
                ) : (
                  <Video className="text-primary text-xl" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{mediaItem.title}</DialogTitle>
                <p className="text-slate-400 text-sm">
                  {isFolder ? "Folder" : "Video File"} • {formatSize(mediaItem.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Media Preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
              {isPlaying && mediaItem.downloadUrl ? (
                <VideoPlayer
                  url={mediaItem.downloadUrl}
                  title={mediaItem.title}
                  onClose={() => setIsPlaying(false)}
                />
              ) : (
                <>
                  {isFolder ? (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
                      <Folder className="text-amber-500 text-8xl" />
                    </div>
                  ) : (
                    <>
                      {mediaItem.thumbnail ? (
                        <img
                          src={mediaItem.thumbnail}
                          alt={mediaItem.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <Video className="text-primary text-8xl" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Button
                          onClick={handlePlay}
                          disabled={!mediaItem.downloadUrl}
                          className="w-16 h-16 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80"
                        >
                          <Play className="text-white text-xl ml-1" />
                        </Button>
                      </div>
                      {mediaItem.duration && (
                        <div className="absolute bottom-4 left-4 text-white">
                          <div className="text-sm bg-black bg-opacity-70 px-2 py-1 rounded">
                            Duration: {formatDuration(mediaItem.duration)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* API Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Download Options</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshMetadataMutation.isPending}
                  className="bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshMetadataMutation.isPending ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {apiOptions.map((api) => (
                  <div
                    key={api.id}
                    onClick={() => handleApiSelect(api.id)}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      selectedApiId === api.id
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-600 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{api.name}</h4>
                        <p className="text-xs text-slate-400 capitalize">{api.status}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        api.status === 'available' ? 'bg-emerald-500' :
                        api.status === 'limited' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleDownload}
                disabled={getDownloadUrlMutation.isPending || !selectedApiId}
                className="w-full mt-4 bg-primary text-white hover:bg-primary/80"
              >
                <Download className="h-4 w-4 mr-2" />
                {getDownloadUrlMutation.isPending ? 'Getting Download Link...' : 'Start Download'}
              </Button>
            </div>
          </div>

          {/* Right Panel - Metadata */}
          <div className="w-80 bg-slate-800 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Details</h3>

            {/* Basic Info */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">Name</label>
                <p className="text-sm">{mediaItem.title}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">Type</label>
                <p className="text-sm capitalize">{mediaItem.type}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">Size</label>
                <p className="text-sm">{formatSize(mediaItem.size)}</p>
              </div>
              {mediaItem.duration && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Duration</label>
                  <p className="text-sm">{formatDuration(mediaItem.duration)}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">Added</label>
                <p className="text-sm">{mediaItem.createdAt ? new Date(mediaItem.createdAt).toLocaleString() : "Unknown"}</p>
              </div>
            </div>

            <TagCategoryManager
              mediaId={mediaItem.id}
              assignedTags={mediaItem.tags || []}
              assignedCategories={mediaItem.categories || []}
            />

            {/* Media Management */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Media Management</h3>
              <MediaManagement
                mediaItem={mediaItem}
                apiOptions={apiOptions}
              />
            </div>

            {/* Folder Contents (if folder) */}
            {isFolder && (
              <div className="mb-6">
                <label className="text-xs text-slate-400 uppercase tracking-wide">Contents</label>
                <div className="mt-3 space-y-2">
                  <div className="text-sm text-slate-300">
                    {mediaItem.folderVideoCount} videos, {mediaItem.folderImageCount} images
                  </div>
                  <div className="text-xs text-slate-400">
                    Total size: {formatSize(mediaItem.size)}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {mediaItem.description && (
              <div className="mb-6">
                <label className="text-xs text-slate-400 uppercase tracking-wide">Description</label>
                <p className="text-sm mt-2 text-slate-300">{mediaItem.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleDelete}
                disabled={deleteMediaMutation.isPending}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteMediaMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}