import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, FileText, Trash2 } from 'lucide-react';
import { getDownloadHistory, clearDownloadHistory, DownloadHistoryItem } from '@/utils/saveFileMobile';
import { format } from 'date-fns';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export function DownloadHistory() {
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  useEffect(() => {
    setHistory(getDownloadHistory());
  }, []);

  const handleClearHistory = () => {
    clearDownloadHistory();
    setHistory([]);
    setClearConfirmOpen(false);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-5 h-5 text-foreground" />
            Recent Downloads
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setClearConfirmOpen(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
            >
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.fileType} • {format(new Date(item.downloadedAt), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))}
          {history.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{history.length - 5} more downloads
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Clear Download History"
        description="Are you sure you want to clear your download history? This won't delete the actual files."
        confirmText="Clear History"
        cancelText="Cancel"
        onConfirm={handleClearHistory}
        variant="destructive"
      />
    </>
  );
}
