import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Images, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoGalleryProps {
  pgImages: string[];
  roomImages: string[];
  pgName?: string;
  roomNumber?: string;
}

export function PhotoGallery({ pgImages, roomImages, pgName, roomNumber }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentGallery, setCurrentGallery] = useState<'pg' | 'room'>('pg');

  const allImages = currentGallery === 'pg' ? pgImages : roomImages;

  const openLightbox = (index: number, gallery: 'pg' | 'room') => {
    setCurrentGallery(gallery);
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const hasImages = pgImages.length > 0 || roomImages.length > 0;

  if (!hasImages) return null;

  return (
    <>
      <Card className="premium-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Images className="w-5 h-5 text-primary" />
            Photo Gallery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PG Photos */}
          {pgImages.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">{pgName || 'PG'} Photos</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {pgImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => openLightbox(index, 'pg')}
                    className="aspect-square rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-colors"
                  >
                    <img
                      src={image}
                      alt={`${pgName || 'PG'} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Room Photos */}
          {roomImages.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Room {roomNumber || ''} Photos</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {roomImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => openLightbox(index, 'room')}
                    className="aspect-square rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-colors"
                  >
                    <img
                      src={image}
                      alt={`Room photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-background/95 border-border">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-foreground hover:bg-secondary"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="relative aspect-video">
              <img
                src={allImages[currentImageIndex]}
                alt={`Photo ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />
              
              {allImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground hover:bg-secondary/80"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground hover:bg-secondary/80"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </>
              )}
            </div>
            
            <div className="p-3 text-center text-sm text-muted-foreground">
              {currentImageIndex + 1} / {allImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
