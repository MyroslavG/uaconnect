import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import { isSupabaseConfigured, supabase } from "./supabase";
import type { Locale } from "./types";

export type PushNotificationStatus =
  | "denied"
  | "enabled"
  | "idle"
  | "unavailable"
  | "unsupported";

export type PushNotificationRegistrationResult = {
  status: Exclude<PushNotificationStatus, "idle">;
  token?: string;
};

export type PushNotificationData = Record<string, unknown>;

export type PushPermissionState = "askable" | "denied" | "enabled" | "unsupported";

const PUSH_TOKEN_STORAGE_KEY = "kolo-expo-push-token";
const PUSH_DEVICE_ID_STORAGE_KEY = "kolo-push-device-id";
const DEFAULT_CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications({
  locale,
  requestPermission,
}: {
  locale: Locale;
  requestPermission: boolean;
}): Promise<PushNotificationRegistrationResult> {
  if (!isSupabaseConfigured || Platform.OS === "web") {
    return { status: "unsupported" };
  }

  if (Platform.OS === "android" && Constants.appOwnership === "expo") {
    return { status: "unsupported" };
  }

  await ensureAndroidNotificationChannel();

  const permissionStatus = await getPushPermissionStatus(requestPermission);

  if (permissionStatus !== "granted") {
    return { status: requestPermission ? "denied" : "unavailable" };
  }

  const projectId = getExpoProjectId();

  if (!projectId) {
    return { status: "unavailable" };
  }

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    const deviceIdentifier = await getOrCreatePushDeviceId();

    const { error } = await supabase.rpc("register_push_notification_token", {
      app_version: Constants.expoConfig?.version ?? null,
      device_identifier: deviceIdentifier,
      device_locale: locale,
      device_platform: Platform.OS,
      push_token: token,
    });

    if (error) {
      throw error;
    }

    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

    return {
      status: "enabled",
      token,
    };
  } catch (error) {
    console.error("[kolo:mobile-push-register]", error);
    return { status: "unavailable" };
  }
}

export async function syncExistingPushNotificationPermission(locale: Locale) {
  const permissions = await Notifications.getPermissionsAsync().catch(() => null);

  if (!isPushPermissionGranted(permissions)) {
    return { status: "idle" as const };
  }

  return registerForPushNotifications({
    locale,
    requestPermission: false,
  });
}

export async function getPushNotificationPermissionState(): Promise<PushPermissionState> {
  if (!isSupabaseConfigured || Platform.OS === "web") {
    return "unsupported";
  }

  if (Platform.OS === "android" && Constants.appOwnership === "expo") {
    return "unsupported";
  }

  const permissions = await Notifications.getPermissionsAsync().catch(() => null);

  if (isPushPermissionGranted(permissions)) {
    return "enabled";
  }

  return canAskForPushPermission(permissions) ? "askable" : "denied";
}

export async function openPushNotificationSettings() {
  await Linking.openSettings();
}

export async function unregisterStoredPushNotificationToken() {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

  if (!token) {
    return;
  }

  try {
    if (isSupabaseConfigured) {
      await supabase.rpc("unregister_push_notification_token", {
        push_token: token,
      });
    }
  } catch (error) {
    console.error("[kolo:mobile-push-unregister]", error);
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
}

export function getInitialPushNotificationData() {
  try {
    const response = Notifications.getLastNotificationResponse();
    return getPushNotificationData(response);
  } catch {
    return null;
  }
}

export function addPushNotificationTapListener(
  listener: (data: PushNotificationData) => void,
) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = getPushNotificationData(response);

      if (data) {
        listener(data);
      }
    },
  );

  return () => {
    subscription.remove();
  };
}

function getPushNotificationData(
  response: Notifications.NotificationResponse | null,
) {
  const data = response?.notification.request.content.data;

  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as PushNotificationData)
    : null;
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    importance: Notifications.AndroidImportance.MAX,
    lightColor: "#111111",
    name: "Kolo",
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function getPushPermissionStatus(requestPermission: boolean) {
  const existingPermission = await Notifications.getPermissionsAsync();
  let isGranted = isPushPermissionGranted(existingPermission);

  if (!isGranted && requestPermission && canAskForPushPermission(existingPermission)) {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    isGranted = isPushPermissionGranted(requestedPermission);
  }

  return isGranted ? "granted" : "denied";
}

function isPushPermissionGranted(
  permissions: Notifications.NotificationPermissionsStatus | null,
) {
  const permissionState = permissions as
    | (Notifications.NotificationPermissionsStatus & { granted?: boolean })
    | null;

  return Boolean(
    permissionState?.granted ||
      permissionState?.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL,
  );
}

function canAskForPushPermission(
  permissions: Notifications.NotificationPermissionsStatus | null,
) {
  const permissionState = permissions as
    | (Notifications.NotificationPermissionsStatus & { canAskAgain?: boolean })
    | null;

  if (permissionState?.canAskAgain === false) {
    return false;
  }

  if (
    Platform.OS === "ios" &&
    permissionState?.ios?.status === Notifications.IosAuthorizationStatus.DENIED
  ) {
    return false;
  }

  return true;
}

async function getOrCreatePushDeviceId() {
  const existingDeviceId = await AsyncStorage.getItem(PUSH_DEVICE_ID_STORAGE_KEY);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const nextDeviceId = `device-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  await AsyncStorage.setItem(PUSH_DEVICE_ID_STORAGE_KEY, nextDeviceId);

  return nextDeviceId;
}

function getExpoProjectId() {
  type ConstantsWithEas = typeof Constants & {
    easConfig?: {
      projectId?: string;
    } | null;
  };

  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as ConstantsWithEas).easConfig?.projectId ??
    null
  );
}
