import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Phone, Users, BedDouble, Home, Edit2, IndianRupee, Calendar, Image } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PGInfoCardProps {
  pg: {
    id: string;
    name: string;
    address: string;
    city: string;
    owner_name: string;
    contact_number: string;
    upi_id?: string | null;
    images?: string[] | null;
    house_rules?: string | null;
    avatar_url?: string | null;
    created_at: string;
  };
  stats?: {
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    activeGuests: number;
  };
  showEditButton?: boolean;
}

export function PGInfoCard({ pg, stats, showEditButton = true }: PGInfoCardProps) {
  const createdDate = new Date(pg.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const occupancyRate = stats && stats.totalBeds > 0 
    ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) 
    : 0;

  return (
    <Card className="premium-card border-border/30 overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {pg.avatar_url ? (
              <img 
                src={pg.avatar_url} 
                alt={pg.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-xl text-foreground">{pg.name}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {pg.city}
              </p>
            </div>
          </div>
          {showEditButton && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/owner/pg">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-xl bg-secondary/30">
              <Home className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{stats.totalRooms}</p>
              <p className="text-xs text-muted-foreground">Rooms</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/30">
              <BedDouble className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{stats.totalBeds}</p>
              <p className="text-xs text-muted-foreground">Beds</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/30">
              <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{stats.activeGuests}</p>
              <p className="text-xs text-muted-foreground">Guests</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-primary/10">
              <p className="text-lg font-bold text-primary">{occupancyRate}%</p>
              <p className="text-xs text-muted-foreground">Occupancy</p>
            </div>
          </div>
        )}

        {/* PG Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/20">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Full Address</p>
                <p className="text-sm text-foreground break-words">{pg.address}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/20">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Contact</p>
                <p className="text-sm font-medium text-foreground">{pg.owner_name}</p>
                <p className="text-sm text-muted-foreground">{pg.contact_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/20">
          {pg.upi_id && (
            <Badge variant="outline" className="text-xs">
              <IndianRupee className="w-3 h-3 mr-1" />
              UPI Configured
            </Badge>
          )}
          {pg.images && pg.images.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <Image className="w-3 h-3 mr-1" />
              {pg.images.length} Photos
            </Badge>
          )}
          {pg.house_rules && (
            <Badge variant="outline" className="text-xs">
              House Rules Set
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs ml-auto">
            <Calendar className="w-3 h-3 mr-1" />
            Since {createdDate}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
