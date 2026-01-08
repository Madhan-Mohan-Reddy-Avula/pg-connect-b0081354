import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone, Loader2, CheckCircle2, XCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface SecuritySettingsProps {
  className?: string;
}

export function SecuritySettings({ className }: SecuritySettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [otpauthUri, setOtpauthUri] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Fetch 2FA status
  const { data: twoFactorEnabled, isLoading } = useQuery({
    queryKey: ['2fa-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('user_id', user?.id)
        .single();
      
      if (error) return false;
      return data?.two_factor_enabled || false;
    },
    enabled: !!user?.id,
  });

  // Setup 2FA mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/2fa-setup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to setup 2FA');
      return result;
    },
    onSuccess: (data) => {
      setOtpauthUri(data.otpauthUri);
      setSetupDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Setup failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Verify OTP mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ otp, action }: { otp: string; action: 'enable' | 'disable' }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/2fa-verify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp, action }),
        }
      );
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Verification failed');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      setSetupDialogOpen(false);
      setDisableDialogOpen(false);
      setOtp('');
      setOtpauthUri('');
      
      toast({
        title: variables.action === 'enable' ? '2FA Enabled' : '2FA Disabled',
        description: variables.action === 'enable' 
          ? 'Two-factor authentication is now active on your account'
          : 'Two-factor authentication has been disabled',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEnable2FA = () => {
    setupMutation.mutate();
  };

  const handleDisable2FA = () => {
    setDisableDialogOpen(true);
  };

  const handleVerifyAndEnable = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);
    await verifyMutation.mutateAsync({ otp, action: 'enable' });
    setVerifying(false);
  };

  const handleVerifyAndDisable = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);
    await verifyMutation.mutateAsync({ otp, action: 'disable' });
    setVerifying(false);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`premium-card ${className}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Protect your account with additional security measures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2FA Toggle */}
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Google Authenticator</p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security using TOTP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {twoFactorEnabled ? (
                <span className="flex items-center gap-1.5 text-sm text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  Enabled
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4" />
                  Disabled
                </span>
              )}
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleEnable2FA();
                  } else {
                    handleDisable2FA();
                  }
                }}
                disabled={setupMutation.isPending}
              />
            </div>
          </div>

          {twoFactorEnabled && (
            <p className="text-sm text-muted-foreground bg-green-500/10 text-green-600 p-3 rounded-lg">
              ✓ Your account is protected with two-factor authentication. You'll need to enter a code from Google Authenticator when signing in.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Setup 2FA Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Set Up Google Authenticator
            </DialogTitle>
            <DialogDescription>
              Scan the QR code below with your Google Authenticator app, then enter the 6-digit code to verify.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* QR Code */}
            {otpauthUri && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-xl shadow-inner">
                  <QRCodeSVG value={otpauthUri} size={180} level="M" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Can't scan? Open Google Authenticator and add manually.
                </p>
              </div>
            )}

            {/* OTP Input */}
            <div className="space-y-3">
              <Label>Enter the 6-digit code</Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={verifying}
              >
                <InputOTPGroup className="gap-2 justify-center w-full">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="w-12 h-14 text-lg bg-secondary/50 border-border/50 rounded-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setSetupDialogOpen(false);
              setOtp('');
              setOtpauthUri('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyAndEnable}
              disabled={otp.length !== 6 || verifying}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Enable'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from Google Authenticator to confirm disabling 2FA.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="p-4 bg-destructive/10 rounded-xl">
              <p className="text-sm text-destructive">
                ⚠️ Disabling 2FA will make your account less secure. Make sure you understand the risks.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Enter the 6-digit code</Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={verifying}
              >
                <InputOTPGroup className="gap-2 justify-center w-full">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="w-12 h-14 text-lg bg-secondary/50 border-border/50 rounded-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setDisableDialogOpen(false);
              setOtp('');
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVerifyAndDisable}
              disabled={otp.length !== 6 || verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Disable 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
