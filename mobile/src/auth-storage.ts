import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryStorage = new Map<string, string>();
let canUseNativeStorage = true;

function disableNativeStorage(error: unknown) {
  canUseNativeStorage = false;
  console.warn("[kolo:mobile-storage]", getErrorMessage(error));
}

export const authStorage = {
  async getItem(key: string) {
    if (!canUseNativeStorage) {
      return memoryStorage.get(key) ?? null;
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      disableNativeStorage(error);

      return memoryStorage.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value);

    if (!canUseNativeStorage) {
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      disableNativeStorage(error);
    }
  },
  async removeItem(key: string) {
    memoryStorage.delete(key);

    if (!canUseNativeStorage) {
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      disableNativeStorage(error);
    }
  },
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Native storage unavailable";
}
