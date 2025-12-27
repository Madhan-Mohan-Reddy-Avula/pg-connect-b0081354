import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import BedOccupancyWidget from '@/components/dashboard/BedOccupancyWidget';
import RentRemindersWidget from '@/components/dashboard/RentRemindersWidget';
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
  ArrowRight,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface DashboardStats {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  activeGuests: number;
  pendingRents: number;
  openComplaints: number;
  monthlyExpenses: number;
  monthlyCollected: number;
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
    totalRooms: 0, totalBeds: 0, occupiedBeds: 0, activeGuests: 0, pendingRents: 0, openComplaints: 0, monthlyExpenses: 0, monthlyCollected: 0,
  });
  const [recentGuests, setRecentGuests] = useState<RecentGuest[]>([]);
  const [hasPG, setHasPG] = useState<boolean | null>(null);
  const [pgId, setPgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: pgData } = await supabase.from('pgs').select('id').eq('owner_id', user?.id).maybeSingle();
      setHasPG(!!pgData);
      setPgId(pgData?.id || null);
      if (!pgData) { setLoading(false); return; }

      const currentMonth = format(new Date(), 'yyyy-MM');
      const monthStart = `${currentMonth}-01`;
      const monthEnd = `${currentMonth}-31`;

      const { count: roomsCount } = await supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('pg_id', pgData.id);
      const { data: bedsData } = await supabase.from('beds').select('id, is_occupied, room_id, rooms!inner(pg_id)').eq('rooms.pg_id', pgData.id);
      const totalBeds = bedsData?.length || 0;
      const occupiedBeds = bedsData?.filter(b => b.is_occupied).length || 0;
      const { data: guestsData } = await supabase.from('guests').select('id, full_name, status, check_in_date').eq('pg_id', pgData.id).eq('status', 'active').order('created_at', { ascending: false }).limit(5);
      const { count: pendingRents } = await supabase.from('rents').select('*, guests!inner(pg_id)', { count: 'exact', head: true }).eq('guests.pg_id', pgData.id).eq('status', 'pending');
      const { count: openComplaints } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('pg_id', pgData.id).eq('status', 'open');
      
      // Fetch monthly expenses
      const { data: expensesData } = await supabase.from('expenses').select('amount').eq('pg_id', pgData.id).gte('expense_month', monthStart).lte('expense_month', monthEnd);
      const monthlyExpenses = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      // Fetch monthly rent collected
      const { data: rentsData } = await supabase.from('rents').select('amount, guests!inner(pg_id)').eq('guests.pg_id', pgData.id).eq('status', 'paid').gte('month', monthStart).lte('month', monthEnd);
      const monthlyCollected = rentsData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      setStats({ totalRooms: roomsCount || 0, totalBeds, occupiedBeds, activeGuests: guestsData?.length || 0, pendingRents: pendingRents || 0, openComplaints: openComplaints || 0, monthlyExpenses, monthlyCollected });
      setRecentGuests(guestsData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasPG) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-12 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-glow-sm">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Welcome to PG Manager!</h1>
          <p className="text-muted-foreground mb-8">Get started by setting up your PG details.</p>
          <Button asChild size="lg" className="btn-gradient text-primary-foreground font-semibold shadow-glow hover:shadow-[0_0_40px_hsl(142_76%_52%/0.3)] transition-all">
            <Link to="/owner/pg"><Plus className="w-5 h-5 mr-2" />Set Up Your PG</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Your PG at a glance</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Rooms" value={stats.totalRooms} icon={<Home className="w-6 h-6" />} color="primary" />
          <StatCard title="Occupied Beds" value={`${stats.occupiedBeds}/${stats.totalBeds}`} icon={<BedDouble className="w-6 h-6" />} color="success" />
          <StatCard title="Active Guests" value={stats.activeGuests} icon={<Users className="w-6 h-6" />} color="accent" />
        </div>

        {/* Monthly Financial Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month Collected</p>
                  <p className="text-2xl font-bold">₹{stats.monthlyCollected.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">This Month Expenses</p>
                    <p className="text-2xl font-bold">₹{stats.monthlyExpenses.toLocaleString()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/owner/expenses">View</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bed Occupancy & Rent Reminders Widgets */}
        {pgId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BedOccupancyWidget pgId={pgId} />
            <RentRemindersWidget pgId={pgId} />
          </div>
        )}

        {stats.openComplaints > 0 && (
          <Card className="premium-card border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{stats.openComplaints} Open Complaint{stats.openComplaints > 1 ? 's' : ''}</p>
                  <p className="text-sm text-muted-foreground">Needs resolution</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="border-destructive/30 hover:bg-destructive/10"><Link to="/owner/complaints">View</Link></Button>
            </CardContent>
          </Card>
        )}

        <Card className="premium-card border-border/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg text-foreground">Recent Guests</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-primary"><Link to="/owner/guests" className="flex items-center gap-1">View All <ArrowRight className="w-4 h-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {recentGuests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No guests yet.</p>
                <Button variant="outline" size="sm" className="mt-4" asChild><Link to="/owner/guests"><Plus className="w-4 h-4 mr-2" />Add Guest</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGuests.map((guest) => (
                  <div key={guest.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold">{guest.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{guest.full_name}</p>
                        <p className="text-sm text-muted-foreground">{guest.check_in_date ? `Checked in: ${new Date(guest.check_in_date).toLocaleDateString()}` : 'No check-in date'}</p>
                      </div>
                    </div>
                    <Badge variant={guest.status === 'active' ? 'default' : 'secondary'} className={guest.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' : ''}>{guest.status}</Badge>
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
