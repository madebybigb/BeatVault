import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePWA() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check installation status
  useEffect(() => {
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isAndroidInstalled = document.referrer.includes('android-app://');
      
      setIsInstalled(isStandalone || isInWebAppiOS || isAndroidInstalled);
    };

    checkInstallStatus();

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          setServiceWorkerRegistration(registration);
          
          // Check push support
          setPushSupported('PushManager' in window && 'Notification' in window);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Check existing push subscription
  useEffect(() => {
    if (serviceWorkerRegistration && pushSupported && isAuthenticated) {
      serviceWorkerRegistration.pushManager.getSubscription()
        .then((subscription) => {
          setIsSubscribed(!!subscription);
        })
        .catch((error) => {
          console.error('Error checking push subscription:', error);
        });
    }
  }, [serviceWorkerRegistration, pushSupported, isAuthenticated]);

  // Install app
  const installApp = async (): Promise<boolean> => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      toast({
        title: "Installation failed",
        description: "Could not install the app. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribeToPush = async (): Promise<boolean> => {
    if (!serviceWorkerRegistration || !pushSupported || !isAuthenticated) {
      toast({
        title: "Push notifications not supported",
        description: "Your device doesn't support push notifications",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: "Permission denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        });
        return false;
      }

      // Create push subscription
      const subscription = await serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HI8EzI6mLBp-c0LM1VD-MzJYJrZ1JgUh5YrO8-qWfQHPF5K8xDBFV8-4h0'
        )
      });

      // Send subscription to server
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      await apiRequest('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: subscriptionData,
          userAgent: navigator.userAgent
        })
      });

      setIsSubscribed(true);
      toast({
        title: "Notifications enabled",
        description: "You'll receive updates about new beats and challenges",
      });
      
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      toast({
        title: "Subscription failed",
        description: "Could not enable push notifications",
        variant: "destructive",
      });
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async (): Promise<boolean> => {
    if (!serviceWorkerRegistration || !isAuthenticated) return false;

    try {
      const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
      if (!subscription) return true;

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Remove from server
      await apiRequest('/api/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      setIsSubscribed(false);
      toast({
        title: "Notifications disabled",
        description: "Push notifications have been turned off",
      });
      
      return true;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      toast({
        title: "Unsubscribe failed",
        description: "Could not disable push notifications",
        variant: "destructive",
      });
      return false;
    }
  };

  // Add to home screen (for iOS)
  const addToHomeScreen = () => {
    if (isInstalled) return false;

    // For iOS Safari
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) {
      toast({
        title: "Add to Home Screen",
        description: "Tap the share button and select 'Add to Home Screen'",
      });
      return true;
    }

    // For other browsers, try the install prompt
    return installApp();
  };

  return {
    // State
    isInstalled,
    isInstallable,
    pushSupported,
    isSubscribed,
    serviceWorkerRegistration,
    
    // Actions
    installApp,
    subscribeToPush,
    unsubscribeFromPush,
    addToHomeScreen
  };
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return window.btoa(binary);
}