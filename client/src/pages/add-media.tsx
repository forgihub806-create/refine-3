import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createMediaItems } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AddMedia() {
  const [urls, setUrls] = useState("");
  const { toast } = useToast();

  const addMediaMutation = useMutation({
    mutationFn: (urls: string[]) => createMediaItems(urls),
    onSuccess: () => {
      toast({
        title: "Media Added",
        description: "Successfully added new media items. They will be processed in the background.",
      });
      setUrls("");
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Media",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const urlList = urls.split("\n").map(u => u.trim()).filter(Boolean);
    if (urlList.length > 0) {
      addMediaMutation.mutate(urlList);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Add New Media</h1>
        <div className="text-slate-400 mb-6">
          <p className="mb-2">
            Paste URLs (one per line) to add new media items. Metadata will be scraped automatically.
          </p>
          <div className="text-sm text-slate-500">
            ✅ Supported: TeraBox, 1fichier, and other file sharing links<br/>
            ✅ Bulk import: Add multiple URLs separated by line breaks<br/>
            ✅ Auto-detection: Video, image, and folder types
          </div>
        </div>
        <Textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={`https://terabox.com/s/1abcd...
https://1fichier.com/?xyz123...
https://terabox.com/s/2efgh...

(Add one URL per line for bulk import)`}
          className="bg-slate-800 border-slate-600 min-h-[200px] mb-4"
        />
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link to="/">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={addMediaMutation.isPending}>
            {addMediaMutation.isPending ? "Adding..." : "Add Media"}
          </Button>
        </div>
      </div>
    </div>
  );
}
