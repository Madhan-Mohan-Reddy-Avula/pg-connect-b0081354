import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Building2, Image } from 'lucide-react';
import { z } from 'zod';
import { MultiImageUpload } from '@/components/ui/image-upload';

const pgSchema = z.object({
  name: z.string().min(2, 'PG name is required').max(100),
  address: z.string().min(5, 'Address is required').max(500),
  city: z.string().min(2, 'City is required').max(100),
  owner_name: z.string().min(2, 'Owner name is required').max(100),
  contact_number: z.string().min(10, 'Valid contact number required').max(15),
  house_rules: z.string().max(2000).optional(),
});

type PGFormData = z.infer<typeof pgSchema>;

interface PGData extends PGFormData {
  id?: string;
  images?: string[];
}

export default function PGSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pgImages, setPgImages] = useState<string[]>([]);
  const [pgData, setPgData] = useState<PGData>({
    name: '',
    address: '',
    city: '',
    owner_name: '',
    contact_number: '',
    house_rules: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchPGData();
    }
  }, [user]);

  const fetchPGData = async () => {
    try {
      const { data, error } = await supabase
        .from('pgs')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPgData({
          id: data.id,
          name: data.name,
          address: data.address,
          city: data.city,
          owner_name: data.owner_name,
          contact_number: data.contact_number,
          house_rules: data.house_rules || '',
        });
        setPgImages(data.images || []);
      }
    } catch (error) {
      console.error('Error fetching PG data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPgData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      pgSchema.parse(pgData);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setSaving(true);

    try {
      if (pgData.id) {
        const { error } = await supabase
          .from('pgs')
          .update({
            name: pgData.name,
            address: pgData.address,
            city: pgData.city,
            owner_name: pgData.owner_name,
            contact_number: pgData.contact_number,
            house_rules: pgData.house_rules,
            images: pgImages,
          })
          .eq('id', pgData.id);

        if (error) throw error;

        toast({
          title: 'PG Updated',
          description: 'Your PG details have been updated successfully.',
        });
      } else {
        const { data, error } = await supabase
          .from('pgs')
          .insert({
            owner_id: user?.id,
            name: pgData.name,
            address: pgData.address,
            city: pgData.city,
            owner_name: pgData.owner_name,
            contact_number: pgData.contact_number,
            house_rules: pgData.house_rules,
            images: pgImages,
          })
          .select()
          .single();

        if (error) throw error;

        setPgData(prev => ({ ...prev, id: data.id }));

        toast({
          title: 'PG Created',
          description: 'Your PG has been set up successfully. Now add some rooms!',
        });
      }
    } catch (error: any) {
      console.error('Error saving PG:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save PG details.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-24">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {pgData.id ? 'Edit PG Details' : 'Set Up Your PG'}
          </h1>
          <p className="text-muted-foreground">
            {pgData.id 
              ? 'Update your PG information and house rules' 
              : 'Enter your PG details to get started'}
          </p>
        </div>

        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-foreground">PG Information</CardTitle>
                <CardDescription className="text-muted-foreground">Basic details about your paying guest accommodation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">PG Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Sunrise PG"
                    value={pgData.name}
                    onChange={handleChange}
                    className="bg-secondary/50 border-border"
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-foreground">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="e.g., Bangalore"
                    value={pgData.city}
                    onChange={handleChange}
                    className="bg-secondary/50 border-border"
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-foreground">Full Address *</Label>
                <Textarea
                  id="address"
                  name="address"
                  placeholder="Enter complete address with landmark"
                  value={pgData.address}
                  onChange={handleChange}
                  rows={2}
                  className="bg-secondary/50 border-border"
                />
                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner_name" className="text-foreground">Owner Name *</Label>
                  <Input
                    id="owner_name"
                    name="owner_name"
                    placeholder="Your full name"
                    value={pgData.owner_name}
                    onChange={handleChange}
                    className="bg-secondary/50 border-border"
                  />
                  {errors.owner_name && <p className="text-sm text-destructive">{errors.owner_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_number" className="text-foreground">Contact Number *</Label>
                  <Input
                    id="contact_number"
                    name="contact_number"
                    placeholder="e.g., 9876543210"
                    value={pgData.contact_number}
                    onChange={handleChange}
                    className="bg-secondary/50 border-border"
                  />
                  {errors.contact_number && <p className="text-sm text-destructive">{errors.contact_number}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="house_rules" className="text-foreground">House Rules</Label>
                <Textarea
                  id="house_rules"
                  name="house_rules"
                  placeholder="Enter house rules, guidelines, and policies for guests..."
                  value={pgData.house_rules}
                  onChange={handleChange}
                  rows={4}
                  className="bg-secondary/50 border-border"
                />
                {errors.house_rules && <p className="text-sm text-destructive">{errors.house_rules}</p>}
              </div>

              {/* PG Images */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  PG Images
                </Label>
                <p className="text-sm text-muted-foreground">Add photos of your PG (visible to guests)</p>
                <MultiImageUpload
                  bucket="pg-images"
                  folder={user?.id || 'unknown'}
                  values={pgImages}
                  onChange={setPgImages}
                maxImages={15}
              />
              <p className="text-xs text-muted-foreground">You can add up to 15 photos</p>
              </div>

              <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {pgData.id ? 'Update PG Details' : 'Create PG'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}