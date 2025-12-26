import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function GuestComplaints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  // Fetch guest details
  const { data: guest } = useQuery({
    queryKey: ['guest-for-complaints', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('id, pg_id')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch complaints
  const { data: complaints, isLoading } = useQuery({
    queryKey: ['guest-complaints', guest?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('guest_id', guest!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Complaint[];
    },
    enabled: !!guest?.id,
  });

  // Add complaint mutation
  const addComplaintMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('complaints').insert({
        guest_id: guest!.id,
        pg_id: guest!.pg_id,
        title: data.title,
        description: data.description,
        status: 'open',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-complaints'] });
      setIsDialogOpen(false);
      setFormData({ title: '', description: '' });
      toast({ title: 'Complaint submitted', description: 'Your complaint has been sent to the owner' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addComplaintMutation.mutate(formData);
  };

  const openCount = complaints?.filter(c => c.status === 'open').length || 0;
  const closedCount = complaints?.filter(c => c.status === 'closed').length || 0;

  if (!guest) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Not Assigned</h2>
          <p className="text-muted-foreground">Please contact your PG owner</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Complaints</h1>
            <p className="text-muted-foreground">Raise and track your complaints</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Raise Complaint
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Raise a Complaint</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief title of your complaint"
                    className="bg-secondary/50 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    className="bg-secondary/50 border-border"
                    rows={4}
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-foreground text-background hover:bg-foreground/90" disabled={addComplaintMutation.isPending}>
                    Submit
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open</p>
                  <p className="text-2xl font-bold">{openCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Closed</p>
                  <p className="text-2xl font-bold">{closedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Complaints List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : complaints?.length === 0 ? (
          <Card className="premium-card">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No complaints yet</h3>
              <p className="text-muted-foreground mb-4">Have an issue? Raise a complaint</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Raise Complaint
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {complaints?.map((complaint) => (
              <Card key={complaint.id} className="premium-card">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{complaint.title}</h3>
                        <Badge variant={complaint.status === 'open' ? 'secondary' : 'default'}>
                          {complaint.status === 'open' ? (
                            <><Clock className="w-3 h-3 mr-1" /> Open</>
                          ) : (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Closed</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                        {complaint.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted on {format(new Date(complaint.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
