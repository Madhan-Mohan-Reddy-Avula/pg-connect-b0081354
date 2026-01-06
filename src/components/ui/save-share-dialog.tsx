import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Share2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface SaveShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onSave: () => void;
  onShare: () => void;
}

export function SaveShareDialog({
  open,
  onOpenChange,
  fileName,
  onSave,
  onShare,
}: SaveShareDialogProps) {
  // Only show dialog on native platforms
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Download Options</AlertDialogTitle>
          <AlertDialogDescription>
            Choose how you want to handle "{fileName}"
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onSave}
            className="w-full bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Save to Device
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onShare}
            className="w-full bg-secondary text-foreground hover:bg-secondary/80 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </AlertDialogAction>
          <AlertDialogCancel className="w-full mt-2">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
