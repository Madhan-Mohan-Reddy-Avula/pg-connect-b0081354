import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Wallet } from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { Link } from "react-router-dom";

interface RentDueAlertProps {
  guestId: string | undefined;
}

export function RentDueAlert({ guestId }: RentDueAlertProps) {
  const { data: pendingRent } = useQuery({
    queryKey: ["guest-pending-rent", guestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rents")
        .select("*")
        .eq("guest_id", guestId!)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!guestId,
  });

  if (!pendingRent) return null;

  const dueDate = pendingRent.due_date ? new Date(pendingRent.due_date) : null;
  const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;
  const isOverdue = dueDate ? isPast(dueDate) && !isToday(dueDate) : false;
  const isDueToday = dueDate ? isToday(dueDate) : false;
  const isDueSoon = daysUntilDue !== null && daysUntilDue <= 5 && daysUntilDue > 0;

  // Only show alert if overdue, due today, or due within 5 days
  if (!isOverdue && !isDueToday && !isDueSoon) return null;

  const getAlertConfig = () => {
    if (isOverdue) {
      return {
        bgColor: "bg-destructive/10 border-destructive/30",
        iconBg: "bg-destructive/20",
        iconColor: "text-destructive",
        title: "Rent Overdue!",
        subtitle: `Due date was ${format(dueDate!, "MMM d, yyyy")}`,
      };
    }
    if (isDueToday) {
      return {
        bgColor: "bg-warning/10 border-warning/30",
        iconBg: "bg-warning/20",
        iconColor: "text-warning",
        title: "Rent Due Today!",
        subtitle: "Please make your payment",
      };
    }
    return {
      bgColor: "bg-primary/10 border-primary/30",
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
      title: `Rent Due in ${daysUntilDue} days`,
      subtitle: dueDate ? `Due on ${format(dueDate, "MMM d, yyyy")}` : "",
    };
  };

  const config = getAlertConfig();

  return (
    <Card className={`premium-card ${config.bgColor} animate-fade-in`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${config.iconBg} flex items-center justify-center`}>
              {isOverdue ? (
                <AlertTriangle className={`w-5 h-5 ${config.iconColor}`} />
              ) : (
                <Calendar className={`w-5 h-5 ${config.iconColor}`} />
              )}
            </div>
            <div>
              <p className={`font-semibold ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                {config.title}
              </p>
              <p className="text-sm text-muted-foreground">{config.subtitle}</p>
              <p className="text-lg font-bold text-foreground mt-1">
                ₹{pendingRent.amount.toLocaleString()}
              </p>
            </div>
          </div>
          <Button asChild className="btn-gradient text-primary-foreground font-semibold shadow-glow-sm">
            <Link to="/guest/pay">
              <Wallet className="w-4 h-4 mr-2" />
              Pay Now
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
