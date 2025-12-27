import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BedDouble, User, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Bed {
  id: string;
  bed_number: string;
  is_occupied: boolean;
  room_id: string;
  room?: {
    room_number: string;
    floor: string | null;
  };
  guest?: {
    id: string;
    full_name: string;
  } | null;
}

interface Guest {
  id: string;
  full_name: string;
  bed_id: string | null;
}

interface BedOccupancyWidgetProps {
  pgId: string;
}

export default function BedOccupancyWidget({ pgId }: BedOccupancyWidgetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState('');

  const { data: beds, isLoading } = useQuery({
    queryKey: ['bed-occupancy', pgId],
    queryFn: async () => {
      // First get all beds with room info
      const { data: bedsData, error: bedsError } = await supabase
        .from('beds')
        .select('id, bed_number, is_occupied, room_id, rooms!inner(room_number, floor, pg_id)')
        .eq('rooms.pg_id', pgId);

      if (bedsError) throw bedsError;

      // Then get guests to match with beds
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('id, full_name, bed_id')
        .eq('pg_id', pgId)
        .eq('status', 'active')
        .not('bed_id', 'is', null);

      if (guestsError) throw guestsError;

      // Manually join guests to beds
      const bedsWithGuests = bedsData?.map(bed => ({
        ...bed,
        room: bed.rooms,
        guest: guestsData?.find(g => g.bed_id === bed.id) || null
      })) || [];

      return bedsWithGuests as Bed[];
    },
    enabled: !!pgId,
  });

  const { data: unassignedGuests } = useQuery({
    queryKey: ['unassigned-guests', pgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('id, full_name, bed_id')
        .eq('pg_id', pgId)
        .eq('status', 'active')
        .is('bed_id', null);

      if (error) throw error;
      return data as Guest[];
    },
    enabled: !!pgId,
  });

  const assignBedMutation = useMutation({
    mutationFn: async ({ bedId, guestId }: { bedId: string; guestId: string }) => {
      // Update guest with new bed
      const { error: guestError } = await supabase
        .from('guests')
        .update({ bed_id: bedId })
        .eq('id', guestId);

      if (guestError) throw guestError;

      // Update bed occupancy status
      const { error: bedError } = await supabase
        .from('beds')
        .update({ is_occupied: true })
        .eq('id', bedId);

      if (bedError) throw bedError;

      // Add bed history entry
      const { data: guestData } = await supabase
        .from('guests')
        .select('pg_id')
        .eq('id', guestId)
        .single();

      if (guestData) {
        await supabase.from('bed_history').insert({
          bed_id: bedId,
          guest_id: guestId,
          pg_id: guestData.pg_id,
          assigned_date: new Date().toISOString().split('T')[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bed-occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-guests'] });
      setAssignDialogOpen(false);
      setSelectedBed(null);
      setSelectedGuestId('');
      toast({ title: 'Bed assigned', description: 'Guest has been assigned to the bed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const vacantBeds = beds?.filter(b => !b.is_occupied) || [];
  const occupiedBeds = beds?.filter(b => b.is_occupied) || [];
  const totalBeds = beds?.length || 0;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds.length / totalBeds) * 100) : 0;

  const handleAssignClick = (bed: Bed) => {
    setSelectedBed(bed);
    setSelectedGuestId('');
    setAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (selectedBed && selectedGuestId) {
      assignBedMutation.mutate({ bedId: selectedBed.id, guestId: selectedGuestId });
    }
  };

  if (isLoading) {
    return (
      <Card className="premium-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="premium-card border-border/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-primary" />
            Bed Occupancy
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-primary">
            <Link to="/owner/rooms" className="flex items-center gap-1">
              Manage <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Occupancy Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Occupancy Rate</span>
              <span className="font-semibold">{occupancyRate}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{occupiedBeds.length} occupied</span>
              <span>{vacantBeds.length} vacant</span>
            </div>
          </div>

          {/* Vacant Beds Quick Actions */}
          {vacantBeds.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Vacant Beds</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {vacantBeds.slice(0, 6).map((bed) => (
                  <Button
                    key={bed.id}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-auto py-2 border-dashed border-primary/30 hover:bg-primary/5 hover:border-primary"
                    onClick={() => handleAssignClick(bed)}
                    disabled={!unassignedGuests?.length}
                  >
                    <BedDouble className="w-3 h-3 mr-1 text-primary" />
                    <span className="truncate">
                      R{bed.room?.room_number}-{bed.bed_number}
                    </span>
                  </Button>
                ))}
              </div>
              {vacantBeds.length > 6 && (
                <Button variant="ghost" size="sm" asChild className="w-full text-xs">
                  <Link to="/owner/rooms">+{vacantBeds.length - 6} more vacant beds</Link>
                </Button>
              )}
              {!unassignedGuests?.length && vacantBeds.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  No unassigned guests to place
                </p>
              )}
            </div>
          )}

          {vacantBeds.length === 0 && (
            <div className="text-center py-4">
              <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                <Check className="w-3 h-3 mr-1" />
                All beds occupied
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Bed Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Assign Guest to Bed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBed && (
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Assigning to</p>
                <p className="font-medium">
                  Room {selectedBed.room?.room_number} - Bed {selectedBed.bed_number}
                  {selectedBed.room?.floor && ` (${selectedBed.room.floor})`}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="guest">Select Guest</Label>
              <Select value={selectedGuestId} onValueChange={setSelectedGuestId}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Choose a guest to assign" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {unassignedGuests?.map((guest) => (
                    <SelectItem key={guest.id} value={guest.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {guest.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-foreground text-background hover:bg-foreground/90"
                onClick={handleAssign}
                disabled={!selectedGuestId || assignBedMutation.isPending}
              >
                Assign Bed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
