import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, QrCode, CreditCard, CheckCircle, Settings, Sparkles } from "lucide-react";

const UPISettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pgId, setPgId] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState("");

  useEffect(() => {
    if (user) {
      fetchUPISettings();
    }
  }, [user]);

  const fetchUPISettings = async () => {
    try {
      const { data: pg, error } = await supabase
        .from("pgs")
        .select("id, upi_id, upi_qr_url")
        .eq("owner_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (pg) {
        setPgId(pg.id);
        setUpiId(pg.upi_id || "");
        setUpiQrUrl(pg.upi_qr_url || "");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUPI = async () => {
    if (!pgId) {
      toast({
        title: "Error",
        description: "Please set up your PG first",
        variant: "destructive",
      });
      return;
    }

    if (!upiId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid UPI ID",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("pgs")
        .update({ upi_id: upiId.trim(), upi_qr_url: upiQrUrl })
        .eq("id", pgId);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your UPI settings have been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pgId) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `upi-qr-${pgId}-${Date.now()}.${fileExt}`;
      const filePath = `upi-qr/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-screenshots")
        .getPublicUrl(filePath);

      setUpiQrUrl(publicUrl);

      toast({
        title: "QR Code Uploaded",
        description: "Your UPI QR code has been uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!pgId) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="glass-card border-border/50 max-w-md">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Setup Required</h3>
              <p className="text-muted-foreground">
                Please set up your PG first before configuring UPI settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-24">
        {/* Header */}
        <Card className="premium-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-gold/5" />
          <CardContent className="relative py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">UPI Settings</h1>
                <p className="text-sm text-muted-foreground">Configure payment details for guests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UPI ID Card */}
        <Card className="glass-card border-border/50">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-accent" />
              <h3 className="font-semibold text-foreground">UPI ID</h3>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Your UPI ID</Label>
              <Input
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-accent text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Example: name@paytm, phone@ybl, name@okicici
              </p>
            </div>

            {upiId && (
              <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                <CheckCircle className="h-5 w-5 text-accent" />
                <span className="text-sm text-accent">UPI ID configured</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card className="glass-card border-border/50">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-gold" />
              <h3 className="font-semibold text-foreground">UPI QR Code</h3>
            </div>

            {upiQrUrl ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-2xl shadow-premium">
                    <img
                      src={upiQrUrl}
                      alt="UPI QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  <span className="text-sm text-accent">QR Code uploaded</span>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center bg-secondary/20">
                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                  <QrCode className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No QR code uploaded yet
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="qr-upload" className="cursor-pointer block">
                <Button
                  variant="outline"
                  disabled={uploading}
                  className="w-full border-border/50 text-foreground hover:bg-secondary/50"
                  asChild
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {upiQrUrl ? "Change QR Code" : "Upload QR Code"}
                  </span>
                </Button>
              </Label>
              <Input
                id="qr-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQRUpload}
                disabled={uploading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button 
          onClick={handleSaveUPI} 
          disabled={saving} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 rounded-xl shadow-glow transition-all duration-300 hover:shadow-glow-lg"
        >
          {saving && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
          Save UPI Settings
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default UPISettings;