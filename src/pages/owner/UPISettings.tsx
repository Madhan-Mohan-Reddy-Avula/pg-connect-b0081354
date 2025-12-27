import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, QrCode, CreditCard, CheckCircle, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UPI_PROVIDERS = [
  { value: "ybl", label: "PhonePe", handle: "@ybl" },
  { value: "okaxis", label: "Google Pay", handle: "@okaxis" },
  { value: "paytm", label: "Paytm", handle: "@paytm" },
  { value: "okhdfcbank", label: "Google Pay (HDFC)", handle: "@okhdfcbank" },
  { value: "oksbi", label: "Google Pay (SBI)", handle: "@oksbi" },
  { value: "okicici", label: "Google Pay (ICICI)", handle: "@okicici" },
  { value: "ibl", label: "PhonePe (ICICI)", handle: "@ibl" },
  { value: "axl", label: "PhonePe (Axis)", handle: "@axl" },
  { value: "custom", label: "Custom UPI ID", handle: "" },
];

const UPISettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pgId, setPgId] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [upiProvider, setUpiProvider] = useState("ybl");

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
        const savedUpiId = pg.upi_id || "";
        setUpiId(savedUpiId);
        setUpiQrUrl(pg.upi_qr_url || "");
        
        // Parse saved UPI ID to extract phone number and provider
        if (savedUpiId.includes("@")) {
          const [phone, handle] = savedUpiId.split("@");
          setPhoneNumber(phone);
          const provider = UPI_PROVIDERS.find(p => p.value === handle);
          if (provider) {
            setUpiProvider(handle);
          } else {
            setUpiProvider("custom");
          }
        } else if (savedUpiId) {
          setPhoneNumber(savedUpiId);
        }
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

    // Build UPI ID from phone number and provider
    let finalUpiId = upiId;
    if (upiProvider !== "custom" && phoneNumber) {
      finalUpiId = `${phoneNumber}@${upiProvider}`;
    }

    if (!finalUpiId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid UPI ID or phone number",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Build UPI ID from phone number and provider
      let finalUpiId = upiId;
      if (upiProvider !== "custom" && phoneNumber) {
        finalUpiId = `${phoneNumber}@${upiProvider}`;
      }

      const { error } = await supabase
        .from("pgs")
        .update({ upi_id: finalUpiId.trim(), upi_qr_url: upiQrUrl })
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
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!pgId) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="premium-card max-w-md">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
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
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">UPI Settings</h1>
                <p className="text-sm text-muted-foreground">Configure payment details for guests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UPI ID Card */}
        <Card className="premium-card">
          <CardContent className="pt-6 pb-6 space-y-4">
            <h3 className="font-semibold text-foreground">UPI Payment Details</h3>
            
            {/* UPI Provider Selection */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">UPI Provider</Label>
              <Select value={upiProvider} onValueChange={setUpiProvider}>
                <SelectTrigger className="bg-muted/50 border-border/50 focus:border-foreground/50 text-foreground">
                  <SelectValue placeholder="Select UPI provider" />
                </SelectTrigger>
                <SelectContent>
                  {UPI_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label} {provider.handle && `(${provider.handle})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone Number / UPI ID Input */}
            {upiProvider === "custom" ? (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Custom UPI ID</Label>
                <Input
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="bg-muted/50 border-border/50 focus:border-foreground/50 text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your full UPI ID (e.g., name@bank)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Phone Number</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="bg-muted/50 border-border/50 focus:border-foreground/50 text-foreground placeholder:text-muted-foreground"
                    maxLength={10}
                  />
                  <span className="text-muted-foreground font-medium whitespace-nowrap">
                    @{upiProvider}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter 10-digit phone number linked to your UPI
                </p>
              </div>
            )}

            {/* Preview */}
            {((upiProvider !== "custom" && phoneNumber.length === 10) || (upiProvider === "custom" && upiId)) && (
              <div className="flex items-center gap-2 p-3 bg-foreground/5 rounded-lg border border-foreground/10">
                <CheckCircle className="h-5 w-5 text-foreground" />
                <span className="text-sm text-foreground">
                  UPI ID: <strong>{upiProvider === "custom" ? upiId : `${phoneNumber}@${upiProvider}`}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card className="premium-card">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">UPI QR Code</h3>
            </div>

            {upiQrUrl ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-foreground rounded-2xl">
                    <img
                      src={upiQrUrl}
                      alt="UPI QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-foreground/5 rounded-lg border border-foreground/10">
                  <CheckCircle className="h-5 w-5 text-foreground" />
                  <span className="text-sm text-foreground">QR Code uploaded</span>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center bg-muted/20">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
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
                  className="w-full border-border/50 text-foreground hover:bg-muted/50"
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
          className="w-full bg-foreground hover:bg-foreground/90 text-background font-semibold py-6 rounded-xl transition-all duration-300"
        >
          {saving && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
          Save UPI Settings
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default UPISettings;
