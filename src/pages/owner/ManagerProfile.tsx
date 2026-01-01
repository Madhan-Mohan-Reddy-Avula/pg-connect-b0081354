import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Mail, Building2, Edit2, Save, X, BookOpen, Download, LogOut, Shield, CheckCircle, XCircle } from 'lucide-react';
import { generateUserManual } from '@/utils/generateUserManual';

export default function ManagerProfile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  // Fetch manager profile
  const { data: manager, isLoading: loadingManager } = useQuery({
    queryKey: ['manager-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('managers')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setFormData({
          full_name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch PG info
  const { data: pg, isLoading: loadingPG } = useQuery({
    queryKey: ['manager-pg', manager?.pg_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pgs')
        .select('*')
        .eq('id', manager!.pg_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!manager?.pg_id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('managers')
        .update({
          name: data.full_name,
          phone: data.phone,
        })
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-profile'] });
      setIsEditing(false);
      toast({ title: 'Profile updated', description: 'Your profile has been updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      full_name: manager?.name || '',
      email: manager?.email || '',
      phone: manager?.phone || '',
    });
    setIsEditing(false);
  };

  const permissions = manager ? [
    { label: 'View Guests', value: manager.can_view_guests },
    { label: 'Manage Guests', value: manager.can_manage_guests },
    { label: 'View Rents', value: manager.can_view_rents },
    { label: 'Manage Rents', value: manager.can_manage_rents },
    { label: 'View Payments', value: manager.can_view_payments },
    { label: 'Verify Payments', value: manager.can_verify_payments },
    { label: 'View Rooms', value: manager.can_view_rooms },
    { label: 'Manage Rooms', value: manager.can_manage_rooms },
    { label: 'View Complaints', value: manager.can_view_complaints },
    { label: 'Manage Complaints', value: manager.can_manage_complaints },
    { label: 'View Expenses', value: manager.can_view_expenses },
    { label: 'Manage Expenses', value: manager.can_manage_expenses },
    { label: 'View Announcements', value: manager.can_view_announcements },
    { label: 'Manage Announcements', value: manager.can_manage_announcements },
    { label: 'View Analytics', value: manager.can_view_analytics },
  ] : [];

  if (loadingManager) {
    return (
      <DashboardLayout>
        <div className="space-y-6 pb-24">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!manager) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Manager profile not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => await generateUserManual('manager')}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Manager Manual</span>
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSubmit}
                  disabled={updateProfileMutation.isPending}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter your name"
                      className="bg-muted/50 border-border/50"
                    />
                  ) : (
                    <p className="text-foreground font-medium p-2 bg-muted/30 rounded-lg">
                      {manager.name || 'Not set'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <p className="text-foreground font-medium p-2 bg-muted/30 rounded-lg">
                    {manager.email || 'Not set'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Phone Number
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="bg-muted/50 border-border/50"
                    />
                  ) : (
                    <p className="text-foreground font-medium p-2 bg-muted/30 rounded-lg">
                      {manager.phone || 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* PG Info Card */}
        {pg && (
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Assigned PG
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">PG Name</Label>
                  <p className="text-foreground font-medium p-2 bg-muted/30 rounded-lg">
                    {pg.name}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">City</Label>
                  <p className="text-foreground font-medium p-2 bg-muted/30 rounded-lg">
                    {pg.city}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="text-foreground font-medium p-2 bg-muted/30 rounded-lg">
                    {pg.address}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Owner</Label>
                  <p className="text-foreground font-medium p-2 bg-muted/30 rounded-lg">
                    {pg.owner_name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Permissions Card */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5" />
              My Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
              {permissions.map((perm) => (
                <div 
                  key={perm.label}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    perm.value ? 'bg-green-500/10' : 'bg-muted/30'
                  }`}
                >
                  {perm.value ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${perm.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {perm.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card className="premium-card border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Sign Out</h3>
                <p className="text-sm text-muted-foreground">Sign out from your account</p>
              </div>
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
