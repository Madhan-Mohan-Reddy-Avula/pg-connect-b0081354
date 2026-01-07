import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Mail, FileText, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

const onboardingSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number is too long'),
  emergency_contact: z.string().optional(),
});

interface GuestOnboardingFormProps {
  onComplete: () => void;
}

export function GuestOnboardingForm({ onComplete }: GuestOnboardingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedDocs, setUploadedDocs] = useState<{ type: string; url: string }[]>([]);
  
  const [formData, setFormData] = useState({
    phone: '',
    emergency_contact: '',
  });

  const validateForm = () => {
    try {
      onboardingSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    if (!user) return;

    setIsLoading(true);
    try {
      // Update the profile with phone number
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: formData.phone,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Move to document upload step
      setStep(2);
      toast({
        title: 'Profile updated',
        description: 'Now you can upload your ID documents',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `pending_guests/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadedDocs((prev) => [...prev, { type: docType, url: fileName }]);

      toast({
        title: 'Document uploaded',
        description: `${docType} has been uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: 'Onboarding complete!',
      description: 'Your profile is ready. Please wait for the PG owner to assign you a room.',
    });
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-1">Help your PG owner get to know you</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
          </div>
          <div className={`w-12 h-1 ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
          </div>
        </div>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-lg">
              {step === 1 ? 'Contact Information' : 'ID Documents'}
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? 'Add your phone number for easy communication'
                : 'Upload your ID documents (Aadhar, PAN, etc.)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12 bg-secondary/50 border-border/50 rounded-xl"
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact" className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Emergency Contact (Optional)
                  </Label>
                  <Input
                    id="emergency_contact"
                    type="tel"
                    placeholder="Emergency contact number"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="h-12 bg-secondary/50 border-border/50 rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="w-full h-12 btn-gradient text-primary-foreground font-semibold rounded-xl mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload your ID proof (optional)
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Aadhar Card', 'PAN Card', 'Other ID'].map((docType) => (
                      <label key={docType} className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, docType)}
                          disabled={uploading}
                        />
                        <Button variant="outline" size="sm" asChild disabled={uploading}>
                          <span>{docType}</span>
                        </Button>
                      </label>
                    ))}
                  </div>
                  {uploading && (
                    <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                  )}
                </div>

                {/* Uploaded Documents */}
                {uploadedDocs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded Documents:</p>
                    {uploadedDocs.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                      >
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">{doc.type}</span>
                        <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="flex-1 btn-gradient text-primary-foreground font-semibold"
                  >
                    Complete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Your PG owner will assign you a room after verification
        </p>
      </div>
    </div>
  );
}
