import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, Image, User, Phone, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

interface Payment {
  id: string;
  guest_id: string;
  pg_id: string;
  amount: number;
  payment_purpose: string;
  upi_transaction_id: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  guest?: {
    full_name: string;
    phone: string;
  };
}

const PaymentVerification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["owner-payments", user?.id],
    queryFn: async () => {
      const { data: pg } = await supabase
        .from("pgs")
        .select("id")
        .eq("owner_id", user?.id)
        .maybeSingle();

      if (!pg) return [];

      const { data, error } = await supabase
        .from("manual_payments")
        .select(`
          *,
          guest:guests(full_name, phone)
        `)
        .eq("pg_id", pg.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user,
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const updateData: any = {
        status,
        verified_at: status !== "pending" ? new Date().toISOString() : null,
        verified_by: user?.id,
      };
      if (reason) updateData.rejection_reason = reason;

      const { error } = await supabase
        .from("manual_payments")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["owner-payments"] });
      toast({
        title: variables.status === "verified" ? "Payment Verified" : "Payment Rejected",
        description: `Payment has been ${variables.status} successfully`,
      });
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
          <Badge className="bg-gold/20 text-gold border-gold/30 border">
            <Clock className="h-3 w-3 mr-1" />Pending
          </Badge>
        );
    }
  };

  const pendingPayments = payments?.filter(p => p.status === "pending") || [];
  const processedPayments = payments?.filter(p => p.status !== "pending") || [];

  const totalVerified = payments?.filter(p => p.status === "verified").reduce((sum, p) => sum + p.amount, 0) || 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-card border-border/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent" />
            <CardContent className="relative pt-4 pb-4 text-center">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-5 w-5 text-gold" />
              </div>
              <p className="text-2xl font-bold text-foreground">{pendingPayments.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
            <CardContent className="relative pt-4 pb-4 text-center">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {payments?.filter(p => p.status === "verified").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent" />
            <CardContent className="relative pt-4 pb-4 text-center">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {payments?.filter(p => p.status === "rejected").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Total Collected Banner */}
        <Card className="premium-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-transparent to-gold/10" />
          <CardContent className="relative py-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Verified</p>
            <p className="text-4xl font-bold text-foreground">₹{totalVerified.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-gold" />
              <h3 className="text-lg font-semibold text-foreground">Pending Verification</h3>
              <Badge className="bg-gold/20 text-gold border-gold/30 border ml-auto">
                {pendingPayments.length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {pendingPayments.map((payment, index) => (
                <Card 
                  key={payment.id} 
                  className="glass-card border-gold/30 hover:border-gold/50 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="py-4">
                    <div className="space-y-4">
                      {/* Guest Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{payment.guest?.full_name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {payment.guest?.phone}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-accent">₹{payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground capitalize">{payment.payment_purpose}</p>
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
                        <p className="text-xs text-muted-foreground">Transaction ID</p>
                        <p className="font-mono text-sm text-foreground">{payment.upi_transaction_id}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(payment.created_at), "PPp")}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {payment.screenshot_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="border-border/50 text-muted-foreground hover:text-foreground">
                                <Image className="h-4 w-4 mr-1" />
                                View Proof
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-foreground">Payment Screenshot</DialogTitle>
                              </DialogHeader>
                              <img
                                src={payment.screenshot_url}
                                alt="Payment screenshot"
                                className="w-full rounded-lg"
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        <div className="flex-1" />
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border">
                            <DialogHeader>
                              <DialogTitle className="text-foreground">Reject Payment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Input
                                placeholder="Reason for rejection (optional)"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="bg-secondary/50 border-border/50 text-foreground"
                              />
                              <Button
                                variant="destructive"
                                className="w-full"
                                onClick={() => {
                                  updatePaymentMutation.mutate({
                                    id: payment.id,
                                    status: "rejected",
                                    reason: rejectionReason,
                                  });
                                }}
                                disabled={updatePaymentMutation.isPending}
                              >
                                {updatePaymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Confirm Rejection
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          onClick={() => updatePaymentMutation.mutate({ id: payment.id, status: "verified" })}
                          disabled={updatePaymentMutation.isPending}
                        >
                          {updatePaymentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Verify
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Payment History</h3>
          
          {processedPayments.length === 0 ? (
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
              {processedPayments.map((payment, index) => (
                <Card 
                  key={payment.id} 
                  className="glass-card border-border/50 hover:border-accent/30 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{payment.guest?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{payment.amount.toLocaleString()} • {payment.payment_purpose}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {payment.upi_transaction_id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {getStatusBadge(payment.status)}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), "PP")}
                        </p>
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

export default PaymentVerification;