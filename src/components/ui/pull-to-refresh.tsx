import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  className?: string;
  showSuccessToast?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  className,
  showSuccessToast = true,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const threshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing) return;

    // Only enable pull-to-refresh when scrolled to top
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Resistance effect - the more you pull, the harder it gets
      const resistance = Math.min(diff * 0.4, 120);
      setPullDistance(resistance);
    }
  }, [isRefreshing]);

  const triggerHapticFeedback = useCallback(() => {
    // Use the Vibration API if available (works on most mobile browsers)
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short 50ms vibration
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      // Trigger haptic feedback when refresh starts
      triggerHapticFeedback();

      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // Default behavior: reload the page
          window.location.reload();
        }
        
        // Show success toast
        if (showSuccessToast) {
          toast({
            title: "Data refreshed",
            description: "Your data has been updated successfully.",
          });
        }
      } catch (error) {
        console.error('Refresh failed:', error);
        toast({
          title: "Refresh failed",
          description: "Could not refresh data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh, triggerHapticFeedback]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className={cn("h-full overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? pullDistance : 0 }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 transition-transform",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
            opacity: progress,
          }}
        >
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: pullDistance > 0 ? `translateY(0)` : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
