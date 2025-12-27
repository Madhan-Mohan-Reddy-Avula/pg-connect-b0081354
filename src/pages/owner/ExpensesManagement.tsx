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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Receipt, Edit2, Trash2, IndianRupee, Calendar, TrendingDown, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '@/components/ui/image-upload';

interface Expense {
  id: string;
  pg_id: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  expense_month: string;
  receipt_url?: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'wifi', label: 'WiFi/Internet' },
  { value: 'gas', label: 'Gas' },
  { value: 'security', label: 'Security' },
  { value: 'staff', label: 'Staff Salary' },
  { value: 'other', label: 'Other' },
];

export default function ExpensesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: 0,
    category: 'other',
    expense_month: format(new Date(), 'yyyy-MM'),
  });

  // Fetch owner's PG
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

  // Fetch expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', pg?.id, filterMonth],
    queryFn: async () => {
      const startDate = `${filterMonth}-01`;
      const endDate = `${filterMonth}-31`;
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('pg_id', pg!.id)
        .gte('expense_month', startDate)
        .lte('expense_month', endDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!pg?.id,
  });

  // Add expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (data: typeof formData & { receipt_url: string | null }) => {
      const { error } = await supabase.from('expenses').insert({
        pg_id: pg!.id,
        title: data.title,
        description: data.description || null,
        amount: data.amount,
        category: data.category,
        expense_month: `${data.expense_month}-01`,
        receipt_url: data.receipt_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsDialogOpen(false);
      resetForm();
      setReceiptImage(null);
      toast({ title: 'Expense added', description: 'Expense recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async (data: { id: string; receipt_url: string | null } & typeof formData) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          title: data.title,
          description: data.description || null,
          amount: data.amount,
          category: data.category,
          expense_month: `${data.expense_month}-01`,
          receipt_url: data.receipt_url,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsDialogOpen(false);
      setEditingExpense(null);
      resetForm();
      setReceiptImage(null);
      toast({ title: 'Expense updated', description: 'Expense updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense deleted', description: 'Expense removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: 0,
      category: 'other',
      expense_month: format(new Date(), 'yyyy-MM'),
    });
  };

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        title: expense.title,
        description: expense.description || '',
        amount: expense.amount,
        category: expense.category,
        expense_month: format(new Date(expense.expense_month), 'yyyy-MM'),
      });
      setReceiptImage(expense.receipt_url || null);
    } else {
      setEditingExpense(null);
      resetForm();
      setReceiptImage(null);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, ...formData, receipt_url: receiptImage });
    } else {
      addExpenseMutation.mutate({ ...formData, receipt_url: receiptImage });
    }
  };

  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const expensesByCategory = expenses?.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>) || {};

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
            <h1 className="text-2xl font-bold">Expenses Management</h1>
            <p className="text-muted-foreground">Track and manage monthly expenses</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Electricity Bill"
                    className="bg-secondary/50 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="bg-secondary/50 border-border">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_month">Month</Label>
                  <Input
                    id="expense_month"
                    type="month"
                    value={formData.expense_month}
                    onChange={(e) => setFormData({ ...formData, expense_month: e.target.value })}
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
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional details..."
                    className="bg-secondary/50 border-border"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Receipt Image (Optional)
                  </Label>
                  <ImageUpload
                    bucket="expense-receipts"
                    folder={user?.id || 'unknown'}
                    value={receiptImage || undefined}
                    onChange={setReceiptImage}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setIsDialogOpen(false); setReceiptImage(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-foreground text-background hover:bg-foreground/90" disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}>
                    {editingExpense ? 'Update' : 'Add Expense'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-3">
          <Label className="text-muted-foreground">Filter by month:</Label>
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-48 bg-secondary/50 border-border"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold">{expenses?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card sm:col-span-2">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-3">Top Categories</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(expensesByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([cat, amount]) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat}: ₹{amount.toLocaleString()}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expense List */}
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
        ) : expenses?.length === 0 ? (
          <Card className="premium-card">
            <CardContent className="py-12 text-center">
              <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No expenses for {format(new Date(`${filterMonth}-01`), 'MMMM yyyy')}</h3>
              <p className="text-muted-foreground mb-4">Add your first expense to start tracking</p>
              <Button onClick={() => handleOpenDialog()} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {expenses?.map((expense) => (
              <Card key={expense.id} className="premium-card">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{expense.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                          </Badge>
                          <span>•</span>
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(expense.expense_month), 'MMMM yyyy')}</span>
                        </div>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground mt-1">{expense.description}</p>
                        )}
                        {expense.receipt_url && (
                          <a 
                            href={expense.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <ImageIcon className="w-3 h-3" />
                            View Receipt
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold">₹{expense.amount.toLocaleString()}</p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(expense)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => deleteExpenseMutation.mutate(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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