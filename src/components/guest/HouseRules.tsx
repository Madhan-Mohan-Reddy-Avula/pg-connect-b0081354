import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface HouseRulesProps {
  rules?: string | null;
  pgName?: string;
}

export function HouseRules({ rules, pgName }: HouseRulesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!rules || rules.trim() === '') return null;

  const shouldTruncate = rules.length > 300;
  const displayedRules = shouldTruncate && !isExpanded 
    ? rules.slice(0, 300) + '...' 
    : rules;

  return (
    <Card className="premium-card border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <ScrollText className="w-5 h-5 text-primary" />
          House Rules
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/20">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {displayedRules}
          </p>
          
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-primary hover:text-primary/80 p-0 h-auto"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Read more
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
