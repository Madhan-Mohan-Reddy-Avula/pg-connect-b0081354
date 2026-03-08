import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, Sparkles, Key, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export default function GuestAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = (isSignUp: boolean) => {
    try {
      if (isSignUp) {
        authSchema.parse({ email, password, fullName });
        if (inviteCode.length !== 6) {
          setErrors({ inviteCode: 'Please enter the 6-digit invite code from your PG owner' });
          return false;
        }
      } else {
        authSchema.omit({ fullName: true }).parse({ email, password });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    setIsLoading(true);

    // Verify invite code
    const { data: guestRecord, error: checkError } = await supabase
      .from('guests')
      .select('id, user_id')
      .eq('invite_code', inviteCode)
      .eq('status', 'active')
      .maybeSingle();

    if (checkError || !guestRecord) {
      setIsLoading(false);
      toast({ title: 'Invalid invite code', description: 'The invite code is invalid or has already been used.', variant: 'destructive' });
      return;
    }

    if (guestRecord.user_id) {
      setIsLoading(false);
      toast({ title: 'Code already used', description: 'This invite code has already been claimed. Please sign in instead.', variant: 'destructive' });
      return;
    }

    const { error } = await signUp(email, password, fullName, 'guest');
    if (error) {
      setIsLoading(false);
      toast({
        title: 'Sign up failed',
        description: error.message === 'User already registered' ? 'An account with this email already exists.' : error.message,
        variant: 'destructive',
      });
      return;
    }

    // Claim invite
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: claimError } = await supabase.rpc('claim_guest_account', {
        p_invite_code: inviteCode,
        p_user_id: user.id,
      });

      if (claimError) {
        setIsLoading(false);
        toast({ title: 'Failed to link account', description: 'Account created but could not be linked. Contact your PG owner.', variant: 'destructive' });
        return;
      }
    }

    setIsLoading(false);
    toast({ title: 'Account created!', description: 'Welcome to your PG.' });
    navigate('/guest');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setIsLoading(false);
      toast({
        title: 'Sign in failed',
        description: error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message,
        variant: 'destructive',
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role !== 'guest') {
        setIsLoading(false);
        toast({ title: 'Not a guest account', description: 'This account is registered as an owner. Please use the owner login.', variant: 'destructive' });
        await supabase.auth.signOut();
        return;
      }

      setIsLoading(false);
      toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
      navigate('/guest');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-4">
          <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground text-background shadow-lg mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">PG Guest</h1>
          <p className="text-muted-foreground mt-2">Access your PG services</p>
        </div>

        <Card className="premium-card border-border/30 bg-card/80 backdrop-blur-xl">
          <Tabs defaultValue="signin" className="w-full">
            <CardContent className="p-6">
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-xl mb-6">
                <TabsTrigger value="signin" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-0 space-y-0">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" placeholder="you@example.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
                      className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl" />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" type="password" placeholder="••••••••" value={password}
                      onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                      className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl" />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-xl" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-0">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" type="text" placeholder="John Doe" value={fullName}
                      onChange={(e) => setFullName(e.target.value)} disabled={isLoading}
                      className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl" />
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
                      className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl" />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={password}
                      onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                      className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl" />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><Key className="w-4 h-4" />Invite Code</Label>
                    <p className="text-xs text-muted-foreground">Enter the 6-digit code provided by your PG owner</p>
                    <InputOTP maxLength={6} value={inviteCode} onChange={(value) => setInviteCode(value)} disabled={isLoading}>
                      <InputOTPGroup className="gap-2 justify-center w-full">
                        <InputOTPSlot index={0} className="w-10 h-12 bg-secondary/50 border-border/50 rounded-lg" />
                        <InputOTPSlot index={1} className="w-10 h-12 bg-secondary/50 border-border/50 rounded-lg" />
                        <InputOTPSlot index={2} className="w-10 h-12 bg-secondary/50 border-border/50 rounded-lg" />
                        <InputOTPSlot index={3} className="w-10 h-12 bg-secondary/50 border-border/50 rounded-lg" />
                        <InputOTPSlot index={4} className="w-10 h-12 bg-secondary/50 border-border/50 rounded-lg" />
                        <InputOTPSlot index={5} className="w-10 h-12 bg-secondary/50 border-border/50 rounded-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                    {errors.inviteCode && <p className="text-sm text-destructive">{errors.inviteCode}</p>}
                  </div>

                  <Button type="submit" className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-xl" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : <><Sparkles className="mr-2 h-4 w-4" />Create Guest Account</>}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
