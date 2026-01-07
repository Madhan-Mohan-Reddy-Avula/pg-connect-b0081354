import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BedDouble, Users, Calendar, ArrowRight, History, LogOut, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Room {
  id: string;
  room_number: string;
  floor: string | null;
  beds_count: number;
  pg_id: string;
  image_url?: string | null;
  images?: string[];
  beds?: { id: string; bed_number: string; is_occupied: boolean }[];
}

interface RoomDetailDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GuestInfo {
  id: string;
  full_name: string;
  phone: string;
  status: string;
  check_in_date: string | null;
  vacate_date: string | null;
  bed_id: string | null;
  bed_number?: string;
}

interface BedHistoryEntry {
  id: string;
  bed_id: string;
  guest_id: string;
  assigned_date: string;
  vacated_date: string | null;
  guest: {
    id: string;
    full_name: string;
    phone: string;
    status: string;
  };
  bed: {
    bed_number: string;
  };
}

export function RoomDetailDialog({ room, open, onOpenChange }: RoomDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [vacateConfirmOpen, setVacateConfirmOpen] = useState(false);
  const [selectedGuestForVacate, setSelectedGuestForVacate] = useState<GuestInfo | null>(null);
  const [rejoinDialogOpen, setRejoinDialogOpen] = useState(false);
  const [selectedGuestForRejoin, setSelectedGuestForRejoin] = useState<BedHistoryEntry | null>(null);
  const [rejoinBedId, setRejoinBedId] = useState('');

  // Vacate mutation
  const vacateMutation = useMutation({
    mutationFn: async (guest: GuestInfo) => {
      const vacateDate = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('guests')
        .update({
          status: 'vacated',
          vacate_date: vacateDate,
          bed_id: null,
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
      queryClient.invalidateQueries({ queryKey: ['room-current-guests'] });
      queryClient.invalidateQueries({ queryKey: ['room-bed-history'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['all-beds'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Guest vacated', description: 'Guest has been vacated from this room' });
      setVacateConfirmOpen(false);
      setSelectedGuestForVacate(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Rejoin mutation
  const rejoinMutation = useMutation({
    mutationFn: async ({ guestId, bedId }: { guestId: string; bedId: string }) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Update guest status to active and assign new bed
      const { error } = await supabase
        .from('guests')
        .update({
          status: 'active',
          vacate_date: null,
          bed_id: bedId,
          check_in_date: today,
        })
        .eq('id', guestId);

      if (error) throw error;

      // Mark bed as occupied
      await supabase.from('beds').update({ is_occupied: true }).eq('id', bedId);
      
      // Get pg_id from room
      const pgId = room?.pg_id;
      if (pgId) {
        // Add new bed history entry
        await supabase.from('bed_history').insert({
          bed_id: bedId,
          guest_id: guestId,
          pg_id: pgId,
          assigned_date: today,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-current-guests'] });
      queryClient.invalidateQueries({ queryKey: ['room-bed-history'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['all-beds'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Guest rejoined', description: 'Guest has been reactivated and assigned to a bed' });
      setRejoinDialogOpen(false);
      setSelectedGuestForRejoin(null);
      setRejoinBedId('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleVacateClick = (guest: GuestInfo) => {
    setSelectedGuestForVacate(guest);
    setVacateConfirmOpen(true);
  };

  const confirmVacate = () => {
    if (selectedGuestForVacate) {
      vacateMutation.mutate(selectedGuestForVacate);
    }
  };

  const handleRejoinClick = (entry: BedHistoryEntry) => {
    setSelectedGuestForRejoin(entry);
    setRejoinBedId('');
    setRejoinDialogOpen(true);
  };

  const confirmRejoin = () => {
    if (selectedGuestForRejoin && rejoinBedId) {
      rejoinMutation.mutate({ guestId: selectedGuestForRejoin.guest.id, bedId: rejoinBedId });
    }
  };

  const getAvailableBeds = () => {
    if (!room?.beds) return [];
    return room.beds.filter(bed => !bed.is_occupied);
  };

  // Fetch current guests in this room
  const { data: currentGuests, isLoading: loadingGuests } = useQuery({
    queryKey: ['room-current-guests', room?.id],
    queryFn: async () => {
      if (!room?.beds?.length) return [];
      
      const bedIds = room.beds.map(b => b.id);
      const { data, error } = await supabase
        .from('guests')
        .select('*, bed:beds(bed_number)')
        .in('bed_id', bedIds)
        .eq('status', 'active');
      
      if (error) throw error;
      return (data || []).map(g => ({
        ...g,
        bed_number: g.bed?.bed_number
      })) as GuestInfo[];
    },
    enabled: open && !!room?.beds?.length,
  });

  // Fetch bed history for this room (all assignments; we filter out current occupants in the UI)
  const { data: bedHistoryAll, isLoading: loadingHistory } = useQuery({
    queryKey: ['room-bed-history', room?.id],
    queryFn: async () => {
      if (!room?.beds?.length) return [];

      const bedIds = room.beds.map((b) => b.id);
      const { data, error } = await supabase
        .from('bed_history')
        .select('*, guest:guests(id, full_name, phone, status), bed:beds(bed_number)')
        .in('bed_id', bedIds)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      return (data || []) as BedHistoryEntry[];
    },
    enabled: open && !!room?.beds?.length,
  });

  if (!room) return null;

  const currentGuestByBedId = new Map<string, string>();
  (currentGuests || []).forEach((g) => {
    if (g.bed_id) currentGuestByBedId.set(g.bed_id, g.id);
  });

  // History = everything except the current occupant's open-ended assignment record
  const bedHistory = (bedHistoryAll || []).filter((entry) => {
    const currentGuestId = currentGuestByBedId.get(entry.bed_id);
    return !(currentGuestId && entry.guest_id === currentGuestId && entry.vacated_date == null);
  });

  const occupiedBeds = room.beds?.filter((b) => b.is_occupied).length || 0;
  const totalBeds = room.beds?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-primary" />
            Room {room.room_number}
            {room.floor && <span className="text-muted-foreground font-normal text-sm">• {room.floor} Floor</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Room Image */}
          {(room.images?.length || room.image_url) && (
            <div className="aspect-video w-full rounded-lg overflow-hidden">
              <img 
                src={room.images?.[0] || room.image_url || ''} 
                alt={`Room ${room.room_number}`} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          {/* Bed Status */}
          <Card className="bg-secondary/30 border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Beds Status</span>
                <span className="text-sm font-medium">{occupiedBeds} / {totalBeds} occupied</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {room.beds?.map((bed) => (
                  <Badge
                    key={bed.id}
                    variant={bed.is_occupied ? 'default' : 'secondary'}
                    className={bed.is_occupied ? 'bg-primary/10 text-primary border-primary/20' : ''}
                  >
                    {bed.bed_number}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Guests */}
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              Current Guests
            </h3>
            {loadingGuests ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : currentGuests?.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                No guests currently in this room
              </div>
            ) : (
              <div className="space-y-2">
                  {currentGuests?.map((guest) => (
                    <Card key={guest.id} className="bg-secondary/30 border-border/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{guest.full_name}</p>
                            <p className="text-sm text-muted-foreground">{guest.phone}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              {guest.bed_number}
                            </Badge>
                            {guest.check_in_date && (
                              <p className="text-xs text-muted-foreground">
                                Since {format(new Date(guest.check_in_date), 'dd MMM yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleVacateClick(guest)}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Vacate Guest
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Guest History */}
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              Guest History
            </h3>
            {loadingHistory ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : bedHistory?.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                No guest history for this room
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-2">
                  {bedHistory?.map((entry) => (
                    <Card key={entry.id} className="bg-muted/30 border-border/20">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{entry.guest?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{entry.guest?.phone}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {entry.bed?.bed_number}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(entry.assigned_date), 'dd MMM yyyy')}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>
                            {entry.vacated_date 
                              ? format(new Date(entry.vacated_date), 'dd MMM yyyy')
                              : 'Not set'
                            }
                          </span>
                        </div>
                        {entry.guest?.status === 'vacated' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 text-green-600 border-green-600/30 hover:bg-green-500/10"
                            onClick={() => handleRejoinClick(entry)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Rejoin Guest
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Vacate Confirmation Dialog */}
      <ConfirmationDialog
        open={vacateConfirmOpen}
        onOpenChange={setVacateConfirmOpen}
        title="Vacate Guest"
        description={`Are you sure you want to vacate ${selectedGuestForVacate?.full_name}? This will free their bed and mark them as vacated.`}
        confirmText="Vacate"
        cancelText="Cancel"
        onConfirm={confirmVacate}
        variant="destructive"
      />

      {/* Rejoin Guest Dialog */}
      <Dialog open={rejoinDialogOpen} onOpenChange={setRejoinDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Rejoin Guest
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rejoin <span className="font-medium text-foreground">{selectedGuestForRejoin?.guest?.full_name}</span> by assigning a bed.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rejoin-bed-room">Select Bed <span className="text-destructive">*</span></Label>
              <Select
                value={rejoinBedId}
                onValueChange={setRejoinBedId}
              >
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select an available bed" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {getAvailableBeds().length === 0 ? (
                    <SelectItem value="none" disabled>No available beds in this room</SelectItem>
                  ) : (
                    getAvailableBeds().map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {bed.bed_number}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {getAvailableBeds().length === 0 && (
                <p className="text-xs text-amber-600">All beds in this room are occupied. Please vacate a bed first or use Guest Management to assign a different room.</p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => setRejoinDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
                onClick={confirmRejoin}
                disabled={!rejoinBedId || rejoinMutation.isPending}
              >
                {rejoinMutation.isPending ? 'Rejoining...' : 'Rejoin Guest'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
