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
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, User, Edit2, Trash2, Users, BedDouble, Phone, Mail, History, Clock, FileText, Download, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: string;
  guest_id: string;
  document_type: string;
  document_url: string;
  uploaded_at: string;
}

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

interface BedHistoryEntry {
  id: string;
  bed_id: string;
  guest_id: string;
  assigned_date: string;
  vacated_date: string | null;
  guest?: { full_name: string };
  bed?: { bed_number: string; room: { room_number: string } };
}

export default function GuestsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [guestHistoryDialogOpen, setGuestHistoryDialogOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [selectedGuestForDocs, setSelectedGuestForDocs] = useState<Guest | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vacateConfirmOpen, setVacateConfirmOpen] = useState(false);
  const [selectedGuestForAction, setSelectedGuestForAction] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    bed_id: '',
    monthly_rent: 0,
    emergency_contact: '',
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

  // Fetch document counts for all guests
  const { data: guestDocumentCounts } = useQuery({
    queryKey: ['guest-document-counts', guests?.map(g => g.id)],
    queryFn: async () => {
      if (!guests || guests.length === 0) return {};
      
      const guestIds = guests.map(g => g.id);
      const { data, error } = await supabase
        .from('documents')
        .select('guest_id')
        .in('guest_id', guestIds);
      
      if (error) throw error;
      
      // Count documents per guest
      const counts: Record<string, number> = {};
      data?.forEach(doc => {
        counts[doc.guest_id] = (counts[doc.guest_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!guests && guests.length > 0,
  });

  const { data: beds } = useQuery({
    queryKey: ['all-beds', pg?.id],
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

  const { data: bedHistory } = useQuery({
    queryKey: ['bed-history', selectedBedId],
    queryFn: async () => {
      const { data: historyData, error } = await supabase
        .from('bed_history')
        .select('*')
        .eq('bed_id', selectedBedId!)
        .order('assigned_date', { ascending: false });
      if (error) throw error;
      
      // Fetch guest names manually
      const guestIds = [...new Set(historyData?.map(h => h.guest_id) || [])];
      const { data: guestData } = await supabase
        .from('guests')
        .select('id, full_name')
        .in('id', guestIds);
      
      const guestMap = new Map(guestData?.map(g => [g.id, g.full_name]) || []);
      
      return historyData?.map(h => ({
        ...h,
        guest: { full_name: guestMap.get(h.guest_id) || 'Unknown' }
      })) as BedHistoryEntry[];
    },
    enabled: !!selectedBedId,
  });

  const { data: guestHistory } = useQuery({
    queryKey: ['guest-history', selectedGuestId],
    queryFn: async () => {
      const { data: historyData, error } = await supabase
        .from('bed_history')
        .select('*')
        .eq('guest_id', selectedGuestId!)
        .order('assigned_date', { ascending: false });
      if (error) throw error;
      
      // Fetch bed info manually
      const bedIds = [...new Set(historyData?.map(h => h.bed_id) || [])];
      const { data: bedData } = await supabase
        .from('beds')
        .select('id, bed_number, room:rooms(room_number)')
        .in('id', bedIds);
      
      const bedMap = new Map(bedData?.map(b => [b.id, { bed_number: b.bed_number, room: b.room }]) || []);
      
      return historyData?.map(h => ({
        ...h,
        bed: bedMap.get(h.bed_id) || { bed_number: 'Unknown', room: { room_number: 'Unknown' } }
      })) as BedHistoryEntry[];
    },
    enabled: !!selectedGuestId,
  });

  // Fetch documents for selected guest
  const { data: guestDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['guest-documents', selectedGuestForDocs?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('guest_id', selectedGuestForDocs!.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!selectedGuestForDocs?.id,
  });

  const addGuestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        pg_id: pg!.id,
        // user_id is optional until the guest creates an account
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        bed_id: data.bed_id || null,
        monthly_rent: data.monthly_rent,
        emergency_contact: data.emergency_contact || null,
        check_in_date: new Date().toISOString().split('T')[0],
        status: 'active',
      } as any;

      const { data: guest, error } = await supabase
        .from('guests')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      if (data.bed_id) {
        // Update bed to occupied
        await supabase.from('beds').update({ is_occupied: true }).eq('id', data.bed_id);
        
        // Add to bed history
        await supabase.from('bed_history').insert({
          bed_id: data.bed_id,
          guest_id: guest.id,
          pg_id: pg!.id,
          assigned_date: new Date().toISOString().split('T')[0],
        });
      }

      return guest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['all-beds'] });
      queryClient.invalidateQueries({ queryKey: ['bed-history'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Guest added', description: 'Guest has been added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

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

      // Handle bed change
      if (data.oldBedId && data.oldBedId !== data.bed_id) {
        // Free old bed
        await supabase.from('beds').update({ is_occupied: false }).eq('id', data.oldBedId);
        
        // Close old history entry
        await supabase
          .from('bed_history')
          .update({ vacated_date: new Date().toISOString().split('T')[0] })
          .eq('guest_id', data.id)
          .eq('bed_id', data.oldBedId)
          .is('vacated_date', null);
      }
      
      if (data.bed_id && data.bed_id !== data.oldBedId) {
        // Occupy new bed
        await supabase.from('beds').update({ is_occupied: true }).eq('id', data.bed_id);
        
        // Add new history entry
        await supabase.from('bed_history').insert({
          bed_id: data.bed_id,
          guest_id: data.id,
          pg_id: pg!.id,
          assigned_date: new Date().toISOString().split('T')[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['all-beds'] });
      queryClient.invalidateQueries({ queryKey: ['bed-history'] });
      queryClient.invalidateQueries({ queryKey: ['guest-history'] });
      setIsDialogOpen(false);
      setEditingGuest(null);
      resetForm();
      toast({ title: 'Guest updated', description: 'Guest details updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (guest: Guest) => {
      // Close any open history entry
      if (guest.bed_id) {
        await supabase
          .from('bed_history')
          .update({ vacated_date: new Date().toISOString().split('T')[0] })
          .eq('guest_id', guest.id)
          .is('vacated_date', null);
          
        await supabase.from('beds').update({ is_occupied: false }).eq('id', guest.bed_id);
      }
      
      const { error } = await supabase.from('guests').delete().eq('id', guest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['all-beds'] });
      queryClient.invalidateQueries({ queryKey: ['bed-history'] });
      toast({ title: 'Guest removed', description: 'Guest has been removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const vacateMutation = useMutation({
    mutationFn: async (guest: Guest) => {
      const vacateDate = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('guests')
        .update({
          status: 'vacated',
          vacate_date: vacateDate,
          bed_id: null, // Clear bed assignment
        })
        .eq('id', guest.id);

      if (error) throw error;

      if (guest.bed_id) {
        // Free bed
        await supabase.from('beds').update({ is_occupied: false }).eq('id', guest.bed_id);
        
        // Close history entry
        await supabase
          .from('bed_history')
          .update({ vacated_date: vacateDate })
          .eq('guest_id', guest.id)
          .eq('bed_id', guest.bed_id)
          .is('vacated_date', null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['all-beds'] });
      queryClient.invalidateQueries({ queryKey: ['bed-history'] });
      queryClient.invalidateQueries({ queryKey: ['guest-history'] });
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

  const openBedHistory = (bedId: string) => {
    setSelectedBedId(bedId);
    setHistoryDialogOpen(true);
  };

  const openGuestHistory = (guestId: string) => {
    setSelectedGuestId(guestId);
    setGuestHistoryDialogOpen(true);
  };

  const openGuestDocuments = (guest: Guest) => {
    setSelectedGuestForDocs(guest);
    setDocumentsDialogOpen(true);
  };

  const getFilePath = (url: string): string => {
    // Extract file path from full URL for storage operations
    const match = url.match(/\/documents\/(.+)$/);
    return match ? match[1] : url;
  };

  const handleViewDocument = async (documentUrl: string) => {
    try {
      const filePath = getFilePath(documentUrl);
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({ 
        title: 'Error viewing document', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const handleDownloadDocument = async (documentUrl: string, documentType: string) => {
    try {
      const filePath = getFilePath(documentUrl);
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);
      
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}.${filePath.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Download started', description: `${documentType} is downloading` });
    } catch (error: any) {
      toast({ 
        title: 'Error downloading document', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteClick = (guest: Guest) => {
    setSelectedGuestForAction(guest);
    setDeleteConfirmOpen(true);
  };

  const handleVacateClick = (guest: Guest) => {
    setSelectedGuestForAction(guest);
    setVacateConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (selectedGuestForAction) {
      deleteGuestMutation.mutate(selectedGuestForAction);
    }
    setDeleteConfirmOpen(false);
    setSelectedGuestForAction(null);
  };

  const confirmVacate = () => {
    if (selectedGuestForAction) {
      vacateMutation.mutate(selectedGuestForAction);
    }
    setVacateConfirmOpen(false);
    setSelectedGuestForAction(null);
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
      <div className="space-y-6 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Guest Management</h1>
            <p className="text-muted-foreground">Manage guests, assign beds, and set rent</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card border-border">
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
                    className="bg-secondary/50 border-border"
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
                      className="bg-secondary/50 border-border"
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
                      className="bg-secondary/50 border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bed_id">Assign Bed</Label>
                  <Select
                    value={formData.bed_id}
                    onValueChange={(value) => setFormData({ ...formData, bed_id: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border">
                      <SelectValue placeholder="Select a bed" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
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
                    className="bg-secondary/50 border-border"
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
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-foreground text-background hover:bg-foreground/90" disabled={addGuestMutation.isPending || updateGuestMutation.isPending}>
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
          <Card className="premium-card">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No guests yet</h3>
              <p className="text-muted-foreground mb-4">Add your first guest to get started</p>
              <Button onClick={() => handleOpenDialog()} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guests?.map((guest) => (
              <Card key={guest.id} className="premium-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{guest.full_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={guest.status === 'active' ? 'default' : 'secondary'}>
                            {guest.status}
                          </Badge>
                          {guestDocumentCounts && guestDocumentCounts[guest.id] > 0 ? (
                            <Badge variant="outline" className="text-green-600 border-green-600/50 bg-green-500/10">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              ID Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-600/50 bg-amber-500/10">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No ID
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openGuestDocuments(guest)}
                        title="View ID proofs"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openGuestHistory(guest.id)}
                        title="View bed history"
                      >
                        <History className="w-4 h-4" />
                      </Button>
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
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDeleteClick(guest)}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BedDouble className="w-4 h-4" />
                      <span>{getBedDisplay(guest.bed_id)}</span>
                    </div>
                    {guest.bed_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => openBedHistory(guest.bed_id!)}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Bed History
                      </Button>
                    )}
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-lg font-bold">₹{guest.monthly_rent}/mo</span>
                    {guest.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVacateClick(guest)}
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

      {/* Bed History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Bed History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {bedHistory?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No history for this bed</p>
            ) : (
              bedHistory?.map((entry) => (
                <div key={entry.id} className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.guest?.full_name || 'Unknown'}</span>
                    <Badge variant={entry.vacated_date ? 'secondary' : 'default'}>
                      {entry.vacated_date ? 'Vacated' : 'Current'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(entry.assigned_date), 'dd MMM yyyy')}
                    {entry.vacated_date && ` → ${format(new Date(entry.vacated_date), 'dd MMM yyyy')}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Bed History Dialog */}
      <Dialog open={guestHistoryDialogOpen} onOpenChange={setGuestHistoryDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Guest's Bed History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {guestHistory?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No bed history for this guest</p>
            ) : (
              guestHistory?.map((entry) => (
                <div key={entry.id} className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Room {entry.bed?.room?.room_number} - {entry.bed?.bed_number}
                    </span>
                    <Badge variant={entry.vacated_date ? 'secondary' : 'default'}>
                      {entry.vacated_date ? 'Past' : 'Current'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(entry.assigned_date), 'dd MMM yyyy')}
                    {entry.vacated_date && ` → ${format(new Date(entry.vacated_date), 'dd MMM yyyy')}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Documents Dialog */}
      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              ID Proofs - {selectedGuestForDocs?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {documentsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : guestDocuments?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No ID proofs uploaded</p>
            ) : (
              guestDocuments?.map((doc) => (
                <div key={doc.id} className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium capitalize">{doc.document_type.replace('_', ' ')}</span>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {format(new Date(doc.uploaded_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewDocument(doc.document_url)}
                        title="View document"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadDocument(doc.document_url, doc.document_type)}
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Guest"
        description={`Are you sure you want to delete ${selectedGuestForAction?.full_name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      {/* Vacate Confirmation Dialog */}
      <ConfirmationDialog
        open={vacateConfirmOpen}
        onOpenChange={setVacateConfirmOpen}
        title="Mark Guest as Vacated"
        description={`Are you sure you want to mark ${selectedGuestForAction?.full_name} as vacated? This will free up their assigned bed.`}
        confirmText="Mark Vacated"
        cancelText="Cancel"
        onConfirm={confirmVacate}
      />
    </DashboardLayout>
  );
}
