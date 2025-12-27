import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  LayoutDashboard, 
  Home, 
  Users, 
  BedDouble, 
  Receipt, 
  MessageSquare,
  User,
  LogOut,
  BarChart3,
  QrCode,
  CheckSquare,
  Wallet,
  Moon,
  Sun,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const ownerNavItems = [
  { href: '/owner', label: 'Home', icon: LayoutDashboard },
  { href: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/owner/pg', label: 'My PG', icon: Home },
  { href: '/owner/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/owner/guests', label: 'Guests', icon: Users },
  { href: '/owner/rents', label: 'Rent', icon: Receipt },
  { href: '/owner/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/owner/upi', label: 'UPI', icon: QrCode },
  { href: '/owner/payments', label: 'Verify', icon: CheckSquare },
  { href: '/owner/complaints', label: 'Issues', icon: MessageSquare },
];

const guestNavItems = [
  { href: '/guest', label: 'Home', icon: LayoutDashboard },
  { href: '/guest/profile', label: 'Profile', icon: User },
  { href: '/guest/pay', label: 'Pay', icon: Wallet },
  { href: '/guest/complaints', label: 'Issues', icon: MessageSquare },
];

// Bottom nav items (max 5 for mobile)
const ownerBottomNav = [
  { href: '/owner', label: 'Home', icon: LayoutDashboard },
  { href: '/owner/guests', label: 'Guests', icon: Users },
  { href: '/owner/payments', label: 'Verify', icon: CheckSquare },
  { href: '/owner/rents', label: 'Rent', icon: Receipt },
  { href: '/owner/analytics', label: 'Stats', icon: BarChart3 },
];

const guestBottomNav = [
  { href: '/guest', label: 'Home', icon: LayoutDashboard },
  { href: '/guest/pay', label: 'Pay', icon: Wallet },
  { href: '/guest/complaints', label: 'Issues', icon: MessageSquare },
  { href: '/guest/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  useEffect(() => {
    // Check localStorage on mount
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const navItems = role === 'owner' ? ownerNavItems : guestNavItems;
  const bottomNavItems = role === 'owner' ? ownerBottomNav : guestBottomNav;

  const handleSignOut = async () => {
    navigate('/auth', { replace: true });
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">PG Manager</h1>
              <p className="text-xs text-muted-foreground capitalize">{role} Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "" : "group-hover:scale-110")} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-border flex items-center justify-center">
              <User className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
              onClick={toggleTheme}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              className="flex-1 justify-start text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">PG Manager</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-card border-t border-border z-50 px-2 safe-area-pb">
        <div className="flex items-center justify-around h-full">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[60px]",
                  isActive 
                    ? "text-foreground" 
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive ? "bg-primary/10" : ""
                )}>
                  <Icon className={cn("w-5 h-5", isActive ? "text-foreground" : "")} />
                </div>
                <span className={cn("text-[10px] font-medium", isActive ? "text-foreground" : "")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 pb-24 lg:pb-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
