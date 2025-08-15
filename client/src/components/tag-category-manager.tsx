import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTags, getCategories, addTagToMediaItem, removeTagFromMediaItem, addCategoryToMediaItem, removeCategoryFromMediaItem, createTag, createCategory } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface TagCategoryManagerProps {
  mediaId: string;
  assignedTags: { id: string, name: string, color: string | null }[];
  assignedCategories: { id: string, name: string }[];
}

export function TagCategoryManager({ mediaId, assignedTags, assignedCategories }: TagCategoryManagerProps) {
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: getTags });
  const { data: allCategories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const [newTagName, setNewTagName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateMediaItem = () => {
    queryClient.invalidateQueries({ queryKey: ['mediaItem', mediaId] });
  };

  const addTagMutation = useMutation({ mutationFn: (tagId: string) => addTagToMediaItem(mediaId, tagId), onSuccess: invalidateMediaItem });
  const removeTagMutation = useMutation({ mutationFn: (tagId: string) => removeTagFromMediaItem(mediaId, tagId), onSuccess: invalidateMediaItem });
  const createTagMutation = useMutation({ mutationFn: (name: string) => createTag(name, "primary"), onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    setNewTagName("");
  }});

  const addCategoryMutation = useMutation({ mutationFn: (categoryId: string) => addCategoryToMediaItem(mediaId, categoryId), onSuccess: invalidateMediaItem });
  const removeCategoryMutation = useMutation({ mutationFn: (categoryId: string) => removeCategoryFromMediaItem(mediaId, categoryId), onSuccess: invalidateMediaItem });
  const createCategoryMutation = useMutation({ mutationFn: (name: string) => createCategory(name), onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    setNewCategoryName("");
  }});

  const unassignedTags = allTags.filter(t => !assignedTags.some(at => at.id === t.id));
  const unassignedCategories = allCategories.filter(c => !assignedCategories.some(ac => ac.id === c.id));

  return (
    <div>
      {/* Tag Management */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 uppercase tracking-wide">Tags</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {assignedTags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
              <button onClick={() => removeTagMutation.mutate(tag.id)} className="ml-1 hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder="Search or create tag..." />
                <CommandEmpty>
                  <div className="p-2">
                    <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag name" />
                    <Button onClick={() => createTagMutation.mutate(newTagName)} size="sm" className="mt-2 w-full">Create</Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {unassignedTags.map((tag) => (
                    <CommandItem key={tag.id} onSelect={() => addTagMutation.mutate(tag.id)}>
                      {tag.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Category Management */}
      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wide">Categories</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {assignedCategories.map((category) => (
            <Badge key={category.id} variant="outline">
              {category.name}
              <button onClick={() => removeCategoryMutation.mutate(category.id)} className="ml-1 hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
           <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Category
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder="Search or create category..." />
                <CommandEmpty>
                  <div className="p-2">
                    <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" />
                    <Button onClick={() => createCategoryMutation.mutate(newCategoryName)} size="sm" className="mt-2 w-full">Create</Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {unassignedCategories.map((category) => (
                    <CommandItem key={category.id} onSelect={() => addCategoryMutation.mutate(category.id)}>
                      {category.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
