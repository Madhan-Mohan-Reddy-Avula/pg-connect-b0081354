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
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Mail, FileText, Upload, Eye, AlertCircle } from 'lucide-react';

interface Document {
  id: string;
  document_type: string;
  document_url: string;
  uploaded_at: string;
}

export default function GuestProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    emergency_contact: '',
  });

  // Fetch guest profile
  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setFormData({
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || '',
          emergency_contact: data.emergency_contact || '',
        });
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: ['guest-documents', guest?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('guest_id', guest!.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!guest?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('guests')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || null,
          emergency_contact: data.emergency_contact || null,
        })
        .eq('id', guest!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-profile'] });
      setIsEditing(false);
      toast({ title: 'Profile updated', description: 'Your profile has been updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Upload document
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !guest) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${guest.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('documents').insert({
        guest_id: guest.id,
        document_type: docType,
        document_url: publicUrl,
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['guest-documents'] });
      toast({ title: 'Document uploaded', description: 'Your document has been uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!guest) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">Please contact your PG owner</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl pb-24">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">View and update your personal information</p>
        </div>

        {/* Profile Card */}
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-foreground" />
              Personal Information
            </CardTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="bg-secondary/50 border-border"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-secondary/50 border-border"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-secondary/50 border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency Contact</Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="bg-secondary/50 border-border"
                    placeholder="Emergency contact number"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        full_name: guest.full_name,
                        phone: guest.phone,
                        email: guest.email || '',
                        emergency_contact: guest.emergency_contact || '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-foreground text-background hover:bg-foreground/90" disabled={updateProfileMutation.isPending}>
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{guest.full_name}</p>
                    <Badge variant={guest.status === 'active' ? 'default' : 'secondary'}>
                      {guest.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{guest.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{guest.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                {guest.emergency_contact && (
                  <div className="flex items-center gap-3 pt-2">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Emergency Contact</p>
                      <p className="font-medium">{guest.emergency_contact}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents Card */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-foreground" />
              ID Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Section */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload your ID proof (Aadhar, PAN, Passport, etc.)
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'Aadhar Card')}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>Aadhar Card</span>
                  </Button>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'PAN Card')}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>PAN Card</span>
                  </Button>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'Other ID')}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>Other ID</span>
                  </Button>
                </label>
              </div>
              {uploading && (
                <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
              )}
            </div>

            {/* Uploaded Documents List */}
            {documents && documents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Uploaded Documents</p>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.document_type}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.document_url, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No documents uploaded yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
