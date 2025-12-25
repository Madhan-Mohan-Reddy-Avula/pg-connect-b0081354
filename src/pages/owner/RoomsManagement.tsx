import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, BedDouble, Edit2, Trash2, DoorOpen } from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  floor: string | null;
  beds_count: number;
  pg_id: string;
  beds?: { id: string; bed_number: string; is_occupied: boolean }[];
}

export default function RoomsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    room_number: '',
    floor: '',
    beds_count: 1,
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

  // Fetch rooms with beds
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, beds(*)')
        .eq('pg_id', pg!.id)
        .order('room_number');
      if (error) throw error;
      return data as Room[];
    },
    enabled: !!pg?.id,
  });

  // Add room mutation
  const addRoomMutation = useMutation({
    mutationFn: async (data: { room_number: string; floor: string; beds_count: number }) => {
      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          pg_id: pg!.id,
          room_number: data.room_number,
          floor: data.floor || null,
          beds_count: data.beds_count,
        })
        .select()
        .single();
      
      if (roomError) throw roomError;

      // Auto-generate beds
      const beds = Array.from({ length: data.beds_count }, (_, i) => ({
        room_id: room.id,
        bed_number: `Bed ${i + 1}`,
      }));

      const { error: bedsError } = await supabase.from('beds').insert(beds);
      if (bedsError) throw bedsError;

      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Room added', description: 'Room and beds created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update room mutation
  const updateRoomMutation = useMutation({
    mutationFn: async (data: { id: string; room_number: string; floor: string; beds_count: number }) => {
      const { error } = await supabase
        .from('rooms')
        .update({
          room_number: data.room_number,
          floor: data.floor || null,
          beds_count: data.beds_count,
        })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsDialogOpen(false);
      setEditingRoom(null);
      resetForm();
      toast({ title: 'Room updated', description: 'Room details updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete room mutation
  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room deleted', description: 'Room and all beds removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ room_number: '', floor: '', beds_count: 1 });
  };

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        room_number: room.room_number,
        floor: room.floor || '',
        beds_count: room.beds_count,
      });
    } else {
      setEditingRoom(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, ...formData });
    } else {
      addRoomMutation.mutate(formData);
    }
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
            <h1 className="text-2xl font-bold">Rooms Management</h1>
            <p className="text-muted-foreground">Manage rooms and beds in your PG</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room_number">Room Number</Label>
                  <Input
                    id="room_number"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="e.g., 101, A1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor (Optional)</Label>
                  <Input
                    id="floor"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="e.g., Ground, 1st, 2nd"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beds_count">Number of Beds</Label>
                  <Input
                    id="beds_count"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.beds_count}
                    onChange={(e) => setFormData({ ...formData, beds_count: parseInt(e.target.value) || 1 })}
                    required
                  />
                  {!editingRoom && (
                    <p className="text-sm text-muted-foreground">Beds will be auto-generated</p>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={addRoomMutation.isPending || updateRoomMutation.isPending}>
                    {editingRoom ? 'Update' : 'Add Room'}
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
                  <div className="h-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rooms?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DoorOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No rooms yet</h3>
              <p className="text-muted-foreground mb-4">Add your first room to get started</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms?.map((room) => {
              const occupiedBeds = room.beds?.filter(b => b.is_occupied).length || 0;
              const totalBeds = room.beds?.length || 0;
              
              return (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Room {room.room_number}</CardTitle>
                        {room.floor && (
                          <p className="text-sm text-muted-foreground">{room.floor} Floor</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(room)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteRoomMutation.mutate(room.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <BedDouble className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {occupiedBeds} / {totalBeds} beds occupied
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {room.beds?.map((bed) => (
                        <Badge
                          key={bed.id}
                          variant={bed.is_occupied ? 'default' : 'secondary'}
                        >
                          {bed.bed_number}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
