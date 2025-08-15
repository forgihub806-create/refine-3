
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getApiOptions, createApiOption, updateApiOption, deleteApiOption } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import { Link } from 'wouter';
import type { ApiOption } from '@shared/schema';

export default function Settings() {
  const { data: apiOptions = [], isLoading } = useQuery({
    queryKey: ['api-options'],
    queryFn: getApiOptions
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ApiOption>>({});
  const [newApiForm, setNewApiForm] = useState({
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

  const createMutation = useMutation({
    mutationFn: createApiOption,
    onSuccess: () => {
      toast({ title: "Success", description: "API option created successfully" });
      setNewApiForm({
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

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ApiOption> }) => 
      updateApiOption(id, updates),
    onSuccess: () => {
      toast({ title: "Success", description: "API option updated successfully" });
      setEditingId(null);
      setEditForm({});
      queryClient.invalidateQueries({ queryKey: ['api-options'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update API option",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiOption,
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

  const startEdit = (api: ApiOption) => {
    setEditingId(api.id);
    setEditForm(api);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editingId && editForm) {
      updateMutation.mutate({ id: editingId, updates: editForm });
    }
  };

  const handleCreate = () => {
    if (newApiForm.name && newApiForm.url && newApiForm.field) {
      createMutation.mutate(newApiForm);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'limited': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'offline': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Button variant="outline" asChild>
            <Link to="/">← Back to Home</Link>
          </Button>
        </div>

        {/* Create New API Option */}
        <Card className="bg-slate-800 border-slate-600 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New API Option
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-name">Name</Label>
                <Input
                  id="new-name"
                  value={newApiForm.name}
                  onChange={(e) => setNewApiForm({ ...newApiForm, name: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="API Name"
                />
              </div>
              <div>
                <Label htmlFor="new-url">URL</Label>
                <Input
                  id="new-url"
                  value={newApiForm.url}
                  onChange={(e) => setNewApiForm({ ...newApiForm, url: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="https://api.example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="new-method">Method</Label>
                <select
                  id="new-method"
                  value={newApiForm.method}
                  onChange={(e) => setNewApiForm({ ...newApiForm, method: e.target.value as 'GET' | 'POST' })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              <div>
                <Label htmlFor="new-type">Type</Label>
                <select
                  id="new-type"
                  value={newApiForm.type}
                  onChange={(e) => setNewApiForm({ ...newApiForm, type: e.target.value as 'json' | 'query' })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                >
                  <option value="json">JSON</option>
                  <option value="query">Query</option>
                </select>
              </div>
              <div>
                <Label htmlFor="new-field">Field</Label>
                <Input
                  id="new-field"
                  value={newApiForm.field}
                  onChange={(e) => setNewApiForm({ ...newApiForm, field: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="url"
                />
              </div>
              <div>
                <Label htmlFor="new-status">Status</Label>
                <select
                  id="new-status"
                  value={newApiForm.status}
                  onChange={(e) => setNewApiForm({ ...newApiForm, status: e.target.value as 'available' | 'limited' | 'offline' })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                >
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="new-active"
                  checked={newApiForm.isActive}
                  onCheckedChange={(checked) => setNewApiForm({ ...newApiForm, isActive: checked })}
                />
                <Label htmlFor="new-active">Active</Label>
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : 'Create API Option'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing API Options */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Existing API Options</h2>
          {apiOptions.length === 0 ? (
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="text-center py-8">
                <p className="text-slate-400">No API options found. Create one above to get started.</p>
              </CardContent>
            </Card>
          ) : (
            apiOptions.map((api) => (
              <Card key={api.id} className="bg-slate-800 border-slate-600">
                <CardContent className="p-6">
                  {editingId === api.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`edit-name-${api.id}`}>Name</Label>
                          <Input
                            id={`edit-name-${api.id}`}
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-url-${api.id}`}>URL</Label>
                          <Input
                            id={`edit-url-${api.id}`}
                            value={editForm.url || ''}
                            onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor={`edit-method-${api.id}`}>Method</Label>
                          <select
                            id={`edit-method-${api.id}`}
                            value={editForm.method || 'POST'}
                            onChange={(e) => setEditForm({ ...editForm, method: e.target.value as 'GET' | 'POST' })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`edit-type-${api.id}`}>Type</Label>
                          <select
                            id={`edit-type-${api.id}`}
                            value={editForm.type || 'json'}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'json' | 'query' })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                          >
                            <option value="json">JSON</option>
                            <option value="query">Query</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`edit-field-${api.id}`}>Field</Label>
                          <Input
                            id={`edit-field-${api.id}`}
                            value={editForm.field || ''}
                            onChange={(e) => setEditForm({ ...editForm, field: e.target.value })}
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-status-${api.id}`}>Status</Label>
                          <select
                            id={`edit-status-${api.id}`}
                            value={editForm.status || 'available'}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'available' | 'limited' | 'offline' })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                          >
                            <option value="available">Available</option>
                            <option value="limited">Limited</option>
                            <option value="offline">Offline</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`edit-active-${api.id}`}
                            checked={editForm.isActive || false}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                          />
                          <Label htmlFor={`edit-active-${api.id}`}>Active</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                          <Button onClick={saveEdit} disabled={updateMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {updateMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{api.name}</h3>
                          <Badge variant="outline" className={getStatusColor(api.status)}>
                            {api.status}
                          </Badge>
                          {api.isActive && (
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          <span className="font-mono">{api.method}</span> • {api.type} • Field: {api.field}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {api.url}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(api)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(api.id, api.name)}
                          className="text-red-400 hover:text-red-300"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
