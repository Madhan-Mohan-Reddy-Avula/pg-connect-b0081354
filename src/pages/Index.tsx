import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  BedDouble, 
  IndianRupee, 
  FileText, 
  MessageSquare,
  Shield,
  Clock,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'PG Setup',
    description: 'Easily configure your paying guest property with rooms, beds, and house rules.',
  },
  {
    icon: BedDouble,
    title: 'Room & Bed Management',
    description: 'Organize rooms with automatic bed generation and real-time occupancy tracking.',
  },
  {
    icon: Users,
    title: 'Guest Management',
    description: 'Add guests, assign beds, track check-ins, and manage vacate requests seamlessly.',
  },
  {
    icon: IndianRupee,
    title: 'Rent Tracking',
    description: 'Track monthly rent payments, generate reports, and send payment reminders.',
  },
  {
    icon: FileText,
    title: 'Document Storage',
    description: 'Securely store guest ID proofs and important documents in one place.',
  },
  {
    icon: MessageSquare,
    title: 'Complaint System',
    description: 'Handle guest complaints efficiently with status tracking and resolution workflow.',
  },
];

const benefits = [
  'Real-time occupancy dashboard',
  'Automated rent tracking',
  'Secure document storage',
  'Mobile-friendly interface',
  'Multi-room management',
  'Guest self-service portal',
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">PG Manager</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="btn-gradient text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Simplify Your PG Management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Manage Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Paying Guest
              </span>{' '}
              Business Effortlessly
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The all-in-one platform for PG owners to manage rooms, track rent, 
              handle guest documentation, and resolve complaints — all from one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="btn-gradient text-primary-foreground w-full sm:w-auto text-lg px-8 py-6 shadow-glow">
                  Start as Owner
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                  Guest Login
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {[
              { value: '100%', label: 'Free to Start' },
              { value: '24/7', label: 'Access Anywhere' },
              { value: '5min', label: 'Quick Setup' },
              { value: 'Secure', label: 'Data Protected' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
                <p className="text-3xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Run Your PG
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for paying guest accommodation management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card 
                key={i} 
                className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Why Choose PG Manager?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Built specifically for Indian PG owners and hostels, our platform understands 
                your unique needs and simplifies day-to-day operations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Card className="p-6 bg-primary/5 border-primary/20">
                  <Shield className="w-10 h-10 text-primary mb-3" />
                  <h4 className="font-semibold text-foreground">Secure</h4>
                  <p className="text-sm text-muted-foreground">Bank-level security for your data</p>
                </Card>
                <Card className="p-6 bg-accent/5 border-accent/20">
                  <Clock className="w-10 h-10 text-accent mb-3" />
                  <h4 className="font-semibold text-foreground">Save Time</h4>
                  <p className="text-sm text-muted-foreground">Automate repetitive tasks</p>
                </Card>
              </div>
              <div className="space-y-4 mt-8">
                <Card className="p-6 bg-info/5 border-info/20">
                  <BarChart3 className="w-10 h-10 text-info mb-3" />
                  <h4 className="font-semibold text-foreground">Insights</h4>
                  <p className="text-sm text-muted-foreground">Track occupancy & revenue</p>
                </Card>
                <Card className="p-6 bg-warning/5 border-warning/20">
                  <Users className="w-10 h-10 text-warning mb-3" />
                  <h4 className="font-semibold text-foreground">Guest Portal</h4>
                  <p className="text-sm text-muted-foreground">Self-service for tenants</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="hero-gradient text-primary-foreground overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxOS44ODIgMCAxOC04LjA1OSAxOC0xOHMtOC4wNTktMTgtMTgtMTh6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-30" />
            <CardContent className="p-8 sm:p-12 relative z-10">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                  Ready to Simplify Your PG Management?
                </h2>
                <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                  Join hundreds of PG owners who have streamlined their operations. 
                  Get started in minutes — no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8">
                      Create Owner Account
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="w-full sm:w-auto text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      Sign In as Guest
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">PG Manager</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PG Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
