import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ApiOption } from "@shared/schema";

export function ApiSettings() {
  const [editingApi, setEditingApi] = useState<ApiOption | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    method: "POST" as const,
    type: "json" as const,
    field: "url",
    status: "available" as const,
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apiOptions = [] } = useQuery<ApiOption[]>({
    queryKey: ["/api/api-options"],
  });

  const updateApiMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ApiOption> }) => {
      const response = await apiRequest("PUT", `/api/api-options/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-options"] });
      setEditingApi(null);
      toast({
        title: "API Updated",
        description: "Successfully updated API configuration.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update API",
        variant: "destructive",
      });
    },
  });

  const createApiMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/api-options", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-options"] });
      setIsAddingNew(false);
      setFormData({
        name: "",
        url: "",
        method: "POST",
        type: "json",
        field: "url",
        status: "available",
        isActive: true
      });
      toast({
        title: "API Added",
        description: "Successfully added new API configuration.",
      });
    },
    onError: (error) => {
      toast({
        title: "Add Failed",
        description: error instanceof Error ? error.message : "Failed to add API",
        variant: "destructive",
      });
    },
  });

  const deleteApiMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/api-options/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-options"] });
      toast({
        title: "API Deleted",
        description: "Successfully deleted API configuration.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete API",
        variant: "destructive",
      });
    },
  });

  const handleSaveEdit = () => {
    if (editingApi) {
      updateApiMutation.mutate({
        id: editingApi.id,
        updates: formData
      });
    }
  };

  const handleAddNew = () => {
    createApiMutation.mutate(formData);
  };

  const startEdit = (api: ApiOption) => {
    setEditingApi(api);
    setFormData({
      name: api.name,
      url: api.url,
      method: api.method,
      type: api.type,
      field: api.field,
      status: api.status,
      isActive: api.isActive || false
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
      case "limited": return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case "offline": return "bg-red-500/20 text-red-500 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-500 border-gray-500/30";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2 hover:bg-surface-light">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-surface-light border-slate-600">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">API Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[calc(90vh-120px)]">
          {/* API List */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Current APIs</h3>
              <Button
                onClick={() => setIsAddingNew(true)}
                className="bg-primary text-white hover:bg-primary/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add API
              </Button>
            </div>

            <div className="grid gap-4">
              {apiOptions.map((api) => (
                <Card key={api.id} className="bg-slate-800 border-slate-600">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{api.name}</CardTitle>
                        <CardDescription className="text-xs">{api.method} • {api.type}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getStatusColor(api.status)}>
                          {api.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(api)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete API "${api.name}"?`)) {
                              deleteApiMutation.mutate(api.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-400 font-mono truncate">{api.url}</p>
                    <p className="text-xs text-slate-500 mt-1">Field: {api.field}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Edit Form */}
          {(editingApi || isAddingNew) && (
            <div className="w-80 bg-slate-800 p-6 overflow-y-auto border-l border-slate-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingApi ? "Edit API" : "Add New API"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingApi(null);
                    setIsAddingNew(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="API Name"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div>
                  <Label htmlFor="url" className="text-sm font-medium">URL</Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://your-api-endpoint.com"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div>
                  <Label htmlFor="method" className="text-sm font-medium">Method</Label>
                  <Select value={formData.method} onValueChange={(value: "GET" | "POST") => setFormData({ ...formData, method: value })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type" className="text-sm font-medium">Type</Label>
                  <Select value={formData.type} onValueChange={(value: "json" | "query") => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="query">Query Params</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="field" className="text-sm font-medium">Field Name</Label>
                  <Input
                    id="field"
                    value={formData.field}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    placeholder="url"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div>
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <Select value={formData.status} onValueChange={(value: "available" | "limited" | "offline") => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={editingApi ? handleSaveEdit : handleAddNew}
                  disabled={!formData.name || !formData.url || updateApiMutation.isPending || createApiMutation.isPending}
                  className="w-full bg-primary text-white hover:bg-primary/80"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingApi ? "Update API" : "Add API"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}