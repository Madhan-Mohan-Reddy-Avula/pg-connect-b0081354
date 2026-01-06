import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';
import { addToDownloadHistory } from '@/utils/saveFileMobile';

/**
 * Saves a PDF file - handles both web and mobile (Capacitor) environments
 * On web: Uses standard browser download
 * On mobile: Saves to device Downloads folder and shows confirmation
 */
export const savePdfToDevice = async (doc: jsPDF, fileName: string, fileType: string = 'PDF'): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Get PDF as base64
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      // Try to save to Downloads directory first (Android)
      let result;
      try {
        // On Android, try to save to external storage Downloads folder
        result = await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: pdfBase64,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
        console.log('PDF saved to Downloads:', result.uri);
      } catch (externalError) {
        console.log('External storage not available, using Documents folder');
        // Fallback to Documents directory (works on both iOS and Android)
        result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Documents,
        });
        console.log('PDF saved to Documents:', result.uri);
      }
      
      // Add to download history
      addToDownloadHistory({ fileName, fileType, filePath: result.uri });
      
      // Show success toast with file location
      toast({
        title: "PDF Downloaded",
        description: `${fileName} has been saved to your device.`,
      });
      
    } catch (error) {
      console.error('Error saving PDF on mobile:', error);
      
      // Fallback: try to open in browser
      try {
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        
        toast({
          title: "PDF Opened",
          description: "PDF opened in browser. Use your browser's save option to download.",
        });
      } catch (fallbackError) {
        toast({
          title: "Download Failed",
          description: "Could not save PDF. Please try again.",
          variant: "destructive",
        });
      }
    }
  } else {
    // Standard web download
    doc.save(fileName);
    
    // Add to download history
    addToDownloadHistory({ fileName, fileType });
    
    toast({
      title: "PDF Downloaded",
      description: `${fileName} has been downloaded.`,
    });
  }
};
