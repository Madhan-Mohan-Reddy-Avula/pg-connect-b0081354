import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from '@/hooks/use-toast';

export interface DownloadHistoryItem {
  id: string;
  fileName: string;
  fileType: string;
  downloadedAt: string;
  filePath?: string;
}

const DOWNLOAD_HISTORY_KEY = 'download_history';
const MAX_HISTORY_ITEMS = 20;

/**
 * Get download history from localStorage
 */
export const getDownloadHistory = (): DownloadHistoryItem[] => {
  try {
    const history = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

/**
 * Add item to download history
 */
export const addToDownloadHistory = (item: Omit<DownloadHistoryItem, 'id' | 'downloadedAt'>): void => {
  try {
    const history = getDownloadHistory();
    const newItem: DownloadHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      downloadedAt: new Date().toISOString(),
    };
    
    // Add to beginning and limit to MAX_HISTORY_ITEMS
    const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving to download history:', error);
  }
};

/**
 * Clear download history
 */
export const clearDownloadHistory = (): void => {
  localStorage.removeItem(DOWNLOAD_HISTORY_KEY);
};

export type SaveAction = 'save' | 'share';

/**
 * Saves or shares a file on mobile (Capacitor) environments
 * @param blob - The file blob to save
 * @param fileName - The name of the file
 * @param action - 'save' to save to device, 'share' to open share dialog
 * @param fileType - Optional file type for history (e.g., 'ID Document', 'Receipt')
 */
export const saveFileToDevice = async (
  blob: Blob,
  fileName: string,
  action: SaveAction = 'save',
  fileType: string = 'Document'
): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const base64Data = await base64Promise;
      
      if (action === 'share') {
        // Save temporarily and then share
        const tempResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });
        
        await Share.share({
          title: fileName,
          url: tempResult.uri,
          dialogTitle: 'Share Document',
        });
        
        // Add to history
        addToDownloadHistory({ fileName, fileType, filePath: tempResult.uri });
        
        toast({
          title: "Share opened",
          description: `Choose where to share ${fileName}`,
        });
        
        return true;
      } else {
        // Save to Downloads folder
        let result;
        try {
          // Try external storage first (Android Downloads folder)
          result = await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
          console.log('File saved to Downloads:', result.uri);
        } catch (externalError) {
          console.log('External storage not available, using Documents folder');
          // Fallback to Documents directory
          result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
          });
          console.log('File saved to Documents:', result.uri);
        }
        
        // Add to history
        addToDownloadHistory({ fileName, fileType, filePath: result.uri });
        
        toast({
          title: "File Downloaded",
          description: `${fileName} has been saved to your device.`,
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error saving file on mobile:', error);
      toast({
        title: "Download Failed",
        description: "Could not save file. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  } else {
    // Standard web download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Add to history
    addToDownloadHistory({ fileName, fileType });
    
    toast({
      title: "File Downloaded",
      description: `${fileName} has been downloaded.`,
    });
    
    return true;
  }
};
