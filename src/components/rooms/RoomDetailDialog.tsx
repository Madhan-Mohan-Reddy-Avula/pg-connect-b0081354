import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BedDouble, Users, Calendar, ArrowRight, History } from 'lucide-react';
import { format } from 'date-fns';

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

  // Fetch bed history for this room (only past guests who have vacated)
  const { data: bedHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['room-bed-history', room?.id],
    queryFn: async () => {
      if (!room?.beds?.length) return [];
      
      const bedIds = room.beds.map(b => b.id);
      const { data, error } = await supabase
        .from('bed_history')
        .select('*, guest:guests(id, full_name, phone, status), bed:beds(bed_number)')
        .in('bed_id', bedIds)
        .not('vacated_date', 'is', null) // Only show past guests who have vacated
        .order('assigned_date', { ascending: false });
      
      if (error) throw error;
      return data as BedHistoryEntry[];
    },
    enabled: open && !!room?.beds?.length,
  });

  if (!room) return null;

  const occupiedBeds = room.beds?.filter(b => b.is_occupied).length || 0;
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
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{guest.full_name}</p>
                        <p className="text-sm text-muted-foreground">{guest.phone}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {guest.bed_number}
                        </Badge>
                        {guest.check_in_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Since {format(new Date(guest.check_in_date), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
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
                              : 'Present'
                            }
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
