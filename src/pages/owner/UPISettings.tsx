import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, QrCode, CreditCard, CheckCircle } from "lucide-react";

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
        title: "Success",
        description: "UPI settings saved successfully",
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
        title: "Success",
        description: "QR code uploaded successfully",
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!pgId) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Please set up your PG first before configuring UPI settings.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">UPI Payment Settings</h1>
          <p className="text-muted-foreground">
            Configure your UPI details for receiving payments from guests
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                UPI ID
              </CardTitle>
              <CardDescription>
                Enter your UPI ID (e.g., name@upi, phone@paytm)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input
                  id="upi-id"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
              {upiId && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  UPI ID configured
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                UPI QR Code
              </CardTitle>
              <CardDescription>
                Upload your UPI QR code image for easy scanning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upiQrUrl ? (
                <div className="space-y-4">
                  <img
                    src={upiQrUrl}
                    alt="UPI QR Code"
                    className="w-48 h-48 object-contain mx-auto border rounded-lg"
                  />
                  <div className="flex items-center gap-2 text-sm text-green-600 justify-center">
                    <CheckCircle className="h-4 w-4" />
                    QR Code uploaded
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No QR code uploaded yet
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="qr-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      disabled={uploading}
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
                  </div>
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
        </div>

        <Card>
          <CardContent className="pt-6">
            <Button onClick={handleSaveUPI} disabled={saving} className="w-full md:w-auto">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save UPI Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UPISettings;
