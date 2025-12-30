import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Megaphone, Edit2, Trash2, AlertTriangle, Info, Bell } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  is_active: boolean;
  created_at: string;
  pg_id: string;
}

export default function AnnouncementsManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // Fetch PG
  const { data: pg } = useQuery({
    queryKey: ["owner-pg", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgs")
        .select("id, name")
        .eq("owner_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch announcements
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["owner-announcements", pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("pg_id", pg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!pg?.id,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pg?.id) throw new Error("PG not found");

      if (editingAnnouncement) {
        const { error } = await supabase
          .from("announcements")
          .update({ title, content, priority })
          .eq("id", editingAnnouncement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert({
          pg_id: pg.id,
          title,
          content,
          priority,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-announcements"] });
      toast({
        title: editingAnnouncement ? "Announcement Updated" : "Announcement Created",
        description: "Your announcement has been saved.",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-announcements"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-announcements"] });
      toast({
        title: "Announcement Deleted",
        description: "The announcement has been removed.",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPriority("normal");
    setEditingAnnouncement(null);
    setIsOpen(false);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setPriority(announcement.priority);
    setIsOpen(true);
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (announcementToDelete) {
      deleteMutation.mutate(announcementToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setAnnouncementToDelete(null);
  };

  const getPriorityConfig = (priorityValue: string) => {
    switch (priorityValue) {
      case "urgent":
        return { icon: AlertTriangle, color: "text-destructive", badge: "bg-destructive/20 text-destructive" };
      case "high":
        return { icon: Bell, color: "text-warning", badge: "bg-warning/20 text-warning" };
      case "low":
        return { icon: Info, color: "text-muted-foreground", badge: "bg-muted text-muted-foreground" };
      default:
        return { icon: Megaphone, color: "text-primary", badge: "bg-primary/20 text-primary" };
    }
  };

  if (!pg) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please set up your PG first</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
            <p className="text-muted-foreground">Send announcements to your guests</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="btn-gradient text-primary-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter announcement title"
                    className="bg-muted/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter announcement content"
                    rows={4}
                    className="bg-muted/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full btn-gradient text-primary-foreground font-semibold"
                  onClick={() => saveMutation.mutate()}
                  disabled={!title || !content || saveMutation.isPending}
                >
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAnnouncement ? "Update" : "Create"} Announcement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : announcements?.length === 0 ? (
          <Card className="premium-card border-border/30">
            <CardContent className="py-16 text-center">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Announcements</h3>
              <p className="text-muted-foreground mb-6">Create your first announcement to notify guests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements?.map((announcement) => {
              const config = getPriorityConfig(announcement.priority);
              const Icon = config.icon;

              return (
                <Card key={announcement.id} className="premium-card border-border/30">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${config.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                            <Badge className={`text-xs ${config.badge}`}>{announcement.priority}</Badge>
                            {!announcement.is_active && (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                            {announcement.content}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${announcement.id}`} className="text-xs text-muted-foreground">
                            Active
                          </Label>
                          <Switch
                            id={`active-${announcement.id}`}
                            checked={announcement.is_active}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: announcement.id, isActive: checked })
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(announcement)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Announcement"
        description={`Are you sure you want to delete "${announcementToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </DashboardLayout>
  );
}
