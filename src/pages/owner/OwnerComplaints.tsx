import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Clock, CheckCircle2, User, Filter, Search, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

type ComplaintStatusFilter = 'all' | 'open' | 'closed';

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  guest: { full_name: string; phone: string };
}

export default function OwnerComplaints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ComplaintStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const { data: pg } = useQuery({
    queryKey: ['owner-pg', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pgs')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['owner-complaints', pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, guest:guests(full_name, phone)')
        .eq('pg_id', pg!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Complaint[];
    },
    enabled: !!pg?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('complaints')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-complaints'] });
      toast({ title: 'Status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const openCount = complaints?.filter(c => c.status === 'open').length || 0;
  const closedCount = complaints?.filter(c => c.status === 'closed').length || 0;

  if (!pg) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please set up your PG first</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">View and manage guest complaints</p>
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or guest name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: ComplaintStatusFilter) => setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: 'date' | 'name') => setSortBy(v)}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="date">Latest First</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Complaints List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (() => {
          const filteredComplaints = complaints?.filter(complaint => {
            const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
            const matchesSearch = searchQuery === '' || 
              complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              complaint.guest?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
          }).sort((a, b) => {
            if (sortBy === 'name') return (a.guest?.full_name || '').localeCompare(b.guest?.full_name || '');
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          if (filteredComplaints?.length === 0) {
            return (
              <Card className="premium-card">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {complaints?.length === 0 ? 'No complaints' : 'No matching complaints'}
                  </h3>
                  <p className="text-muted-foreground">
                    {complaints?.length === 0 ? 'All your guests are happy!' : 'Try adjusting your filters'}
                  </p>
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="space-y-4">
              {filteredComplaints?.map((complaint) => (
              <Card key={complaint.id} className="premium-card">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{complaint.guest?.full_name}</span>
                        </div>
                        <span>•</span>
                        <span>{format(new Date(complaint.created_at), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {complaint.status === 'open' ? (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: complaint.id, status: 'closed' })}
                          disabled={updateStatusMutation.isPending}
                          className="bg-foreground text-background hover:bg-foreground/90"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Mark Closed
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: complaint.id, status: 'open' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
