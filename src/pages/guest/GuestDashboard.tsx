import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, BedDouble, Home, IndianRupee, Calendar, Phone, MapPin, ScrollText, Wallet, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { PhotoGallery } from '@/components/guest/PhotoGallery';
import { HouseRules } from '@/components/guest/HouseRules';

export default function GuestDashboard() {
  const { user } = useAuth();

  const { data: guest, isLoading: guestLoading } = useQuery({
    queryKey: ['guest-details', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('guests').select('*, bed:beds(bed_number, room:rooms(room_number, floor, images, image_url))').eq('user_id', user?.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pg } = useQuery({
    queryKey: ['guest-pg', guest?.pg_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('pgs').select('*').eq('id', guest!.pg_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!guest?.pg_id,
  });

  const { data: currentRent } = useQuery({
    queryKey: ['current-rent', guest?.id],
    queryFn: async () => {
      const currentMonth = format(new Date(), 'yyyy-MM');
      const { data, error } = await supabase.from('rents').select('*').eq('guest_id', guest!.id).gte('month', `${currentMonth}-01`).lt('month', `${currentMonth}-32`).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!guest?.id,
  });

  const { data: complaintsCount } = useQuery({
    queryKey: ['guest-complaints-count', guest?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('guest_id', guest!.id).eq('status', 'open');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!guest?.id,
  });

  if (guestLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 shimmer rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (<div key={i} className="h-24 shimmer rounded-2xl" />))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!guest) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-secondary/50 border border-border/30 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No PG Assigned</h2>
          <p className="text-muted-foreground">Please contact your PG owner</p>
        </div>
      </DashboardLayout>
    );
  }

  const rentStatus = currentRent?.status === 'paid' ? 'Paid' : 'Due';
  const rentStatusColor = currentRent?.status === 'paid' ? 'text-primary' : 'text-warning';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome, {guest.full_name}!</h1>
          <p className="text-muted-foreground">Your PG at a glance</p>
        </div>

        {/* Rent Status Card - Hero */}
        <Card className="premium-card border-border/30 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <p className="text-sm text-muted-foreground mb-1">Rent Status</p>
              <p className={`text-4xl font-bold ${rentStatusColor} mb-4`}>{rentStatus}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="text-2xl font-bold text-foreground">₹{guest.monthly_rent.toLocaleString()}</p>
                </div>
                <Button asChild className="btn-gradient text-primary-foreground font-semibold shadow-glow-sm">
                  <Link to="/guest/pay"><Wallet className="w-4 h-4 mr-2" />Pay Now</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="premium-card border-border/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Room</p>
                  <p className="font-bold text-foreground text-lg">{guest.bed?.room?.room_number || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card border-border/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center">
                  <BedDouble className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bed</p>
                  <p className="font-bold text-foreground text-lg">{guest.bed?.bed_number || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card border-border/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Floor</p>
                  <p className="font-bold text-foreground text-lg">{guest.bed?.room?.floor || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card border-border/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center">
                  <ScrollText className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open Issues</p>
                  <p className="font-bold text-foreground text-lg">{complaintsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PG Details */}
        {pg && (
          <Card className="premium-card border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Building2 className="w-5 h-5 text-primary" />
                {pg.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium text-foreground">{pg.address}</p>
                    <p className="text-sm text-muted-foreground">{pg.city}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium text-foreground">{pg.owner_name}</p>
                    <p className="text-sm text-muted-foreground">{pg.contact_number}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* House Rules */}
        <HouseRules rules={pg?.house_rules} pgName={pg?.name} />

        {/* Photo Gallery */}
        <PhotoGallery
          pgImages={pg?.images || []}
          roomImages={guest?.bed?.room?.images || (guest?.bed?.room?.image_url ? [guest.bed.room.image_url] : [])}
          pgName={pg?.name}
          roomNumber={guest?.bed?.room?.room_number}
        />
      </div>
    </DashboardLayout>
  );
}
