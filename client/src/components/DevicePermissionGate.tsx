import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  checkBluetoothAccessPermission,
  checkDeviceLocationPermission,
  checkMotionSensorPermission,
  checkNativeCameraPermission,
  checkNativePhotoPermission,
  checkNetworkAccessPermission,
  requestBluetoothAccessPermission,
  requestDeviceLocationPermission,
  requestMotionSensorPermission,
  requestNativeCameraPermission,
  requestNativePhotoPermission,
  requestNetworkAccessPermission,
} from "@/lib/deviceMedia";
import { useEffect, useRef, useState, type ReactNode } from "react";

type PermissionResult = "granted" | "denied";
type PermissionKey =
  | "camera"
  | "photos"
  | "location"
  | "motion"
  | "network"
  | "bluetooth";

const PERMISSION_REVIEW_PREFIX = "easy-asphalt-device-permissions-v7";
const PERMISSION_SEQUENCE: PermissionKey[] = [
  "camera",
  "photos",
  "location",
  "motion",
  "network",
  "bluetooth",
];

const waitForPermissionPromptToClose = () =>
  new Promise(resolve => window.setTimeout(resolve, 350));

export default function DevicePermissionGate({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const [reviewed, setReviewed] = useState<boolean | null>(null);
  const permissionRunStarted = useRef(false);
  const bootstrapMutation = trpc.auth.bootstrap.useMutation({
    onSuccess: deviceUser => {
      utils.auth.me.setData(undefined, deviceUser);
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    setReviewed(localStorage.getItem(PERMISSION_REVIEW_PREFIX) === "reviewed");
  }, []);

  const ensureDeviceWorkspace = async () => {
    if (user || authLoading || bootstrapMutation.isPending) return;

    try {
      await bootstrapMutation.mutateAsync();
    } catch {
      // The app can still render; routes that need auth will show their own state.
    }
  };

  useEffect(() => {
    if (
      reviewed !== true ||
      user ||
      authLoading ||
      bootstrapMutation.isPending
    ) {
      return;
    }

    void ensureDeviceWorkspace();
  }, [authLoading, bootstrapMutation.isPending, reviewed, user]);

  useEffect(() => {
    if (
      reviewed !== false ||
      permissionRunStarted.current ||
      authLoading ||
      typeof window === "undefined"
    ) {
      return;
    }

    permissionRunStarted.current = true;

    const checks: Record<PermissionKey, () => Promise<PermissionResult | null>> =
      {
        camera: checkNativeCameraPermission,
        photos: checkNativePhotoPermission,
        location: checkDeviceLocationPermission,
        motion: checkMotionSensorPermission,
        network: checkNetworkAccessPermission,
        bluetooth: checkBluetoothAccessPermission,
      };
    const requesters: Record<PermissionKey, () => Promise<PermissionResult>> = {
      camera: requestNativeCameraPermission,
      photos: requestNativePhotoPermission,
      location: requestDeviceLocationPermission,
      motion: requestMotionSensorPermission,
      network: requestNetworkAccessPermission,
      bluetooth: requestBluetoothAccessPermission,
    };

    const requestDevicePermissions = async () => {
      for (const permission of PERMISSION_SEQUENCE) {
        const current = await checks[permission]();

        if (current !== "granted") {
          await requesters[permission]();
          await waitForPermissionPromptToClose();
        }
      }

      localStorage.setItem(PERMISSION_REVIEW_PREFIX, "reviewed");
      setReviewed(true);
      await ensureDeviceWorkspace();
    };

    void requestDevicePermissions();
  }, [authLoading, reviewed]);

  return <>{children}</>;
}
