// hooks/usePushNotifications.ts
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/.vscode/src/config/firebase';

// Try to import Device, but handle if it's not available
let Device: typeof import('expo-device') | null = null;
try {
  Device = require('expo-device');
} catch (e) {
  console.log('expo-device not available, push notifications may not work');
}

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers the device for push notifications and saves the token to Firestore.
 * Fails silently on simulators or unsupported devices.
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Must be a physical device (skip check if Device module not available)
    if (Device && !Device.isDevice) {
      console.log('Push Notifications: Must use physical device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If still not granted, exit silently
    if (finalStatus !== 'granted') {
      console.log('Push Notifications: Permission not granted');
      return null;
    }

    // Android: Set up notification channel (required for Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ADFF2F', // Neon green to match app theme
        sound: 'default',
      });
    }

    // Get the Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '6af04ced-1a2c-4ff3-a366-390a40b0b95d',
    });
    const token = tokenData.data;

    console.log('Push Notifications: Token generated:', token);
    return token;

  } catch (error) {
    console.log('Push Notifications: Registration failed silently', error);
    return null;
  }
}

/**
 * Custom hook to handle push notification registration.
 * Should be called once when the user logs in.
 */
export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Register for push notifications and save token to Firestore
    const registerAndSaveToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        
        if (token && user) {
          // Save token to user's Firestore document
          await setDoc(
            doc(db, 'users', user.uid),
            { pushToken: token },
            { merge: true } // Don't overwrite other profile data
          );
          console.log('Push Notifications: Token saved to Firestore');
        }
      } catch (error) {
        // Fail silently - don't crash the app
        console.log('Push Notifications: Failed to save token', error);
      }
    };

    registerAndSaveToken();

    // Listen for incoming notifications (when app is in foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Push Notifications: Received:', notification);
    });

    // Listen for user interaction with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Push Notifications: User tapped:', response);
      // You can add navigation logic here based on notification data
      // const data = response.notification.request.content.data;
      // if (data.screen === 'updates') router.push('/updates');
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
}

export { registerForPushNotificationsAsync };
