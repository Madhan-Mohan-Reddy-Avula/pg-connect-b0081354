import { Building2 } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* Logo */}
      <div className="relative animate-fade-in">
        <div className="w-20 h-20 rounded-2xl btn-gradient shadow-glow flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 text-primary-foreground" />
        </div>
        
        {/* Loading ring */}
        <div className="absolute inset-0 w-20 h-20 rounded-2xl border-2 border-primary/30 animate-ping" />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2 animate-fade-in">PG Manager</h1>
      <p className="text-muted-foreground text-sm animate-fade-in">Loading your dashboard...</p>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-6">
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
