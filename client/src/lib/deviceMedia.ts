import { Camera as DeviceCamera } from "@capacitor/camera";
import {
  CameraDirection,
  EncodingType,
  MediaTypeSelection,
  type CameraPermissionState,
  type MediaResult,
} from "@capacitor/camera";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type DevicePermissionResult = "granted" | "denied";
export type DeviceLocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};
export type DeviceOrientationSnapshot = {
  heading: number | null;
  pitch: number | null;
  roll: number | null;
};
export type DeviceConnectionSnapshot = {
  online: boolean;
  label: string;
};
export type PendingEstimatorAction = "gallery";
type NativePermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "prompt-with-rationale";
type DevicePermissionsPlugin = {
  check: (options: {
    permission: "camera" | "photos" | "location" | "bluetooth";
  }) => Promise<{ state: NativePermissionState }>;
  request: (options: {
    permission: "camera" | "photos" | "location" | "bluetooth";
  }) => Promise<{ state: NativePermissionState }>;
};

const PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PENDING_ESTIMATOR_ACTION_KEY = "easy-asphalt:pending-estimator-action";
const DevicePermissions = registerPlugin<DevicePermissionsPlugin>(
  "DevicePermissions"
);

export function isNativeMobileApp() {
  return Capacitor.isNativePlatform();
}

export function schedulePendingGalleryLaunch() {
  schedulePendingEstimatorAction("gallery");
}

export function schedulePendingEstimatorAction(action: PendingEstimatorAction) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_ESTIMATOR_ACTION_KEY, action);
}

export function consumePendingEstimatorAction(): PendingEstimatorAction | null {
  if (typeof window === "undefined") return null;

  const pendingAction = window.sessionStorage.getItem(
    PENDING_ESTIMATOR_ACTION_KEY
  );
  window.sessionStorage.removeItem(PENDING_ESTIMATOR_ACTION_KEY);

  if (pendingAction === "gallery") {
    return pendingAction;
  }

  return null;
}

export function isAllowedPermissionState(
  state: CameraPermissionState | "prompt" | "prompt-with-rationale"
) {
  return state === "granted" || state === "limited";
}

type BrowserPermissionName =
  | "camera"
  | "geolocation"
  | "local-fonts"
  | "microphone"
  | "notifications"
  | "persistent-storage"
  | "push"
  | "screen-wake-lock";

async function queryBrowserPermission(
  name: BrowserPermissionName
): Promise<DevicePermissionResult | null> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return null;
  }

  try {
    const status = await navigator.permissions.query({
      name,
    } as PermissionDescriptor);

    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return null;
  } catch {
    return null;
  }
}

export async function checkNativeCameraPermission(): Promise<DevicePermissionResult | null> {
  if (isNativeMobileApp()) {
    try {
      const status = await DevicePermissions.check({ permission: "camera" });
      return status.state === "granted" ? "granted" : null;
    } catch {
      return null;
    }
  }

  return queryBrowserPermission("camera");
}

export async function checkNativePhotoPermission(): Promise<DevicePermissionResult | null> {
  if (isNativeMobileApp()) {
    try {
      const status = await DevicePermissions.check({ permission: "photos" });
      return status.state === "granted" ? "granted" : null;
    } catch {
      return null;
    }
  }

  return "granted";
}

export async function checkDeviceLocationPermission(): Promise<DevicePermissionResult | null> {
  if (isNativeMobileApp()) {
    try {
      const status = await DevicePermissions.check({ permission: "location" });
      return status.state === "granted" ? "granted" : null;
    } catch {
      return null;
    }
  }

  return queryBrowserPermission("geolocation");
}

export async function checkMotionSensorPermission(): Promise<DevicePermissionResult | null> {
  const motionRequester = getMotionPermissionRequester("DeviceMotionEvent");
  const orientationRequester = getMotionPermissionRequester(
    "DeviceOrientationEvent"
  );

  return typeof motionRequester?.requestPermission === "function" ||
    typeof orientationRequester?.requestPermission === "function"
    ? null
    : "granted";
}

export async function checkNetworkAccessPermission(): Promise<DevicePermissionResult | null> {
  if (typeof navigator === "undefined") return null;

  return navigator.onLine ? "granted" : "denied";
}

export async function checkBluetoothAccessPermission(): Promise<DevicePermissionResult | null> {
  if (isNativeMobileApp()) {
    try {
      const status = await DevicePermissions.check({ permission: "bluetooth" });
      return status.state === "granted" ? "granted" : null;
    } catch {
      return null;
    }
  }

  const available = await getBluetoothAvailability();

  if (available !== true) return available === false ? "denied" : null;

  const bluetooth = (
    navigator as Navigator & {
      bluetooth?: {
        requestDevice?: (options: {
          acceptAllDevices: boolean;
        }) => Promise<unknown>;
      };
    }
  ).bluetooth;

  return typeof bluetooth?.requestDevice === "function" ? null : "granted";
}

export function normalizeMediaMimeType(
  blobType?: string,
  metadataFormat?: string
) {
  const normalizedBlobType = blobType?.toLowerCase();
  if (normalizedBlobType && PHOTO_MIME_TYPES.has(normalizedBlobType)) {
    return normalizedBlobType;
  }
  if (normalizedBlobType?.startsWith("image/")) {
    return normalizedBlobType;
  }

  const format = metadataFormat?.toLowerCase().replace(/^\./, "");
  if (format === "jpg" || format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  if (format === "heic") return "image/heic";
  if (format === "heif") return "image/heif";

  return "image/jpeg";
}

export function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function base64ToBlob(base64: string, mimeType: string) {
  const payload = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

async function mediaResultToFile(
  media: MediaResult,
  source: "camera" | "gallery"
) {
  const mediaUrl =
    media.webPath ?? (media.uri ? Capacitor.convertFileSrc(media.uri) : "");
  const fallbackMimeType = normalizeMediaMimeType(
    undefined,
    media.metadata?.format
  );

  const blob = mediaUrl
    ? await fetch(mediaUrl).then(response => {
        if (!response.ok) {
          throw new Error("Unable to read selected image");
        }
        return response.blob();
      })
    : media.thumbnail
      ? base64ToBlob(media.thumbnail, fallbackMimeType)
      : null;

  if (!blob) {
    throw new Error("No image was returned by the device");
  }

  const mimeType = normalizeMediaMimeType(blob.type, media.metadata?.format);
  const extension = extensionForMimeType(mimeType);

  return new File([blob], `driveway-${source}-${Date.now()}.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export async function requestNativeCameraPermission(): Promise<DevicePermissionResult> {
  if (!isNativeMobileApp()) {
    if (!navigator.mediaDevices?.getUserMedia) return "denied";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      stream.getTracks().forEach(track => track.stop());
      return "granted";
    } catch {
      return "denied";
    }
  }

  try {
    const status = await DevicePermissions.request({ permission: "camera" });
    return status.state === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export async function requestNativePhotoPermission(): Promise<DevicePermissionResult> {
  if (!isNativeMobileApp()) return "granted";

  try {
    const status = await DevicePermissions.request({ permission: "photos" });
    return status.state === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export async function requestDeviceLocationPermission(): Promise<DevicePermissionResult> {
  if (isNativeMobileApp()) {
    try {
      const status = await DevicePermissions.request({ permission: "location" });
      return status.state === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  if (!navigator.geolocation) return "denied";

  return new Promise<DevicePermissionResult>(resolve => {
    navigator.geolocation.getCurrentPosition(
      () => resolve("granted"),
      () => resolve("denied"),
      {
        enableHighAccuracy: true,
        maximumAge: 5 * 60 * 1000,
        timeout: 10_000,
      }
    );
  });
}

type MotionPermissionRequester = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function getMotionPermissionRequester(
  name: "DeviceMotionEvent" | "DeviceOrientationEvent"
) {
  return (
    globalThis as typeof globalThis & {
      DeviceMotionEvent?: MotionPermissionRequester;
      DeviceOrientationEvent?: MotionPermissionRequester;
    }
  )[name];
}

export async function requestMotionSensorPermission(): Promise<DevicePermissionResult> {
  const motionRequester = getMotionPermissionRequester("DeviceMotionEvent");
  const orientationRequester = getMotionPermissionRequester(
    "DeviceOrientationEvent"
  );

  const requesters = [motionRequester, orientationRequester].filter(
    requester => typeof requester?.requestPermission === "function"
  );

  if (requesters.length === 0) {
    return "granted";
  }

  try {
    const results = await Promise.all(
      requesters.map(requester => requester!.requestPermission!())
    );
    return results.every(result => result === "granted") ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export async function getPreciseDeviceLocation(): Promise<DeviceLocationSnapshot | null> {
  const permission = await requestDeviceLocationPermission();
  if (permission !== "granted") return null;

  if (isNativeMobileApp()) {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      };
    } catch {
      return null;
    }
  }

  if (!navigator.geolocation) return null;

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15_000,
      }
    );
  });
}

export async function captureDeviceOrientation(): Promise<DeviceOrientationSnapshot> {
  const permission = await requestMotionSensorPermission();
  if (permission !== "granted" || typeof window === "undefined") {
    return { heading: null, pitch: null, roll: null };
  }

  return new Promise(resolve => {
    let settled = false;

    const finish = (snapshot: DeviceOrientationSnapshot) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("deviceorientation", handleOrientation);
      resolve(snapshot);
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      finish({
        heading:
          typeof event.alpha === "number"
            ? Math.round(event.alpha * 10) / 10
            : null,
        pitch:
          typeof event.beta === "number"
            ? Math.round(event.beta * 10) / 10
            : null,
        roll:
          typeof event.gamma === "number"
            ? Math.round(event.gamma * 10) / 10
            : null,
      });
    };

    window.addEventListener("deviceorientation", handleOrientation, {
      once: true,
    });

    window.setTimeout(() => {
      finish({ heading: null, pitch: null, roll: null });
    }, 1500);
  });
}

export function getDeviceConnectionSnapshot(): DeviceConnectionSnapshot {
  if (typeof navigator === "undefined") {
    return { online: true, label: "Unknown connection" };
  }

  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        type?: string;
      };
    }
  ).connection;

  const rawLabel = connection?.effectiveType || connection?.type;
  const label = rawLabel ? rawLabel.toUpperCase() : "Unknown connection";

  return {
    online: navigator.onLine,
    label,
  };
}

export async function requestNetworkAccessPermission(): Promise<DevicePermissionResult> {
  if (typeof navigator === "undefined") return "denied";

  return navigator.onLine ? "granted" : "denied";
}

export async function getBluetoothAvailability(): Promise<boolean | null> {
  if (typeof navigator === "undefined") return null;

  const bluetooth = (
    navigator as Navigator & {
      bluetooth?: { getAvailability?: () => Promise<boolean> };
    }
  ).bluetooth;

  if (typeof bluetooth?.getAvailability !== "function") return null;

  try {
    return await bluetooth.getAvailability();
  } catch {
    return null;
  }
}

export async function requestBluetoothAccessPermission(): Promise<DevicePermissionResult> {
  if (typeof navigator === "undefined") return "denied";

  if (isNativeMobileApp()) {
    try {
      const status = await DevicePermissions.request({
        permission: "bluetooth",
      });
      return status.state === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  const bluetooth = (
    navigator as Navigator & {
      bluetooth?: {
        getAvailability?: () => Promise<boolean>;
        requestDevice?: (options: {
          acceptAllDevices: boolean;
        }) => Promise<unknown>;
      };
    }
  ).bluetooth;

  if (!bluetooth) return "denied";

  try {
    if (typeof bluetooth.requestDevice === "function") {
      await bluetooth.requestDevice({ acceptAllDevices: true });
      return "granted";
    }

    if (typeof bluetooth.getAvailability === "function") {
      return (await bluetooth.getAvailability()) ? "granted" : "denied";
    }
  } catch {
    return "denied";
  }

  return "denied";
}

export async function takeDrivewayPhotoWithCamera() {
  if (!isNativeMobileApp()) return null;

  const permission = await requestNativeCameraPermission();
  if (permission !== "granted") {
    throw new Error("Camera permission is required to take a driveway photo");
  }

  const media = await DeviceCamera.takePhoto({
    quality: 90,
    targetWidth: 1920,
    targetHeight: 1920,
    correctOrientation: true,
    encodingType: EncodingType.JPEG,
    saveToGallery: false,
    cameraDirection: CameraDirection.Rear,
    includeMetadata: true,
  });

  return mediaResultToFile(media, "camera");
}

export async function chooseDrivewayPhotoFromGallery() {
  if (!isNativeMobileApp()) return null;

  // Try launching the gallery picker first. On some platforms the picker
  // will allow the user to select an image without needing a separate
  // permission grant. If the call fails due to permission, request the
  // native photos permission once and try again.
  try {
    const media = await DeviceCamera.chooseFromGallery({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      quality: 90,
      targetWidth: 1920,
      targetHeight: 1920,
      correctOrientation: true,
      includeMetadata: true,
    });
    const photo = media.results[0];
    if (!photo) return null;
    return mediaResultToFile(photo, "gallery");
  } catch (err) {
    // If selection was cancelled, rethrow so callers can detect cancellation.
    if (isMediaSelectionCanceled(err)) throw err;

    // Request photos permission once and retry. If still failing, surface
    // the original error to the caller.
    const permission = await requestNativePhotoPermission();
    if (permission !== "granted") {
      throw new Error("Photo library permission is required to upload an image");
    }

    const media = await DeviceCamera.chooseFromGallery({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      quality: 90,
      targetWidth: 1920,
      targetHeight: 1920,
      correctOrientation: true,
      includeMetadata: true,
    });
    const photo = media.results[0];
    if (!photo) return null;
    return mediaResultToFile(photo, "gallery");
  }
}

export function isMediaSelectionCanceled(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|cancelled|canceled|dismissed/i.test(message);
}
