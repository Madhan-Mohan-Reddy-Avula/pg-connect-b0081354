import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface AvatarUploadProps {
  bucket: string;
  folder: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export function AvatarUpload({ 
  bucket, 
  folder, 
  value, 
  onChange, 
  fallback = 'PG',
  size = 'lg',
  className
}: AvatarUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast({ title: 'Uploaded', description: 'Profile photo updated successfully' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
      />
      
      <div 
        onClick={() => !uploading && inputRef.current?.click()}
        className="cursor-pointer group relative"
      >
        <Avatar className={cn(sizeClasses[size], 'border-2 border-border')}>
          {uploading ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <AvatarImage src={value || undefined} alt="Profile" className="object-cover" />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {fallback.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        
        {/* Camera overlay on hover */}
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>

        {/* Remove button */}
        {value && !uploading && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-md"
            onClick={handleRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center mt-2">
        Click to {value ? 'change' : 'upload'} photo
      </p>
    </div>
  );
}
