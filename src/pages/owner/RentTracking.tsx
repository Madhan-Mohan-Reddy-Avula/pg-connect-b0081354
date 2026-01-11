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
import { Plus, Receipt, Check, Clock, IndianRupee, Calendar, User, Download, AlertTriangle, Filter, Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { generateRentReceipt } from '@/utils/generateRentReceipt';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { Link } from 'react-router-dom';

type RentStatusFilter = 'all' | 'paid' | 'pending' | 'overdue';

interface Rent {
  id: string;
  guest_id: string;
  amount: number;
  month: string;
  status: string;
  paid_date: string | null;
  due_date: string | null;
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
  const [statusFilter, setStatusFilter] = useState<RentStatusFilter>('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [formData, setFormData] = useState({
    guest_id: '',
    amount: 0,
    month: format(new Date(), 'yyyy-MM'),
    due_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 5), 'yyyy-MM-dd'),
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
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return data as Rent[];
    },
    enabled: !!pg?.id,
  });

  // Fetch pending payments for approval
  const { data: pendingPayments } = useQuery({
    queryKey: ['pending-payments', pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_payments')
        .select('*, guest:guests(full_name, phone)')
        .eq('pg_id', pg!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!pg?.id,
  });

  const addRentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('rents').insert({
        guest_id: data.guest_id,
        amount: data.amount,
        month: `${data.month}-01`,
        due_date: data.due_date,
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
    const now = new Date();
    setFormData({
      guest_id: '',
      amount: 0,
      month: format(now, 'yyyy-MM'),
      due_date: format(new Date(now.getFullYear(), now.getMonth(), 5), 'yyyy-MM-dd'),
    });
  };

  const getStatusInfo = (rent: Rent) => {
    if (rent.status === 'paid') {
      return { status: 'paid', label: 'Paid', variant: 'default' as const };
    }
    
    if (!rent.due_date) {
      return { status: 'pending', label: 'Pending', variant: 'secondary' as const };
    }

    const due = new Date(rent.due_date);
    const daysUntil = differenceInDays(due, new Date());

    if (isPast(due) && !isToday(due)) {
      const daysOverdue = Math.abs(daysUntil);
      return {
        status: 'overdue',
        label: `${daysOverdue}d Overdue`,
        variant: 'destructive' as const,
      };
    }

    if (isToday(due)) {
      return { status: 'due-today', label: 'Due Today', variant: 'secondary' as const };
    }

    if (daysUntil <= 3) {
      return { status: 'due-soon', label: `${daysUntil}d Left`, variant: 'secondary' as const };
    }

    return { status: 'pending', label: 'Pending', variant: 'secondary' as const };
  };

  const handleGuestChange = (guestId: string) => {
    const guest = guests?.find(g => g.id === guestId);
    const now = new Date();
    setFormData({
      ...formData,
      guest_id: guestId,
      amount: guest?.monthly_rent || 0,
      due_date: format(new Date(now.getFullYear(), now.getMonth(), 5), 'yyyy-MM-dd'),
    });
  };

  const overdueCount = rents?.filter(r => {
    if (r.status !== 'pending' || !r.due_date) return false;
    return isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date));
  }).length || 0;

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

        {/* Pending Payment Approvals Alert */}
        {pendingPayments && pendingPayments.length > 0 && (
          <Card className="premium-card border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {pendingPayments.length} Payment{pendingPayments.length > 1 ? 's' : ''} Awaiting Approval
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Total: ₹{pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Link to="/owner/payments">
                  <Button className="bg-foreground text-background hover:bg-foreground/90 gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Review Payments
                  </Button>
                </Link>
              </div>
              {/* Quick preview of pending payments */}
              <div className="mt-4 space-y-2">
                {pendingPayments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{payment.guest?.full_name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{payment.payment_purpose}</Badge>
                    </div>
                    <span className="font-medium">₹{Number(payment.amount).toLocaleString()}</span>
                  </div>
                ))}
                {pendingPayments.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{pendingPayments.length - 3} more pending...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
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
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          {overdueCount > 0 && (
            <Card className="premium-card border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-destructive">Overdue</p>
                    <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border"
            />
          </div>
          <Input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            placeholder="Filter by month"
            className="w-full sm:w-40 bg-secondary/50 border-border"
          />
          <Select value={statusFilter} onValueChange={(v: RentStatusFilter) => setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: 'date' | 'amount' | 'name') => setSortBy(v)}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="date">Due Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
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
        ) : (() => {
          const filteredRents = rents?.filter(rent => {
            const statusInfo = getStatusInfo(rent);
            const matchesSearch = searchQuery === '' || 
              rent.guest?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesMonth = monthFilter === '' || 
              format(new Date(rent.month), 'yyyy-MM') === monthFilter;
            const matchesStatus = statusFilter === 'all' || 
              (statusFilter === 'paid' && rent.status === 'paid') ||
              (statusFilter === 'pending' && rent.status === 'pending' && statusInfo.status !== 'overdue') ||
              (statusFilter === 'overdue' && statusInfo.status === 'overdue');
            return matchesSearch && matchesMonth && matchesStatus;
          }).sort((a, b) => {
            if (sortBy === 'amount') return b.amount - a.amount;
            if (sortBy === 'name') return (a.guest?.full_name || '').localeCompare(b.guest?.full_name || '');
            return 0; // date is default from query
          });

          if (filteredRents?.length === 0) {
            return (
              <Card className="premium-card">
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {rents?.length === 0 ? 'No rent entries yet' : 'No matching entries'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {rents?.length === 0 ? 'Add your first rent entry to start tracking' : 'Try adjusting your filters'}
                  </p>
                  {rents?.length === 0 && (
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-foreground text-background hover:bg-foreground/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rent Entry
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="space-y-3">
              {filteredRents?.map((rent) => {
              const statusInfo = getStatusInfo(rent);
              return (
                <Card 
                  key={rent.id} 
                  className={`premium-card ${
                    statusInfo.status === 'overdue' ? 'border-destructive/30' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          statusInfo.status === 'overdue' ? 'bg-destructive/10' : 'bg-secondary'
                        }`}>
                          <User className={`w-5 h-5 ${
                            statusInfo.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{rent.guest?.full_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(rent.month), 'MMMM yyyy')}</span>
                            {rent.due_date && rent.status === 'pending' && (
                              <>
                                <span>•</span>
                                <span className={statusInfo.status === 'overdue' ? 'text-destructive font-medium' : ''}>
                                  Due: {format(new Date(rent.due_date), 'dd MMM')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">₹{rent.amount.toLocaleString()}</p>
                          <Badge 
                            variant={statusInfo.variant}
                            className={
                              statusInfo.status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              statusInfo.status === 'due-today' || statusInfo.status === 'due-soon' ? 'bg-warning/10 text-warning border-warning/20' :
                              ''
                            }
                          >
                            {statusInfo.status === 'paid' ? (
                              <><Check className="w-3 h-3 mr-1" /> Paid</>
                            ) : statusInfo.status === 'overdue' ? (
                              <><AlertTriangle className="w-3 h-3 mr-1" /> {statusInfo.label}</>
                            ) : (
                              <><Clock className="w-3 h-3 mr-1" /> {statusInfo.label}</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {rent.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                            onClick={async () => {
                                if (pg && rent.guest) {
                                  await generateRentReceipt({
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
              );
            })}
            </div>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
