import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, QrCode, Upload, CheckCircle, Clock, XCircle, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  payment_purpose: string;
  upi_transaction_id: string;
  screenshot_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const PayRent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("rent");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch guest and PG details
  const { data: guestData, isLoading: loadingGuest } = useQuery({
    queryKey: ["guest-pg-details", user?.id],
    queryFn: async () => {
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .select("id, pg_id, monthly_rent")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (guestError) throw guestError;
      if (!guest) return null;

      const { data: pg, error: pgError } = await supabase
        .from("pgs")
        .select("id, name, upi_id, upi_qr_url")
        .eq("id", guest.pg_id)
        .maybeSingle();

      if (pgError) throw pgError;

      return { guest, pg };
    },
    enabled: !!user,
  });

  // Fetch payment history
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["guest-payments", user?.id],
    queryFn: async () => {
      const { data: guest } = await supabase
        .from("guests")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!guest) return [];

      const { data, error } = await supabase
        .from("manual_payments")
        .select("*")
        .eq("guest_id", guest.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user,
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!guestData?.guest || !guestData?.pg) throw new Error("Guest data not found");

      const { error } = await supabase.from("manual_payments").insert({
        guest_id: guestData.guest.id,
        pg_id: guestData.pg.id,
        amount: parseFloat(amount),
        payment_purpose: purpose,
        upi_transaction_id: transactionId.trim(),
        screenshot_url: screenshotUrl || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-payments"] });
      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted for verification.",
      });
      setAmount("");
      setTransactionId("");
      setScreenshotUrl("");
      setPurpose("rent");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guestData?.guest) return;

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
      const fileName = `payment-${guestData.guest.id}-${Date.now()}.${fileExt}`;
      const filePath = `screenshots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-screenshots")
        .getPublicUrl(filePath);

      setScreenshotUrl(publicUrl);
      toast({
        title: "Success",
        description: "Screenshot uploaded successfully",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!transactionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter the UPI transaction ID",
        variant: "destructive",
      });
      return;
    }

    submitPaymentMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-accent/20 text-accent border-accent/30 border">
            <CheckCircle className="h-3 w-3 mr-1" />Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 border">
            <XCircle className="h-3 w-3 mr-1" />Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-secondary/20 text-secondary-foreground border-border border">
            <Clock className="h-3 w-3 mr-1" />Pending
          </Badge>
        );
    }
  };

  if (loadingGuest) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!guestData?.pg?.upi_id) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="glass-card border-border/50 max-w-md">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Payment Not Available</h3>
              <p className="text-muted-foreground">
                UPI payment is not yet configured by the PG owner. Please contact them for payment details.
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
        {/* Hero Payment Card */}
        <Card className="premium-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-gold/5" />
          <CardContent className="relative pt-8 pb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm text-accent font-medium">Monthly Rent</span>
            </div>
            {guestData.guest.monthly_rent > 0 && (
              <div className="mb-6">
                <span className="text-5xl font-bold text-foreground">₹{guestData.guest.monthly_rent.toLocaleString()}</span>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Scan QR or use UPI ID to pay</p>
          </CardContent>
        </Card>

        {/* UPI Details Card */}
        <Card className="glass-card border-border/50">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* QR Code */}
              {guestData.pg.upi_qr_url && (
                <div className="flex-shrink-0">
                  <div className="p-3 bg-white rounded-2xl shadow-premium">
                    <img
                      src={guestData.pg.upi_qr_url}
                      alt="UPI QR Code"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                </div>
              )}
              
              {/* UPI ID */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <QrCode className="h-5 w-5 text-accent" />
                  <span className="text-sm text-muted-foreground">UPI ID</span>
                </div>
                <p className="text-lg font-mono font-semibold text-foreground bg-secondary/50 px-4 py-2 rounded-lg inline-block">
                  {guestData.pg.upi_id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="glass-card border-border/50">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Submit Payment Details</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Payment Purpose</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger className="bg-secondary/50 border-border/50 focus:border-accent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  className="bg-secondary/50 border-border/50 focus:border-accent text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">UPI Transaction ID</Label>
                <Input
                  placeholder="Enter transaction/reference ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="bg-secondary/50 border-border/50 focus:border-accent text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Payment Screenshot (Optional)</Label>
                {screenshotUrl ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-border/50">
                      <img
                        src={screenshotUrl}
                        alt="Payment screenshot"
                        className="w-full max-h-48 object-contain bg-secondary/30"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScreenshotUrl("")}
                      className="border-border/50 text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="screenshot-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center hover:border-accent/50 transition-colors bg-secondary/20">
                        {uploading ? (
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload screenshot
                            </p>
                          </>
                        )}
                      </div>
                    </Label>
                    <Input
                      id="screenshot-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotUpload}
                      disabled={uploading}
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 rounded-xl shadow-glow transition-all duration-300 hover:shadow-glow-lg"
                disabled={submitPaymentMutation.isPending}
              >
                {submitPaymentMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-5 w-5 mr-2" />
                )}
                Submit Payment
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Payment History</h3>
          {loadingPayments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : payments?.length === 0 ? (
            <Card className="glass-card border-border/50">
              <CardContent className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No payment history yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {payments?.map((payment, index) => (
                <Card 
                  key={payment.id} 
                  className="glass-card border-border/50 hover:border-accent/30 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-foreground">₹{payment.amount.toLocaleString()}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground capitalize">{payment.payment_purpose}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          ID: {payment.upi_transaction_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), "PPp")}
                        </p>
                        {payment.status === "rejected" && payment.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">
                            Reason: {payment.rejection_reason}
                          </p>
                        )}
                      </div>
                      <div>{getStatusBadge(payment.status)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PayRent;