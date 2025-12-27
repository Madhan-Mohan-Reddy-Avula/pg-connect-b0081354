import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, AlertTriangle, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays, isPast, isToday } from 'date-fns';

interface PendingRent {
  id: string;
  amount: number;
  month: string;
  due_date: string | null;
  guest: {
    full_name: string;
    phone: string;
  } | null;
}

interface RentRemindersWidgetProps {
  pgId: string;
}

export default function RentRemindersWidget({ pgId }: RentRemindersWidgetProps) {
  const { data: pendingRents, isLoading } = useQuery({
    queryKey: ['pending-rents-reminders', pgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rents')
        .select('id, amount, month, due_date, guest:guests!inner(full_name, phone, pg_id)')
        .eq('guests.pg_id', pgId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as PendingRent[];
    },
    enabled: !!pgId,
  });

  const getStatusInfo = (dueDate: string | null) => {
    if (!dueDate) {
      return { status: 'pending', label: 'No due date', color: 'secondary' as const, daysText: '' };
    }

    const due = new Date(dueDate);
    const daysUntil = differenceInDays(due, new Date());

    if (isPast(due) && !isToday(due)) {
      const daysOverdue = Math.abs(daysUntil);
      return {
        status: 'overdue',
        label: 'Overdue',
        color: 'destructive' as const,
        daysText: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
      };
    }

    if (isToday(due)) {
      return {
        status: 'due-today',
        label: 'Due Today',
        color: 'warning' as const,
        daysText: 'Payment due today',
      };
    }

    if (daysUntil <= 3) {
      return {
        status: 'due-soon',
        label: 'Due Soon',
        color: 'warning' as const,
        daysText: `${daysUntil} day${daysUntil > 1 ? 's' : ''} left`,
      };
    }

    return {
      status: 'pending',
      label: 'Pending',
      color: 'secondary' as const,
      daysText: `Due in ${daysUntil} days`,
    };
  };

  const overdueRents = pendingRents?.filter(r => {
    if (!r.due_date) return false;
    return isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date));
  }) || [];

  const dueSoonRents = pendingRents?.filter(r => {
    if (!r.due_date) return false;
    const daysUntil = differenceInDays(new Date(r.due_date), new Date());
    return daysUntil >= 0 && daysUntil <= 3;
  }) || [];

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

  if (!pendingRents?.length) {
    return (
      <Card className="premium-card border-border/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Rent Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
              All rents collected!
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="premium-card border-border/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Rent Reminders
          {overdueRents.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {overdueRents.length} overdue
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-primary">
          <Link to="/owner/rents" className="flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2">
          {overdueRents.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">{overdueRents.length} Overdue</span>
              </div>
            </div>
          )}
          {dueSoonRents.length > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-warning">{dueSoonRents.length} Due Soon</span>
              </div>
            </div>
          )}
        </div>

        {/* Pending Rent List */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {pendingRents?.slice(0, 5).map((rent) => {
            const statusInfo = getStatusInfo(rent.due_date);
            return (
              <div
                key={rent.id}
                className={`p-3 rounded-lg border transition-all ${
                  statusInfo.status === 'overdue'
                    ? 'bg-destructive/5 border-destructive/30'
                    : statusInfo.status === 'due-today' || statusInfo.status === 'due-soon'
                    ? 'bg-warning/5 border-warning/30'
                    : 'bg-secondary/30 border-border/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{rent.guest?.full_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(rent.month), 'MMM yyyy')}</span>
                      {statusInfo.daysText && (
                        <>
                          <span>•</span>
                          <span className={
                            statusInfo.status === 'overdue' ? 'text-destructive' :
                            statusInfo.status === 'due-soon' || statusInfo.status === 'due-today' ? 'text-warning' :
                            ''
                          }>
                            {statusInfo.daysText}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">₹{rent.amount.toLocaleString()}</p>
                    <Badge
                      variant={statusInfo.status === 'overdue' ? 'destructive' : 'secondary'}
                      className={`text-xs ${
                        statusInfo.status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        statusInfo.status === 'due-soon' || statusInfo.status === 'due-today' ? 'bg-warning/10 text-warning border-warning/20' :
                        ''
                      }`}
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {pendingRents && pendingRents.length > 5 && (
          <Button variant="ghost" size="sm" asChild className="w-full text-xs">
            <Link to="/owner/rents">+{pendingRents.length - 5} more pending</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
