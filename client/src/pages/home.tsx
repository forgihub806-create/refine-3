import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Menu, Settings, RefreshCw, Grid3X3, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useMediaItems } from "@/hooks/use-media";
import { MediaCard } from "@/components/media-card";
import { DetailModal } from "@/components/detail-modal";
import { Sidebar } from "@/components/sidebar";
import { ApiSettings } from "@/components/api-settings";
import type { MediaItemWithTagsAndCategories, MediaSearchParams } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<"video" | "folder" | undefined>();
  const [selectedSizeRange, setSelectedSizeRange] = useState<"small" | "medium" | "large" | undefined>();
  const [sortBy, setSortBy] = useState("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const searchParams: MediaSearchParams = {
    search: debouncedSearchQuery || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    type: selectedType,
    sizeRange: selectedSizeRange,
    page: currentPage,
    limit: 20,
  };

  const { data: mediaResult, isLoading, error, refetch } = useMediaItems(searchParams);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedTags, selectedCategories, selectedType, selectedSizeRange]);

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleCardClick = (mediaId: string) => {
    setSelectedMediaId(mediaId);
  };

  const closeSidebar = () => setSidebarOpen(false);
  const closeModal = () => setSelectedMediaId(null);

  const totalPages = Math.ceil((mediaResult?.total || 0) / 20);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {/* Header */}
      <header className="bg-surface border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Hamburger Menu */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-surface-light"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <h1 className="text-xl font-bold">CipherBoxX</h1>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search videos, folders, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border-slate-600 pl-10 pr-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>
            
            {/* User Actions */}
            <div className="flex items-center space-x-3">
              <Button variant="outline" asChild>
                <Link to="/add-media">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Media
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2 hover:bg-surface-light"
                title="Refresh All"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <ApiSettings />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedSizeRange={selectedSizeRange}
          onSizeRangeChange={setSelectedSizeRange}
        />

        {/* Main Content */}
        <main className="flex-1 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Media Library</h2>
                <p className="text-slate-400 mt-1">
                  {mediaResult ? `Showing ${mediaResult.items.length} of ${mediaResult.total} items` : 'Loading...'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date Added</SelectItem>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="size">Sort by Size</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex rounded-lg border border-slate-600 overflow-hidden">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="px-3 py-2"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="px-3 py-2"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="bg-surface rounded-xl overflow-hidden border border-slate-700 animate-pulse">
                    <div className="aspect-video bg-slate-700" />
                    <div className="p-4">
                      <div className="h-4 bg-slate-700 rounded mb-2" />
                      <div className="h-3 bg-slate-700 rounded w-3/4 mb-2" />
                      <div className="flex gap-1">
                        <div className="h-6 bg-slate-700 rounded-full w-12" />
                        <div className="h-6 bg-slate-700 rounded-full w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">Failed to load media items</p>
                <Button onClick={() => refetch()}>Try Again</Button>
              </div>
            )}

            {/* Media Grid */}
            {mediaResult && !isLoading && (
              <>
                {mediaResult.items.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400 mb-4">No media items found</p>
                    <p className="text-sm text-slate-500">
                      {searchQuery || selectedTags.length > 0 || selectedType || selectedSizeRange
                        ? "Try adjusting your filters"
                        : "Add some media to get started"
                      }
                    </p>
                  </div>
                ) : (
                  <div className={`grid gap-6 ${
                    viewMode === "grid" 
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                      : "grid-cols-1"
                  }`}>
                    {mediaResult.items.map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        viewMode={viewMode}
                        onClick={() => handleCardClick(item.id)}
                      />
                    ))}
                  </div>
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8">
                    <div className="text-sm text-slate-400">
                      Showing <span className="font-medium">{((currentPage - 1) * 20) + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(currentPage * 20, mediaResult.total)}</span> of{" "}
                      <span className="font-medium">{mediaResult.total}</span> results
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                      >
                        Previous
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                          >
                            {page}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && <span className="px-2 text-slate-400">...</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Detail Modal */}
      {selectedMediaId && (
        <DetailModal
          mediaId={selectedMediaId}
          isOpen={!!selectedMediaId}
          onClose={closeModal}
        />
      )}

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={closeSidebar}
        />
      )}
    </div>
  );
}
