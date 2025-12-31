import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, AlertTriangle, Info, Bell, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

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
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground px-1">
          <Megaphone className="w-4 h-4 text-primary" />
          Announcements
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 w-64 flex-shrink-0 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!announcements?.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Megaphone className="w-4 h-4 text-primary" />
          Announcements
          {announcements.length > 1 && (
            <span className="text-xs text-muted-foreground font-normal">
              • Scroll for more →
            </span>
          )}
        </h3>
        <Link 
          to="/guest/announcements" 
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {announcements.map((announcement) => {
          const config = getPriorityConfig(announcement.priority);
          const Icon = config.icon;

          return (
            <div
              key={announcement.id}
              className={`p-3 rounded-xl ${config.bgColor} border ${config.borderColor} transition-all flex-shrink-0 w-72 snap-start`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground text-sm truncate">{announcement.title}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${config.badge} flex-shrink-0`}>
                      {announcement.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {announcement.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
