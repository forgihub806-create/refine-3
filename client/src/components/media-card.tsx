import { Play, Video, Folder, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MediaItemWithTags } from "@shared/schema";

interface MediaCardProps {
  item: MediaItemWithTags;
  viewMode: "grid" | "list";
  onClick: () => void;
  isLoadingMetadata?: boolean; // Added to indicate loading state
  currentItem?: MediaItemWithTags; // Added to pass the current item for thumbnail if different
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
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (date: Date | null) => {
  if (!date) return "Unknown";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(date).toLocaleDateString();
};

export function MediaCard({ item, viewMode, onClick, isLoadingMetadata, currentItem }: MediaCardProps) {
  const isFolder = item.type === "folder";

  if (viewMode === "list") {
    return (
      <div
        onClick={onClick}
        className="card-hover bg-surface rounded-xl overflow-hidden border border-slate-700 cursor-pointer p-4"
      >
        <div className="flex items-center space-x-4">
          <div className="w-24 h-16 bg-slate-700 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden">
            {isFolder ? (
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 w-full h-full flex items-center justify-center">
                <Folder className="text-amber-500 w-8 h-8" />
              </div>
            ) : (
              <>
                {isLoadingMetadata ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-700">
                    <RefreshCw className="text-primary w-8 h-8 animate-spin" />
                  </div>
                ) : currentItem?.thumbnail ? (
                  <img src={currentItem.thumbnail} alt={currentItem.title} className="w-full h-full object-cover" />
                ) : item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <Video className="text-primary w-8 h-8" />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <Play className="text-white w-4 h-4 opacity-0 hover:opacity-100 transition-opacity duration-200" />
                </div>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 truncate">{item.title}</h3>
            <div className="flex items-center space-x-4 text-xs text-slate-400 mb-2">
              <span>{formatSize(item.size)}</span>
              <span>•</span>
              <span>{formatDate(item.createdAt)}</span>
              {item.duration && (
                <>
                  <span>•</span>
                  <span>{formatDuration(item.duration)}</span>
                </>
              )}
              {isFolder && (
                <>
                  <span>•</span>
                  <span>{item.folderVideoCount} videos, {item.folderImageCount} images</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={`text-xs ${getTagColor(tag.color)}`}
                >
                  {tag.name}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="outline" className="text-xs bg-slate-700/50 text-slate-400">
                  +{item.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="card-hover bg-surface rounded-xl overflow-hidden border border-slate-700 cursor-pointer"
    >
      <div className="relative aspect-video">
        {isFolder ? (
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 w-full h-full flex items-center justify-center">
            <Folder className="text-amber-500 text-6xl" />
          </div>
        ) : (
          <>
            {isLoadingMetadata ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                <RefreshCw className="text-primary w-8 h-8 animate-spin" />
              </div>
            ) : currentItem?.thumbnail ? (
              <img src={currentItem.thumbnail} alt={currentItem.title} className="w-full h-full object-cover" />
            ) : item.thumbnail ? (
              <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="bg-slate-700 w-full h-full flex items-center justify-center">
                <Video className="text-primary text-6xl" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
              <Play className="text-white text-2xl opacity-0 hover:opacity-100 transition-opacity duration-200" />
            </div>
          </>
        )}

        <div className="absolute top-2 left-2">
          <Badge className="bg-black/70 text-white text-xs">
            {isFolder ? 'FOLDER' : 'HD'}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          {isFolder ? (
            <Folder className="text-amber-500 bg-black bg-opacity-50 p-1 rounded w-6 h-6" />
          ) : (
            <Video className="text-primary bg-black bg-opacity-50 p-1 rounded w-6 h-6" />
          )}
        </div>
        {item.duration && (
          <div className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-70 px-2 py-1 rounded flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(item.duration)}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{item.title}</h3>
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
          <span>{formatSize(item.size)}</span>
          <span>•</span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
        {isFolder && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
            <span>{item.folderVideoCount} videos</span>
            <span>•</span>
            <span>{item.folderImageCount} images</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className={`text-xs ${getTagColor(tag.color)}`}
            >
              {tag.name}
            </Badge>
          ))}
          {item.tags.length > 2 && (
            <Badge variant="outline" className="text-xs bg-slate-700/50 text-slate-400">
              +{item.tags.length - 2}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}