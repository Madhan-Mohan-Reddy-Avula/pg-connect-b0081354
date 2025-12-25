import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, User, Edit2, Trash2, Users, BedDouble, Phone, Mail } from 'lucide-react';

interface Guest {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  bed_id: string | null;
  monthly_rent: number;
  status: string;
  check_in_date: string | null;
  emergency_contact: string | null;
}

interface Bed {
  id: string;
  bed_number: string;
  is_occupied: boolean;
  room: { room_number: string };
}

export default function GuestsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    bed_id: '',
    monthly_rent: 0,
    emergency_contact: '',
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

  // Fetch guests
  const { data: guests, isLoading } = useQuery({
    queryKey: ['guests', pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('pg_id', pg!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Guest[];
    },
    enabled: !!pg?.id,
  });

  // Fetch available beds
  const { data: beds } = useQuery({
    queryKey: ['available-beds', pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beds')
        .select('*, room:rooms(room_number)')
        .eq('rooms.pg_id', pg!.id);
      
      if (error) throw error;
      return data as unknown as Bed[];
    },
    enabled: !!pg?.id,
  });

  // Add guest mutation
  const addGuestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Create a temporary user for the guest (in real app, guest would sign up)
      const guestUserId = user!.id; // Using owner's ID temporarily for demo

      const { data: guest, error } = await supabase
        .from('guests')
        .insert({
          pg_id: pg!.id,
          user_id: guestUserId,
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || null,
          bed_id: data.bed_id || null,
          monthly_rent: data.monthly_rent,
          emergency_contact: data.emergency_contact || null,
          check_in_date: new Date().toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Update bed occupancy if assigned
      if (data.bed_id) {
        await supabase.from('beds').update({ is_occupied: true }).eq('id', data.bed_id);
      }

      return guest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['available-beds'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Guest added', description: 'Guest has been added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update guest mutation
  const updateGuestMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string; oldBedId: string | null }) => {
      const { error } = await supabase
        .from('guests')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || null,
          bed_id: data.bed_id || null,
          monthly_rent: data.monthly_rent,
          emergency_contact: data.emergency_contact || null,
        })
        .eq('id', data.id);

      if (error) throw error;

      // Update bed occupancy
      if (data.oldBedId && data.oldBedId !== data.bed_id) {
        await supabase.from('beds').update({ is_occupied: false }).eq('id', data.oldBedId);
      }
      if (data.bed_id && data.bed_id !== data.oldBedId) {
        await supabase.from('beds').update({ is_occupied: true }).eq('id', data.bed_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['available-beds'] });
      setIsDialogOpen(false);
      setEditingGuest(null);
      resetForm();
      toast({ title: 'Guest updated', description: 'Guest details updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete guest mutation
  const deleteGuestMutation = useMutation({
    mutationFn: async (guest: Guest) => {
      const { error } = await supabase.from('guests').delete().eq('id', guest.id);
      if (error) throw error;

      if (guest.bed_id) {
        await supabase.from('beds').update({ is_occupied: false }).eq('id', guest.bed_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['available-beds'] });
      toast({ title: 'Guest removed', description: 'Guest has been removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Mark as vacated mutation
  const vacateMutation = useMutation({
    mutationFn: async (guest: Guest) => {
      const { error } = await supabase
        .from('guests')
        .update({
          status: 'vacated',
          vacate_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', guest.id);

      if (error) throw error;

      if (guest.bed_id) {
        await supabase.from('beds').update({ is_occupied: false }).eq('id', guest.bed_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['available-beds'] });
      toast({ title: 'Guest vacated', description: 'Guest marked as vacated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      bed_id: '',
      monthly_rent: 0,
      emergency_contact: '',
    });
  };

  const handleOpenDialog = (guest?: Guest) => {
    if (guest) {
      setEditingGuest(guest);
      setFormData({
        full_name: guest.full_name,
        phone: guest.phone,
        email: guest.email || '',
        bed_id: guest.bed_id || '',
        monthly_rent: guest.monthly_rent,
        emergency_contact: guest.emergency_contact || '',
      });
    } else {
      setEditingGuest(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGuest) {
      updateGuestMutation.mutate({ ...formData, id: editingGuest.id, oldBedId: editingGuest.bed_id });
    } else {
      addGuestMutation.mutate(formData);
    }
  };

  const getAvailableBeds = () => {
    if (!beds) return [];
    return beds.filter(bed => !bed.is_occupied || bed.id === editingGuest?.bed_id);
  };

  const getBedDisplay = (bedId: string | null) => {
    if (!bedId || !beds) return 'Not assigned';
    const bed = beds.find(b => b.id === bedId);
    return bed ? `Room ${bed.room?.room_number} - ${bed.bed_number}` : 'Not assigned';
  };

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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Guest Management</h1>
            <p className="text-muted-foreground">Manage guests, assign beds, and set rent</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGuest ? 'Edit Guest' : 'Add New Guest'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bed_id">Assign Bed</Label>
                  <Select
                    value={formData.bed_id}
                    onValueChange={(value) => setFormData({ ...formData, bed_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bed" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableBeds().map((bed) => (
                        <SelectItem key={bed.id} value={bed.id}>
                          Room {bed.room?.room_number} - {bed.bed_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent (₹)</Label>
                  <Input
                    id="monthly_rent"
                    type="number"
                    min={0}
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency Contact (Optional)</Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    placeholder="Emergency contact number"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={addGuestMutation.isPending || updateGuestMutation.isPending}>
                    {editingGuest ? 'Update' : 'Add Guest'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : guests?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No guests yet</h3>
              <p className="text-muted-foreground mb-4">Add your first guest to get started</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guests?.map((guest) => (
              <Card key={guest.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{guest.full_name}</CardTitle>
                        <Badge variant={guest.status === 'active' ? 'default' : 'secondary'}>
                          {guest.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(guest)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteGuestMutation.mutate(guest)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{guest.phone}</span>
                  </div>
                  {guest.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{guest.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BedDouble className="w-4 h-4" />
                    <span>{getBedDisplay(guest.bed_id)}</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">₹{guest.monthly_rent}/mo</span>
                    {guest.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => vacateMutation.mutate(guest)}
                      >
                        Mark Vacated
                      </Button>
                    )}
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
