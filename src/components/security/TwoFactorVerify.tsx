import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';

interface TwoFactorVerifyProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorVerify({ userId, onSuccess, onCancel }: TwoFactorVerifyProps) {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    
    setVerifying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-login-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, otp }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok || !result.verified) {
        toast({
          title: 'Invalid code',
          description: 'The verification code is incorrect. Please try again.',
          variant: 'destructive',
        });
        setOtp('');
        setVerifying(false);
        return;
      }
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Verification failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setVerifying(false);
    }
  };

  // Auto-submit when OTP is complete
  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6 && !verifying) {
      setTimeout(() => {
        handleVerify();
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md animate-slide-up">
        <Card className="premium-card border-border/30 bg-card/80 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your Google Authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
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

            <Button
              onClick={handleVerify}
              disabled={otp.length !== 6 || verifying}
              className="w-full h-12 btn-gradient text-primary-foreground font-semibold rounded-xl"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full"
              disabled={verifying}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
