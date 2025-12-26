import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Users, IndianRupee } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import StatCard from '@/components/dashboard/StatCard';

export default function OwnerAnalytics() {
  const { user } = useAuth();

  const { data: pgData } = useQuery({
    queryKey: ['owner-pg', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pgs')
        .select('id')
        .eq('owner_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: occupancyData, isLoading: occupancyLoading } = useQuery({
    queryKey: ['occupancy-trends', pgData?.id],
    queryFn: async () => {
      const { data: beds } = await supabase
        .from('beds')
        .select('id, is_occupied, room_id, rooms!inner(pg_id)')
        .eq('rooms.pg_id', pgData?.id);

      const { data: guests } = await supabase
        .from('guests')
        .select('id, check_in_date, vacate_date, status')
        .eq('pg_id', pgData?.id);

      const totalBeds = beds?.length || 0;
      const occupiedBeds = beds?.filter(b => b.is_occupied).length || 0;

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        const activeGuests = guests?.filter(g => {
          const checkIn = g.check_in_date ? new Date(g.check_in_date) : null;
          const vacate = g.vacate_date ? new Date(g.vacate_date) : null;
          
          if (!checkIn) return false;
          if (checkIn > monthEnd) return false;
          if (vacate && vacate < monthStart) return false;
          return true;
        }).length || 0;

        months.push({
          month: format(date, 'MMM'),
          occupied: Math.min(activeGuests, totalBeds),
          total: totalBeds,
          rate: totalBeds > 0 ? Math.round((Math.min(activeGuests, totalBeds) / totalBeds) * 100) : 0,
        });
      }

      return {
        months,
        currentOccupancy: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        totalBeds,
        occupiedBeds,
      };
    },
    enabled: !!pgData?.id,
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-trends', pgData?.id],
    queryFn: async () => {
      const { data: rents } = await supabase
        .from('rents')
        .select('amount, month, status, guest_id, guests!inner(pg_id)')
        .eq('guests.pg_id', pgData?.id);

      const monthlyRevenue: Record<string, { collected: number; pending: number }> = {};
      
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'yyyy-MM');
        monthlyRevenue[monthKey] = { collected: 0, pending: 0 };
      }

      rents?.forEach(rent => {
        const monthKey = rent.month.substring(0, 7);
        if (monthlyRevenue[monthKey]) {
          if (rent.status === 'paid') {
            monthlyRevenue[monthKey].collected += Number(rent.amount);
          } else {
            monthlyRevenue[monthKey].pending += Number(rent.amount);
          }
        }
      });

      const months = Object.entries(monthlyRevenue).map(([key, value]) => ({
        month: format(new Date(key + '-01'), 'MMM'),
        collected: value.collected,
        pending: value.pending,
        total: value.collected + value.pending,
      }));

      const totalCollected = months.reduce((sum, m) => sum + m.collected, 0);
      const totalPending = months.reduce((sum, m) => sum + m.pending, 0);

      return { months, totalCollected, totalPending };
    },
    enabled: !!pgData?.id,
  });

  if (!pgData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No PG Setup</h2>
          <p className="text-muted-foreground">Set up your PG first to view analytics.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Occupancy trends and revenue insights</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {occupancyLoading ? (
            <><Skeleton className="h-28" /><Skeleton className="h-28" /></>
          ) : (
            <>
              <StatCard title="Current Occupancy" value={`${occupancyData?.currentOccupancy || 0}%`} icon={<Users className="w-6 h-6" />} />
              <StatCard title="Beds Occupied" value={`${occupancyData?.occupiedBeds || 0}/${occupancyData?.totalBeds || 0}`} icon={<TrendingUp className="w-6 h-6" />} />
            </>
          )}
          {revenueLoading ? (
            <><Skeleton className="h-28" /><Skeleton className="h-28" /></>
          ) : (
            <>
              <StatCard title="Total Collected (6 mo)" value={`₹${(revenueData?.totalCollected || 0).toLocaleString()}`} icon={<IndianRupee className="w-6 h-6" />} />
              <StatCard title="Pending Amount" value={`₹${(revenueData?.totalPending || 0).toLocaleString()}`} icon={<IndianRupee className="w-6 h-6" />} />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Occupancy Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {occupancyLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={occupancyData?.months || []}>
                    <defs>
                      <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${value}%`, 'Occupancy Rate']} />
                    <Area type="monotone" dataKey="rate" stroke="hsl(var(--foreground))" fill="url(#occupancyGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="w-5 h-5" />
                Revenue Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueData?.months || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `₹${v / 1000}k`} className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`₹${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="collected" name="Collected" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
