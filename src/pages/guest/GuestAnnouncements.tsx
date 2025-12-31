import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, AlertTriangle, Info, Bell, ArrowLeft } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  is_active: boolean;
}

export default function GuestAnnouncements() {
  const { user } = useAuth();

  const { data: guest } = useQuery({
    queryKey: ["guest-for-announcements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("pg_id")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["all-guest-announcements", guest?.pg_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("pg_id", guest!.pg_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!guest?.pg_id,
  });

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          icon: AlertTriangle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
          badge: "bg-destructive/20 text-destructive border-destructive/30",
        };
      case "high":
        return {
          icon: Bell,
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/30",
          badge: "bg-warning/20 text-warning border-warning/30",
        };
      case "low":
        return {
          icon: Info,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-border/30",
          badge: "bg-muted text-muted-foreground border-border",
        };
      default:
        return {
          icon: Megaphone,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/30",
          badge: "bg-primary/20 text-primary border-primary/30",
        };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/guest">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" />
              Announcements
            </h1>
            <p className="text-muted-foreground">All announcements from your PG</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 shimmer rounded-xl" />
            ))}
          </div>
        ) : !announcements?.length ? (
          <Card className="premium-card border-border/30">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/30 flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Announcements</h3>
              <p className="text-muted-foreground">There are no active announcements at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const config = getPriorityConfig(announcement.priority);
              const Icon = config.icon;

              return (
                <Card
                  key={announcement.id}
                  className={`premium-card ${config.borderColor} overflow-hidden`}
                >
                  <CardContent className="p-0">
                    <div className={`p-5 ${config.bgColor}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${config.bgColor} border ${config.borderColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-bold text-lg text-foreground">{announcement.title}</h3>
                            <Badge className={`text-xs border ${config.badge}`}>
                              {announcement.priority}
                            </Badge>
                          </div>
                          <p className="text-foreground/80 whitespace-pre-wrap mb-3">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{format(new Date(announcement.created_at), "PPP")}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
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
