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
import { Loader2, QrCode, Upload, CheckCircle, Clock, XCircle, AlertCircle, ArrowRight, Smartphone, Download, Phone, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { generateRentReceipt } from "@/utils/generateRentReceipt";

// UPI app icons as simple SVGs
const PhonePeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 13v1c0 1.1.9 2 2 2v2.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V6h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

const GPayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

const PaytmIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-.17.02-.34.03-.51.04V17h-1v3c-.17 0-.34-.01-.51-.02V17h-1v2.88A8.001 8.001 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8a7.999 7.999 0 01-7 7.93zM12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/>
  </svg>
);

interface Payment {
  id: string;
  amount: number;
  payment_purpose: string;
  payment_month: string | null;
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
  const [paymentMonth, setPaymentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [transactionId, setTransactionId] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Fetch guest and PG details
  const { data: guestData, isLoading: loadingGuest } = useQuery({
    queryKey: ["guest-pg-details", user?.id],
    queryFn: async () => {
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .select("id, pg_id, monthly_rent, full_name, phone")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (guestError) throw guestError;
      if (!guest) return null;

      const { data: pg, error: pgError } = await supabase
        .from("pgs")
        .select("id, name, address, city, owner_name, contact_number, upi_id, upi_qr_url, payment_phone")
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
        payment_month: `${paymentMonth}-01`,
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
      setPaymentMonth(format(new Date(), 'yyyy-MM'));
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
          <Badge className="bg-foreground/20 text-foreground border-foreground/30 border">
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
          <Badge className="bg-muted text-muted-foreground border-border border">
            <Clock className="h-3 w-3 mr-1" />Pending
          </Badge>
        );
    }
  };

  if (loadingGuest) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!guestData?.pg?.upi_id && !guestData?.pg?.payment_phone) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="premium-card max-w-md">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
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
          <CardContent className="pt-8 pb-8">
            <p className="text-sm text-muted-foreground mb-2">Monthly Rent</p>
            {guestData.guest.monthly_rent > 0 && (
              <div className="mb-6">
                <span className="text-5xl font-bold text-foreground">₹{guestData.guest.monthly_rent.toLocaleString()}</span>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Scan QR or use UPI ID to pay</p>
          </CardContent>
        </Card>

        {/* UPI Details Card */}
        <Card className="premium-card">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* QR Code */}
              {guestData.pg.upi_qr_url && (
                <div className="flex-shrink-0">
                  <div className="p-3 bg-foreground rounded-2xl">
                    <img
                      src={guestData.pg.upi_qr_url}
                      alt="UPI QR Code"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                </div>
              )}
              
              {/* UPI ID */}
              <div className="flex-1 text-center md:text-left space-y-3">
                {guestData.pg.upi_id && (
                  <div>
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <QrCode className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">UPI ID</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-mono font-semibold text-foreground bg-muted px-4 py-2 rounded-lg">
                        {guestData.pg.upi_id}
                      </p>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(guestData.pg.upi_id!, "UPI ID")}
                        className="h-10 w-10 border-border/50 hover:bg-muted"
                      >
                        {copiedField === "UPI ID" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                {guestData.pg.payment_phone && (
                  <div>
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Payment Phone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-mono font-semibold text-foreground bg-muted px-4 py-2 rounded-lg">
                        {guestData.pg.payment_phone}
                      </p>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(guestData.pg.payment_phone!, "Phone Number")}
                        className="h-10 w-10 border-border/50 hover:bg-muted"
                      >
                        {copiedField === "Phone Number" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Pay with Apps */}
        <Card className="premium-card">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Pay with App</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Click to open app with amount pre-filled
            </p>
            
            {/* Amount input for quick pay */}
            <div className="mb-4">
              <Label className="text-muted-foreground text-sm">Amount to Pay (₹)</Label>
              <Input
                type="number"
                placeholder={guestData.guest.monthly_rent > 0 ? guestData.guest.monthly_rent.toString() : "Enter amount"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                className="bg-muted/50 border-border/50 focus:border-foreground/50 text-foreground placeholder:text-muted-foreground mt-2"
              />
            </div>

            {(() => {
              // Generate proper UPI payment URL
              const payAmount = amount || guestData.guest.monthly_rent || '';
              const payeeName = encodeURIComponent(guestData.pg.name || 'PG Payment');
              
              // Use contact number with @ybl suffix if UPI ID looks like a phone number, otherwise use as-is
              let payeeAddress = guestData.pg.upi_id || '';
              
              // If the upi_id is just a phone number (10 digits), format it properly
              const phoneOnly = payeeAddress.replace(/[^0-9]/g, '');
              if (phoneOnly.length === 10 && !payeeAddress.includes('@')) {
                payeeAddress = `${phoneOnly}@ybl`;
              }
              
              const upiUrl = `upi://pay?pa=${encodeURIComponent(payeeAddress)}&pn=${payeeName}&am=${payAmount}&cu=INR&tn=${encodeURIComponent('PG Rent Payment')}`;
              
              return (
                <div className="grid grid-cols-3 gap-3">
                  {/* PhonePe */}
                  <a
                    href={upiUrl}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#5f259f]/10 hover:bg-[#5f259f]/20 border border-[#5f259f]/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#5f259f] flex items-center justify-center text-white">
                      <PhonePeIcon />
                    </div>
                    <span className="text-sm font-medium text-foreground">PhonePe</span>
                  </a>

                  {/* Google Pay */}
                  <a
                    href={upiUrl}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#4285f4]/10 hover:bg-[#4285f4]/20 border border-[#4285f4]/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#4285f4] flex items-center justify-center text-white">
                      <GPayIcon />
                    </div>
                    <span className="text-sm font-medium text-foreground">GPay</span>
                  </a>

                  {/* Paytm */}
                  <a
                    href={upiUrl}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#00baf2]/10 hover:bg-[#00baf2]/20 border border-[#00baf2]/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#00baf2] flex items-center justify-center text-white">
                      <PaytmIcon />
                    </div>
                    <span className="text-sm font-medium text-foreground">Paytm</span>
                  </a>
                </div>
              );
            })()}

            <p className="text-xs text-muted-foreground mt-4 text-center">
              After payment, submit the transaction ID below for verification
            </p>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="premium-card">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Submit Payment Details</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Payment Purpose</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger className="bg-muted/50 border-border/50 focus:border-foreground/50">
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
                <Label className="text-muted-foreground text-sm">Payment For Month</Label>
                <Input
                  type="month"
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  className="bg-muted/50 border-border/50 focus:border-foreground/50 text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  className="bg-muted/50 border-border/50 focus:border-foreground/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">UPI Transaction ID</Label>
                <Input
                  placeholder="Enter transaction/reference ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="bg-muted/50 border-border/50 focus:border-foreground/50 text-foreground placeholder:text-muted-foreground"
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
                        className="w-full max-h-48 object-contain bg-muted/30"
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
                      <div className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center hover:border-foreground/30 transition-colors bg-muted/20">
                        {uploading ? (
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-foreground" />
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
                className="w-full bg-foreground hover:bg-foreground/90 text-background font-semibold py-6 rounded-xl transition-all duration-300"
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
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            </div>
          ) : payments?.length === 0 ? (
            <Card className="premium-card">
              <CardContent className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
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
                  className="premium-card"
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
                        {payment.payment_month && (
                          <p className="text-xs text-muted-foreground">
                            For: {format(new Date(payment.payment_month), "MMMM yyyy")}
                          </p>
                        )}
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
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(payment.status)}
                        {payment.status === "verified" && guestData?.guest && guestData?.pg && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              generateRentReceipt({
                                guestName: guestData.guest.full_name,
                                guestPhone: guestData.guest.phone,
                                pgName: guestData.pg.name,
                                pgAddress: guestData.pg.address,
                                pgCity: guestData.pg.city,
                                ownerName: guestData.pg.owner_name,
                                ownerContact: guestData.pg.contact_number,
                                amount: payment.amount,
                                paymentPurpose: payment.payment_purpose,
                                paymentMonth: payment.payment_month,
                                transactionId: payment.upi_transaction_id,
                                paymentDate: payment.created_at,
                                status: payment.status,
                              });
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Receipt
                          </Button>
                        )}
                      </div>
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
