import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

// Firebase types for push notifications
declare global {
  interface Window {
    firebase?: {
      messaging: () => {
        getToken: (options?: { vapidKey?: string }) => Promise<string>;
        onMessage: (callback: (payload: unknown) => void) => void;
      };
    };
  }
}

interface PushNotificationToken {
  value: string;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const initPushNotifications = async () => {
      if (!user) return;

      try {
        const isNative = Capacitor.isNativePlatform();
        
        if (isNative) {
          // For native apps, we'll use Capacitor Push Notifications
          // Wrap in try-catch to prevent app crash if not properly configured
          try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            
            // Only set as supported, don't auto-request permissions
            // Let user manually enable via button to prevent crashes
            setIsSupported(true);

            // Listen for registration
            PushNotifications.addListener('registration', async (token: PushNotificationToken) => {
              console.log('Push registration success, token:', token.value);
              setToken(token.value);
              
              // Save token to database
              await saveToken(token.value, Capacitor.getPlatform());
            });

            // Listen for registration errors
            PushNotifications.addListener('registrationError', (error: unknown) => {
              console.error('Push registration error:', error);
            });

            // Listen for push notifications received
            PushNotifications.addListener('pushNotificationReceived', (notification: { title?: string; body?: string }) => {
              console.log('Push notification received:', notification);
              toast({
                title: notification.title || 'Notification',
                description: notification.body || '',
              });
            });

            // Listen for push notification action performed
            PushNotifications.addListener('pushNotificationActionPerformed', (action: unknown) => {
              console.log('Push notification action performed:', action);
            });
          } catch (error) {
            console.log('Push notifications not available on this device:', error);
            setIsSupported(false);
          }
        } else {
          // For web, check if browser supports notifications
          if ('Notification' in window && 'serviceWorker' in navigator) {
            setIsSupported(true);
            
            if (Notification.permission === 'granted') {
              // Get FCM token if firebase is configured
              await getWebToken();
            }
          }
        }
      } catch (error) {
        console.log('Error initializing push notifications:', error);
        setIsSupported(false);
      }
    };

    initPushNotifications();
  }, [user]);

  const getWebToken = async () => {
    // Web push with Firebase - requires Firebase configuration
    // This is a placeholder for when Firebase is configured
    console.log('Web push notifications require Firebase configuration');
  };

  const saveToken = async (tokenValue: string, platform: string) => {
    if (!user) return;

    try {
      // Check if token already exists
      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('token', tokenValue)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from('push_tokens')
          .insert({
            user_id: user.id,
            token: tokenValue,
            platform,
          });
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const requestPermission = async () => {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const result = await PushNotifications.requestPermissions();
        
        if (result.receive === 'granted') {
          await PushNotifications.register();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error requesting push permission:', error);
        return false;
      }
    } else {
      // Web notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    }
  };

  return {
    token,
    isSupported,
    requestPermission,
  };
}
