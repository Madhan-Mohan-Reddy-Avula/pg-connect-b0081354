import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Receipt, Check, Clock, IndianRupee, Calendar, User, Download } from 'lucide-react';
import { generateRentReceipt } from '@/utils/generateRentReceipt';
import { format } from 'date-fns';

interface Rent {
  id: string;
  guest_id: string;
  amount: number;
  month: string;
  status: string;
  paid_date: string | null;
  guest?: { full_name: string; phone: string };
}

interface Guest {
  id: string;
  full_name: string;
  monthly_rent: number;
}

export default function RentTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    guest_id: '',
    amount: 0,
    month: format(new Date(), 'yyyy-MM'),
  });

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

  const { data: guests } = useQuery({
    queryKey: ['active-guests', pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('id, full_name, monthly_rent')
        .eq('pg_id', pg!.id)
        .eq('status', 'active');
      if (error) throw error;
      return data as Guest[];
    },
    enabled: !!pg?.id,
  });

  const { data: rents, isLoading } = useQuery({
    queryKey: ['rents', pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rents')
        .select('*, guest:guests(full_name, phone)')
        .order('month', { ascending: false });
      if (error) throw error;
      return data as Rent[];
    },
    enabled: !!pg?.id,
  });

  const addRentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('rents').insert({
        guest_id: data.guest_id,
        amount: data.amount,
        month: `${data.month}-01`,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Rent entry added', description: 'Rent record created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (rentId: string) => {
      const { error } = await supabase
        .from('rents')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', rentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      toast({ title: 'Rent marked as paid', description: 'Payment recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const markPendingMutation = useMutation({
    mutationFn: async (rentId: string) => {
      const { error } = await supabase
        .from('rents')
        .update({
          status: 'pending',
          paid_date: null,
        })
        .eq('id', rentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      toast({ title: 'Rent marked as pending' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      guest_id: '',
      amount: 0,
      month: format(new Date(), 'yyyy-MM'),
    });
  };

  const handleGuestChange = (guestId: string) => {
    const guest = guests?.find(g => g.id === guestId);
    setFormData({
      ...formData,
      guest_id: guestId,
      amount: guest?.monthly_rent || 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRentMutation.mutate(formData);
  };

  const pendingCount = rents?.filter(r => r.status === 'pending').length || 0;
  const paidCount = rents?.filter(r => r.status === 'paid').length || 0;
  const totalPending = rents?.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0) || 0;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rent Tracking</h1>
            <p className="text-muted-foreground">Track and manage rent payments</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Rent Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add Rent Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="guest_id">Select Guest</Label>
                  <Select value={formData.guest_id} onValueChange={handleGuestChange}>
                    <SelectTrigger className="bg-secondary/50 border-border">
                      <SelectValue placeholder="Select a guest" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {guests?.map((guest) => (
                        <SelectItem key={guest.id} value={guest.id}>
                          {guest.full_name} (₹{guest.monthly_rent}/mo)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Input
                    id="month"
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="bg-secondary/50 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                    className="bg-secondary/50 border-border"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-foreground text-background hover:bg-foreground/90" disabled={addRentMutation.isPending || !formData.guest_id}>
                    Add Entry
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Check className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold">{paidCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending</p>
                  <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rent List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rents?.length === 0 ? (
          <Card className="premium-card">
            <CardContent className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No rent entries yet</h3>
              <p className="text-muted-foreground mb-4">Add your first rent entry to start tracking</p>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Rent Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rents?.map((rent) => (
              <Card key={rent.id} className="premium-card">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{rent.guest?.full_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(rent.month), 'MMMM yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">₹{rent.amount.toLocaleString()}</p>
                        <Badge variant={rent.status === 'paid' ? 'default' : 'secondary'}>
                          {rent.status === 'paid' ? (
                            <><Check className="w-3 h-3 mr-1" /> Paid</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {rent.status === 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (pg && rent.guest) {
                                generateRentReceipt({
                                  guestName: rent.guest.full_name,
                                  guestPhone: rent.guest.phone,
                                  pgName: pg.name,
                                  pgAddress: `${pg.address}, ${pg.city}`,
                                  ownerName: pg.owner_name,
                                  amount: rent.amount,
                                  month: rent.month,
                                  paidDate: rent.paid_date,
                                  receiptId: rent.id,
                                });
                              }
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {rent.status === 'pending' ? (
                          <Button
                            size="sm"
                            onClick={() => markPaidMutation.mutate(rent.id)}
                            disabled={markPaidMutation.isPending}
                            className="bg-foreground text-background hover:bg-foreground/90"
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPendingMutation.mutate(rent.id)}
                            disabled={markPendingMutation.isPending}
                          >
                            Undo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {rent.paid_date && (
                    <p className="text-xs text-muted-foreground mt-2 ml-14">
                      Paid on {format(new Date(rent.paid_date), 'dd MMM yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
