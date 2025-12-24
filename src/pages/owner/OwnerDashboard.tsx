import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BedDouble, 
  Users, 
  Receipt, 
  Home,
  Plus,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  activeGuests: number;
  pendingRents: number;
  openComplaints: number;
}

interface RecentGuest {
  id: string;
  full_name: string;
  status: string;
  check_in_date: string | null;
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    activeGuests: 0,
    pendingRents: 0,
    openComplaints: 0,
  });
  const [recentGuests, setRecentGuests] = useState<RecentGuest[]>([]);
  const [hasPG, setHasPG] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Check if owner has a PG
      const { data: pgData } = await supabase
        .from('pgs')
        .select('id')
        .eq('owner_id', user?.id)
        .maybeSingle();

      setHasPG(!!pgData);

      if (!pgData) {
        setLoading(false);
        return;
      }

      // Fetch rooms count
      const { count: roomsCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('pg_id', pgData.id);

      // Fetch beds
      const { data: bedsData } = await supabase
        .from('beds')
        .select('id, is_occupied, room_id, rooms!inner(pg_id)')
        .eq('rooms.pg_id', pgData.id);

      const totalBeds = bedsData?.length || 0;
      const occupiedBeds = bedsData?.filter(b => b.is_occupied).length || 0;

      // Fetch active guests
      const { data: guestsData } = await supabase
        .from('guests')
        .select('id, full_name, status, check_in_date')
        .eq('pg_id', pgData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      const activeGuests = guestsData?.length || 0;

      // Fetch pending rents
      const { count: pendingRents } = await supabase
        .from('rents')
        .select('*, guests!inner(pg_id)', { count: 'exact', head: true })
        .eq('guests.pg_id', pgData.id)
        .eq('status', 'pending');

      // Fetch open complaints
      const { count: openComplaints } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('pg_id', pgData.id)
        .eq('status', 'open');

      setStats({
        totalRooms: roomsCount || 0,
        totalBeds,
        occupiedBeds,
        activeGuests,
        pendingRents: pendingRents || 0,
        openComplaints: openComplaints || 0,
      });

      setRecentGuests(guestsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasPG) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-12 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Home className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Welcome to PG Manager!</h1>
          <p className="text-muted-foreground mb-6">
            Get started by setting up your PG details. You can add rooms, manage guests, and track rent payments.
          </p>
          <Button asChild size="lg">
            <Link to="/owner/pg">
              <Plus className="w-5 h-5 mr-2" />
              Set Up Your PG
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your PG performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Rooms"
            value={stats.totalRooms}
            icon={<Home className="w-6 h-6" />}
            color="primary"
          />
          <StatCard
            title="Total Beds"
            value={stats.totalBeds}
            icon={<BedDouble className="w-6 h-6" />}
            color="info"
          />
          <StatCard
            title="Occupied Beds"
            value={`${stats.occupiedBeds}/${stats.totalBeds}`}
            icon={<BedDouble className="w-6 h-6" />}
            color="success"
          />
          <StatCard
            title="Active Guests"
            value={stats.activeGuests}
            icon={<Users className="w-6 h-6" />}
            color="primary"
          />
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats.pendingRents > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.pendingRents} Pending Rent{stats.pendingRents > 1 ? 's' : ''}</p>
                    <p className="text-sm text-muted-foreground">Requires attention</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/owner/rents">View</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {stats.openComplaints > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.openComplaints} Open Complaint{stats.openComplaints > 1 ? 's' : ''}</p>
                    <p className="text-sm text-muted-foreground">Needs resolution</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/owner/complaints">View</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Guests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Guests</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/owner/guests" className="flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentGuests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No guests yet. Add your first guest!</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to="/owner/guests">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Guest
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {guest.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{guest.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {guest.check_in_date 
                            ? `Checked in: ${new Date(guest.check_in_date).toLocaleDateString()}` 
                            : 'No check-in date'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={guest.status === 'active' ? 'default' : 'secondary'}>
                      {guest.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
