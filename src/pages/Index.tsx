import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, BedDouble, IndianRupee, FileText, MessageSquare, Shield, Clock, BarChart3, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
const features = [{
  icon: Building2,
  title: 'PG Setup',
  description: 'Configure your property with rooms, beds, and house rules in minutes.'
}, {
  icon: BedDouble,
  title: 'Room Management',
  description: 'Organize rooms with automatic bed generation and real-time tracking.'
}, {
  icon: Users,
  title: 'Guest Management',
  description: 'Add guests, assign beds, track check-ins seamlessly.'
}, {
  icon: IndianRupee,
  title: 'Rent Tracking',
  description: 'Track payments, generate reports, send reminders.'
}, {
  icon: FileText,
  title: 'Document Storage',
  description: 'Securely store guest ID proofs and documents.'
}, {
  icon: MessageSquare,
  title: 'Complaint System',
  description: 'Handle complaints with status tracking workflow.'
}];
const benefits = ['Real-time dashboard', 'Automated tracking', 'Secure storage', 'Mobile-first', 'Multi-room support', 'Guest portal'];
export default function Index() {
  return <div className="min-h-screen bg-background overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center shadow-glow-sm">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">PG Manager</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="btn-gradient text-primary-foreground font-semibold shadow-glow-sm hover:shadow-glow transition-shadow">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 border-dashed border-0 border-success">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8 border-none shadow-none border-primary-foreground border-4 px-[14px] py-[10px]">
              <Sparkles className="w-4 h-4" />
              Simplify Your PG Management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
              Manage Your{' '}
              <span className="text-gradient bg-[#7979e6]">PG Business</span>{' '}
              Effortlessly
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The premium platform for PG owners to manage rooms, track rent, 
              handle documentation, and resolve complaints — all from one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="btn-gradient text-primary-foreground w-full sm:w-auto text-lg px-10 py-7 font-semibold shadow-glow hover:shadow-[0_0_60px_hsl(142_76%_52%/0.4)] transition-all duration-300">
                  Start as Owner
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-10 py-7 border-border/50 hover:bg-secondary hover:border-primary/30 transition-all duration-300">
                  Guest Login
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-24 animate-slide-up" style={{
          animationDelay: '0.2s'
        }}>
            {[{
            value: '100%',
            label: 'Free to Start',
            color: 'primary'
          }, {
            value: '24/7',
            label: 'Access',
            color: 'accent'
          }, {
            value: '5min',
            label: 'Quick Setup',
            color: 'primary'
          }, {
            value: 'Secure',
            label: 'Data Protected',
            color: 'accent'
          }].map((stat, i) => <Card key={i} className="premium-card border-border/30 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <p className={`text-3xl sm:text-4xl font-bold mb-1 ${stat.color === 'primary' ? 'text-primary' : 'text-accent'}`}>
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for paying guest accommodation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => <Card key={i} className="group premium-card border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/40 cursor-pointer" style={{
            animationDelay: `${i * 0.1}s`
          }}>
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-glow-sm transition-all duration-300">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Why Choose{' '}
                <span className="text-gradient">PG Manager?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                Built specifically for Indian PG owners and hostels. Our platform understands 
                your unique needs and simplifies day-to-day operations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, i) => <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground font-medium">{benefit}</span>
                  </div>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Card className="premium-card border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-6">
                  <Shield className="w-10 h-10 text-primary mb-4" />
                  <h4 className="font-semibold text-foreground text-lg">Secure</h4>
                  <p className="text-sm text-muted-foreground mt-1">Bank-level security for your data</p>
                </Card>
                <Card className="premium-card border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-6">
                  <Clock className="w-10 h-10 text-accent mb-4" />
                  <h4 className="font-semibold text-foreground text-lg">Save Time</h4>
                  <p className="text-sm text-muted-foreground mt-1">Automate repetitive tasks</p>
                </Card>
              </div>
              <div className="space-y-4 mt-8">
                <Card className="premium-card border-info/20 bg-gradient-to-br from-info/10 to-transparent p-6">
                  <BarChart3 className="w-10 h-10 text-info mb-4" />
                  <h4 className="font-semibold text-foreground text-lg">Insights</h4>
                  <p className="text-sm text-muted-foreground mt-1">Track occupancy & revenue</p>
                </Card>
                <Card className="premium-card border-warning/20 bg-gradient-to-br from-warning/10 to-transparent p-6">
                  <Users className="w-10 h-10 text-warning mb-4" />
                  <h4 className="font-semibold text-foreground text-lg">Guest Portal</h4>
                  <p className="text-sm text-muted-foreground mt-1">Self-service for tenants</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(142_76%_52%_/_0.15),_transparent_70%)]" />
            <CardContent className="p-10 sm:p-16 relative z-10">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  Ready to Simplify Your PG?
                </h2>
                <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                  Join hundreds of PG owners who have streamlined their operations. 
                  Get started in minutes — no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth">
                    <Button size="lg" className="btn-gradient text-primary-foreground w-full sm:w-auto text-lg px-10 py-7 font-semibold shadow-glow hover:shadow-[0_0_60px_hsl(142_76%_52%/0.4)] transition-all duration-300">
                      Create Owner Account
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-10 py-7 border-border/50 hover:bg-secondary hover:border-primary/30 transition-all">
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
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">PG Manager</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PG Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>;
}