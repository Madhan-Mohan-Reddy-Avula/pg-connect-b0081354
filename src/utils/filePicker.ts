import { Capacitor } from '@capacitor/core';
import { FilePicker, PickFilesResult } from '@capawesome/capacitor-file-picker';

export interface PickedFile {
  name: string;
  blob: Blob;
  mimeType: string;
}

/**
 * Pick an image file from the device gallery
 * Works on both web and native (Android/iOS) platforms
 */
export const pickImageFile = async (): Promise<PickedFile | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const result: PickFilesResult = await FilePicker.pickImages({
        limit: 1,
        readData: true,
      });

      if (result.files.length > 0) {
        const file = result.files[0];
        
        if (!file.data) {
          throw new Error('No file data received');
        }

        // Convert base64 to blob
        const base64Data = file.data;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.mimeType || 'image/jpeg' });

        return {
          name: file.name || `image-${Date.now()}.jpg`,
          blob,
          mimeType: file.mimeType || 'image/jpeg',
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error picking file on native:', error);
      throw error;
    }
  } else {
    // Web fallback - use standard file input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve({
            name: file.name,
            blob: file,
            mimeType: file.type,
          });
        } else {
          resolve(null);
        }
      };
      
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
};

/**
 * Pick any file from the device
 * Works on both web and native (Android/iOS) platforms
 */
export const pickAnyFile = async (accept?: string): Promise<PickedFile | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const result: PickFilesResult = await FilePicker.pickFiles({
        limit: 1,
        readData: true,
      });

      if (result.files.length > 0) {
        const file = result.files[0];
        
        if (!file.data) {
          throw new Error('No file data received');
        }

        // Convert base64 to blob
        const base64Data = file.data;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.mimeType || 'application/octet-stream' });

        return {
          name: file.name || `file-${Date.now()}`,
          blob,
          mimeType: file.mimeType || 'application/octet-stream',
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error picking file on native:', error);
      throw error;
    }
  } else {
    // Web fallback - use standard file input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (accept) input.accept = accept;
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve({
            name: file.name,
            blob: file,
            mimeType: file.type,
          });
        } else {
          resolve(null);
        }
      };
      
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
};
