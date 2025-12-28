import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, AlertTriangle, Info, Bell } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AnnouncementsProps {
  pgId: string | undefined;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

export function Announcements({ pgId }: AnnouncementsProps) {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["guest-announcements", pgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("pg_id", pgId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!pgId,
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

  if (isLoading) {
    return (
      <Card className="premium-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Megaphone className="w-5 h-5 text-primary" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 shimmer rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!announcements?.length) {
    return null;
  }

  return (
    <Card className="premium-card border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Megaphone className="w-5 h-5 text-primary" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.map((announcement) => {
          const config = getPriorityConfig(announcement.priority);
          const Icon = config.icon;

          return (
            <div
              key={announcement.id}
              className={`p-4 rounded-xl ${config.bgColor} border ${config.borderColor} transition-all`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-foreground">{announcement.title}</h4>
                    <Badge className={`text-xs border ${config.badge}`}>
                      {announcement.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
