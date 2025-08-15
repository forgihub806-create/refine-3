
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateMediaItem, deleteMediaItem, getDownloadUrl, createApiOption, deleteApiOption } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Download, Plus, Settings } from 'lucide-react';
import type { MediaItem, ApiOption } from '@shared/schema';

interface MediaManagementProps {
  mediaItem: MediaItem;
  apiOptions: ApiOption[];
}

export function MediaManagement({ mediaItem, apiOptions }: MediaManagementProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: mediaItem.title,
    description: mediaItem.description || '',
    type: mediaItem.type
  });
  const [newApiOption, setNewApiOption] = useState({
    name: '',
    url: '',
    method: 'POST' as 'GET' | 'POST',
    type: 'json' as 'json' | 'query',
    field: '',
    status: 'available' as 'available' | 'limited' | 'offline',
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<MediaItem>) => updateMediaItem(mediaItem.id, updates),
    onSuccess: () => {
      toast({ title: "Success", description: "Media item updated successfully" });
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['mediaItem', mediaItem.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update media item",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMediaItem(mediaItem.id),
    onSuccess: () => {
      toast({ title: "Success", description: "Media item deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to delete media item",
        variant: "destructive"
      });
    }
  });

  const downloadMutation = useMutation({
    mutationFn: (apiId?: string) => getDownloadUrl(mediaItem.id, apiId),
    onSuccess: (data) => {
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast({
          title: "Download Ready",
          description: `Download link retrieved via ${data.proxy || 'cache'}`
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to get download link",
        variant: "destructive"
      });
    }
  });

  const createApiMutation = useMutation({
    mutationFn: (option: typeof newApiOption) => createApiOption(option),
    onSuccess: () => {
      toast({ title: "Success", description: "API option created successfully" });
      setNewApiOption({
        name: '', url: '', method: 'POST', type: 'json', field: '', status: 'available', isActive: true
      });
      queryClient.invalidateQueries({ queryKey: ['api-options'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create API option",
        variant: "destructive"
      });
    }
  });

  const deleteApiMutation = useMutation({
    mutationFn: (id: string) => deleteApiOption(id),
    onSuccess: () => {
      toast({ title: "Success", description: "API option deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['api-options'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete API option", 
        variant: "destructive"
      });
    }
  });

  const handleEditSubmit = () => {
    updateMutation.mutate(editForm);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this media item?')) {
      deleteMutation.mutate();
    }
  };

  const handleDownload = (apiId?: string) => {
    downloadMutation.mutate(apiId);
  };

  const handleCreateApi = () => {
    if (newApiOption.name && newApiOption.url && newApiOption.field) {
      createApiMutation.mutate(newApiOption);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-600">
            <DialogHeader>
              <DialogTitle>Edit Media Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
          <Trash2 className="h-4 w-4 mr-2" />
          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        </Button>

        <Button variant="outline" size="sm" onClick={() => handleDownload()}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>

        <Dialog open={isApiSettingsOpen} onOpenChange={setIsApiSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              API Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-600 max-w-2xl">
            <DialogHeader>
              <DialogTitle>API Options Management</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Create New API Option */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-sm">Add New API Option</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="api-name">Name</Label>
                      <Input
                        id="api-name"
                        value={newApiOption.name}
                        onChange={(e) => setNewApiOption({ ...newApiOption, name: e.target.value })}
                        className="bg-slate-600 border-slate-500"
                        placeholder="API Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="api-url">URL</Label>
                      <Input
                        id="api-url"
                        value={newApiOption.url}
                        onChange={(e) => setNewApiOption({ ...newApiOption, url: e.target.value })}
                        className="bg-slate-600 border-slate-500"
                        placeholder="https://api.example.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="api-method">Method</Label>
                      <select
                        id="api-method"
                        value={newApiOption.method}
                        onChange={(e) => setNewApiOption({ ...newApiOption, method: e.target.value as 'GET' | 'POST' })}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="api-type">Type</Label>
                      <select
                        id="api-type"
                        value={newApiOption.type}
                        onChange={(e) => setNewApiOption({ ...newApiOption, type: e.target.value as 'json' | 'query' })}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md"
                      >
                        <option value="json">JSON</option>
                        <option value="query">Query</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="api-field">Field</Label>
                      <Input
                        id="api-field"
                        value={newApiOption.field}
                        onChange={(e) => setNewApiOption({ ...newApiOption, field: e.target.value })}
                        className="bg-slate-600 border-slate-500"
                        placeholder="url"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateApi} disabled={createApiMutation.isPending} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {createApiMutation.isPending ? 'Creating...' : 'Create API Option'}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing API Options */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Existing API Options</h3>
                {apiOptions.map((api) => (
                  <Card key={api.id} className="bg-slate-700 border-slate-600">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-medium">{api.name}</h4>
                        <p className="text-sm text-slate-400">{api.method} • {api.type} • {api.status}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${api.name}"?`)) {
                            deleteApiMutation.mutate(api.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Download Options */}
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm">Download via Specific API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {apiOptions.filter(api => api.isActive).map((api) => (
              <Button
                key={api.id}
                variant="outline"
                size="sm"
                onClick={() => handleDownload(api.id)}
                disabled={downloadMutation.isPending}
                className="justify-start"
              >
                <Download className="h-3 w-3 mr-2" />
                {api.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
