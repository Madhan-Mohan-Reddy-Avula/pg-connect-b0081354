import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Bell, Mail, MessageSquare, Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NotificationSettings {
  id?: string;
  pg_id: string;
  email_reminders_enabled: boolean;
  sms_reminders_enabled: boolean;
  reminder_days_before: number;
  reminder_email: string | null;
  reminder_phone: string | null;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch owner's PG
  const { data: pg, isLoading: loadingPg } = useQuery({
    queryKey: ["owner-pg", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgs")
        .select("id, name")
        .eq("owner_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch notification settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["notification-settings", pg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("pg_id", pg!.id)
        .maybeSingle();
      if (error) throw error;
      return data as NotificationSettings | null;
    },
    enabled: !!pg?.id,
  });

  const [formData, setFormData] = useState<Partial<NotificationSettings>>({});

  // Initialize form when settings load
  const currentSettings = {
    email_reminders_enabled: formData.email_reminders_enabled ?? settings?.email_reminders_enabled ?? false,
    sms_reminders_enabled: formData.sms_reminders_enabled ?? settings?.sms_reminders_enabled ?? false,
    reminder_days_before: formData.reminder_days_before ?? settings?.reminder_days_before ?? 3,
    reminder_email: formData.reminder_email ?? settings?.reminder_email ?? "",
    reminder_phone: formData.reminder_phone ?? settings?.reminder_phone ?? "",
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pg?.id) throw new Error("No PG found");

      const settingsData = {
        pg_id: pg.id,
        email_reminders_enabled: currentSettings.email_reminders_enabled,
        sms_reminders_enabled: currentSettings.sms_reminders_enabled,
        reminder_days_before: currentSettings.reminder_days_before,
        reminder_email: currentSettings.reminder_email || null,
        reminder_phone: currentSettings.reminder_phone || null,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("notification_settings")
          .update(settingsData)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_settings")
          .insert(settingsData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast({
        title: "Settings Saved",
        description: "Your notification settings have been updated.",
      });
      setFormData({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateField = <K extends keyof NotificationSettings>(
    field: K,
    value: NotificationSettings[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loadingPg || loadingSettings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!pg) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No PG Found</h2>
          <p className="text-muted-foreground">Please set up your PG first</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-muted-foreground">Configure automatic rent reminders for your guests</p>
        </div>

        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            Automatic reminders will be sent to guests before their rent due date based on your configuration.
          </AlertDescription>
        </Alert>

        {/* Email Reminders */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5 text-primary" />
              Email Reminders
            </CardTitle>
            <CardDescription>
              Send email reminders to guests before rent is due
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Enable Email Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send email notifications
                </p>
              </div>
              <Switch
                checked={currentSettings.email_reminders_enabled}
                onCheckedChange={(checked) =>
                  updateField("email_reminders_enabled", checked)
                }
              />
            </div>

            {currentSettings.email_reminders_enabled && (
              <div className="space-y-2 pt-2">
                <Label className="text-muted-foreground text-sm">
                  Reply-to Email (Optional)
                </Label>
                <Input
                  type="email"
                  placeholder="owner@example.com"
                  value={currentSettings.reminder_email}
                  onChange={(e) => updateField("reminder_email", e.target.value)}
                  className="bg-muted/50 border-border/50 focus:border-foreground/50"
                />
                <p className="text-xs text-muted-foreground">
                  Guests can reply to this email for inquiries
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS Reminders */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              SMS Reminders
            </CardTitle>
            <CardDescription>
              Send SMS reminders to guests before rent is due
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Enable SMS Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send SMS notifications
                </p>
              </div>
              <Switch
                checked={currentSettings.sms_reminders_enabled}
                onCheckedChange={(checked) =>
                  updateField("sms_reminders_enabled", checked)
                }
              />
            </div>

            {currentSettings.sms_reminders_enabled && (
              <div className="space-y-2 pt-2">
                <Label className="text-muted-foreground text-sm">
                  Owner Phone (for sender ID)
                </Label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={currentSettings.reminder_phone}
                  onChange={(e) => updateField("reminder_phone", e.target.value)}
                  className="bg-muted/50 border-border/50 focus:border-foreground/50"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timing Settings */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Reminder Timing
            </CardTitle>
            <CardDescription>
              Configure when reminders should be sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Days Before Due Date
              </Label>
              <Select
                value={currentSettings.reminder_days_before.toString()}
                onValueChange={(value) =>
                  updateField("reminder_days_before", parseInt(value))
                }
              >
                <SelectTrigger className="bg-muted/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="2">2 days before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="5">5 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Reminders will be sent this many days before the rent due date (5th of each month)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full bg-foreground hover:bg-foreground/90 text-background font-semibold py-6 rounded-xl"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Save className="h-5 w-5 mr-2" />
          )}
          Save Settings
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Note: Actual email/SMS sending requires additional configuration. Contact support for setup.
        </p>
      </div>
    </DashboardLayout>
  );
}