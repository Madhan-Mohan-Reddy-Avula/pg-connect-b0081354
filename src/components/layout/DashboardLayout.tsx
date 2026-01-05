import { ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useManager } from '@/contexts/ManagerContext';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
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
  TrendingDown,
  Megaphone,
  Settings,
  UserCog,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Permission keys mapped to nav items
type PermissionKey = 'can_view_guests' | 'can_view_rents' | 'can_view_payments' | 'can_view_complaints' | 
  'can_view_expenses' | 'can_view_rooms' | 'can_view_announcements' | 'can_view_analytics';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionKey;
  ownerOnly?: boolean;
}

const ownerNavItems: NavItem[] = [
  { href: '/owner', label: 'Home', icon: LayoutDashboard },
  { href: '/owner/analytics', label: 'Analytics', icon: BarChart3, permission: 'can_view_analytics' },
  { href: '/owner/pg', label: 'My PG', icon: Home, ownerOnly: true },
  { href: '/owner/rooms', label: 'Rooms', icon: BedDouble, permission: 'can_view_rooms' },
  { href: '/owner/guests', label: 'Guests', icon: Users, permission: 'can_view_guests' },
  { href: '/owner/rents', label: 'Rent', icon: Receipt, permission: 'can_view_rents' },
  { href: '/owner/expenses', label: 'Expenses', icon: TrendingDown, permission: 'can_view_expenses' },
  { href: '/owner/announcements', label: 'Announce', icon: Megaphone, permission: 'can_view_announcements' },
  { href: '/owner/upi', label: 'UPI', icon: QrCode, ownerOnly: true },
  { href: '/owner/payments', label: 'Verify', icon: CheckSquare, permission: 'can_view_payments' },
  { href: '/owner/complaints', label: 'Issues', icon: MessageSquare, permission: 'can_view_complaints' },
  { href: '/owner/managers', label: 'Managers', icon: UserCog, ownerOnly: true },
  { href: '/owner/notifications', label: 'Settings', icon: Settings, ownerOnly: true },
  { href: '/owner/notification-center', label: 'Alerts', icon: Bell },
  { href: '/owner/profile', label: 'Profile', icon: User },
];

const guestNavItems: NavItem[] = [
  { href: '/guest', label: 'Home', icon: LayoutDashboard },
  { href: '/guest/profile', label: 'Profile', icon: User },
  { href: '/guest/pay', label: 'Pay', icon: Wallet },
  { href: '/guest/complaints', label: 'Issues', icon: MessageSquare },
  { href: '/guest/notifications', label: 'Alerts', icon: Bell },
];

// Bottom nav items (4 items + More menu for mobile)
const ownerBottomNav: NavItem[] = [
  { href: '/owner', label: 'Home', icon: LayoutDashboard },
  { href: '/owner/guests', label: 'Guests', icon: Users, permission: 'can_view_guests' },
  { href: '/owner/rents', label: 'Rent', icon: Receipt, permission: 'can_view_rents' },
  { href: '/owner/profile', label: 'Profile', icon: User },
];

const guestBottomNav: NavItem[] = [
  { href: '/guest', label: 'Home', icon: LayoutDashboard },
  { href: '/guest/pay', label: 'Pay', icon: Wallet },
  { href: '/guest/complaints', label: 'Issues', icon: MessageSquare },
  { href: '/guest/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { role, signOut, user } = useAuth();
  const { isOwner, isManager, hasPermission, managerData } = useManager();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
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

  // Filter nav items based on permissions for managers
  const filteredNavItems = useMemo(() => {
    const items = role === 'owner' ? ownerNavItems : guestNavItems;
    if (role !== 'owner' || isOwner) return items;
    
    // Manager - filter based on permissions and swap profile link
    return items.filter(item => {
      if (item.ownerOnly) return false;
      if (!item.permission) return true;
      return hasPermission(item.permission);
    }).map(item => {
      // Swap owner profile for manager profile
      if (item.href === '/owner/profile') {
        return { ...item, href: '/owner/manager-profile' };
      }
      return item;
    });
  }, [role, isOwner, hasPermission]);

  const filteredBottomNav = useMemo(() => {
    const items = role === 'owner' ? ownerBottomNav : guestBottomNav;
    if (role !== 'owner' || isOwner) return items;
    
    // Manager - filter based on permissions
    return items.filter(item => {
      if (item.ownerOnly) return false;
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
  }, [role, isOwner, hasPermission]);

  // Items that appear in "More" menu (all nav items not in bottom nav)
  const moreMenuItems = useMemo(() => {
    const bottomHrefs = new Set(filteredBottomNav.map(item => item.href));
    return filteredNavItems.filter(item => !bottomHrefs.has(item.href));
  }, [filteredNavItems, filteredBottomNav]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    // Invalidate all queries to refetch data
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const navItems = filteredNavItems;
  const bottomNavItems = filteredBottomNav;

  const handleSignOut = async () => {
    navigate('/auth', { replace: true });
    await signOut();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground capitalize">{isManager ? 'Manager' : role} Panel</p>
                {isManager && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {managerData?.name}
                  </Badge>
                )}
              </div>
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
              onClick={handleLogoutClick}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-50 px-4 flex items-center justify-between safe-area-pt" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)', height: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
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
            onClick={handleLogoutClick}
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
          
          {/* More Menu Button */}
          {moreMenuItems.length > 0 && (
            <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[60px]",
                    moreMenuOpen ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all duration-300",
                    moreMenuOpen ? "bg-primary/10" : ""
                  )}>
                    <Menu className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">More</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl">
                <SheetHeader className="pb-4">
                  <SheetTitle>More Options</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-4 gap-4 pb-6">
                  {moreMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-medium text-center">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:ml-72 lg:pt-0 pb-24 lg:pb-0 min-h-screen" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
        <PullToRefresh onRefresh={handleRefresh} className="h-full">
          <div className="p-4 lg:p-8 max-w-7xl">
            {children}
          </div>
        </PullToRefresh>
      </main>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out? You will need to log in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleSignOut}
        variant="destructive"
      />
    </div>
  );
}
