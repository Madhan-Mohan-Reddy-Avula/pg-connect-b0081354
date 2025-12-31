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
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, BedDouble, Edit2, Trash2, DoorOpen, Image, Eye } from 'lucide-react';
import { MultiImageUpload } from '@/components/ui/image-upload';
import { RoomDetailDialog } from '@/components/rooms/RoomDetailDialog';

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

export default function RoomsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
    mutationFn: async (data: { room_number: string; floor: string; beds_count: number; images: string[] }) => {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          pg_id: pg!.id,
          room_number: data.room_number,
          floor: data.floor || null,
          beds_count: data.beds_count,
          images: data.images,
        })
        .select()
        .single();
      
      if (roomError) throw roomError;

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
      setRoomImages([]);
      toast({ title: 'Room added', description: 'Room and beds created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update room mutation - also handles bed count changes
  const updateRoomMutation = useMutation({
    mutationFn: async (data: { id: string; room_number: string; floor: string; beds_count: number; images: string[]; currentBedsCount: number }) => {
      // Update room details
      const { error } = await supabase
        .from('rooms')
        .update({
          room_number: data.room_number,
          floor: data.floor || null,
          beds_count: data.beds_count,
          images: data.images,
        })
        .eq('id', data.id);
      
      if (error) throw error;

      // Handle bed count changes
      const diff = data.beds_count - data.currentBedsCount;
      
      if (diff > 0) {
        // Add new beds
        const newBeds = Array.from({ length: diff }, (_, i) => ({
          room_id: data.id,
          bed_number: `Bed ${data.currentBedsCount + i + 1}`,
        }));
        const { error: bedsError } = await supabase.from('beds').insert(newBeds);
        if (bedsError) throw bedsError;
      } else if (diff < 0) {
        // Remove excess beds (only unoccupied ones)
        const { data: unoccupiedBeds, error: fetchError } = await supabase
          .from('beds')
          .select('id')
          .eq('room_id', data.id)
          .eq('is_occupied', false)
          .limit(Math.abs(diff));
        
        if (fetchError) throw fetchError;
        
        if (unoccupiedBeds && unoccupiedBeds.length > 0) {
          const bedIdsToDelete = unoccupiedBeds.map(b => b.id);
          const { error: deleteError } = await supabase
            .from('beds')
            .delete()
            .in('id', bedIdsToDelete);
          if (deleteError) throw deleteError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsDialogOpen(false);
      setEditingRoom(null);
      resetForm();
      setRoomImages([]);
      toast({ title: 'Room updated', description: 'Room details and beds updated successfully' });
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
      // Support both legacy single image and new multiple images
      const images = room.images || (room.image_url ? [room.image_url] : []);
      setRoomImages(images);
    } else {
      setEditingRoom(null);
      resetForm();
      setRoomImages([]);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      const currentBedsCount = editingRoom.beds?.length || editingRoom.beds_count;
      updateRoomMutation.mutate({ 
        id: editingRoom.id, 
        ...formData, 
        images: roomImages,
        currentBedsCount 
      });
    } else {
      addRoomMutation.mutate({ ...formData, images: roomImages });
    }
  };

  const handleViewRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsDetailOpen(true);
  };

  const handleDeleteClick = (room: Room) => {
    setRoomToDelete(room);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (roomToDelete) {
      deleteRoomMutation.mutate(roomToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setRoomToDelete(null);
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
            <h1 className="text-2xl font-bold">Rooms Management</h1>
            <p className="text-muted-foreground">Manage rooms and beds in your PG</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
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
                    className="bg-secondary/50 border-border"
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
                    className="bg-secondary/50 border-border"
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
                    className="bg-secondary/50 border-border"
                    required
                  />
                  {!editingRoom && (
                    <p className="text-sm text-muted-foreground">Beds will be auto-generated</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Room Images (Up to 6)
                  </Label>
                  <MultiImageUpload
                    bucket="pg-images"
                    folder={user?.id || 'unknown'}
                    values={roomImages}
                    onChange={setRoomImages}
                    maxImages={6}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-foreground text-background hover:bg-foreground/90" disabled={addRoomMutation.isPending || updateRoomMutation.isPending}>
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
          <Card className="premium-card">
            <CardContent className="py-12 text-center">
              <DoorOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No rooms yet</h3>
              <p className="text-muted-foreground mb-4">Add your first room to get started</p>
              <Button onClick={() => handleOpenDialog()} className="bg-foreground text-background hover:bg-foreground/90">
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
                <Card 
                  key={room.id} 
                  className="premium-card overflow-hidden cursor-pointer hover:border-primary/30 transition-all"
                  onClick={() => handleViewRoom(room)}
                >
                  {(room.images?.length || room.image_url) && (
                    <div className="aspect-video w-full">
                      <img src={room.images?.[0] || room.image_url || ''} alt={`Room ${room.room_number}`} className="w-full h-full object-cover" />
                    </div>
                  )}
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
                          onClick={(e) => { e.stopPropagation(); handleViewRoom(room); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); handleOpenDialog(room); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(room); }}
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

      {/* Room Detail Dialog */}
      <RoomDetailDialog 
        room={selectedRoom} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Room"
        description={`Are you sure you want to delete Room ${roomToDelete?.room_number}? This will also remove all beds in this room. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </DashboardLayout>
  );
}
