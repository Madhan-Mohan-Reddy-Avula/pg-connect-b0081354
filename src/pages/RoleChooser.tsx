import { useNavigate } from 'react-router-dom';
import { Building2, Users, ArrowRight } from 'lucide-react';

export default function RoleChooser() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg animate-slide-up space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground text-background shadow-lg mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">PG Connect</h1>
          <p className="text-muted-foreground">Choose how you'd like to continue</p>
        </div>

        {/* Role Cards */}
        <div className="grid gap-4">
          {/* Owner Card */}
          <button
            onClick={() => navigate('/owner/auth')}
            className="group relative w-full text-left p-6 rounded-2xl border-2 border-border bg-card hover:bg-secondary/50 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0 group-hover:bg-foreground/15 transition-colors">
                <Building2 className="w-7 h-7 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground">PG Owner / Manager</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage your PG, rooms, guests & payments
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </button>

          {/* Guest Card */}
          <button
            onClick={() => navigate('/guest/auth')}
            className="group relative w-full text-left p-6 rounded-2xl border-2 border-border bg-card hover:bg-secondary/50 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0 group-hover:bg-foreground/15 transition-colors">
                <Users className="w-7 h-7 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground">PG Guest / Resident</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Pay rent, raise complaints & view announcements
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
