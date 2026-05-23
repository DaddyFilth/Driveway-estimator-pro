import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent,
} from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  buildPolygonClipPath,
  createAdditionalCostItem,
  createInitialEstimatorState,
  defaultPreviewPromptByMaterial,
  formatUsd,
  getLiveOverlayStyle,
  materialDisplayNames,
  parseCurrency,
  previewPromptSuggestions,
  type AdditionalCostItem,
  type DeviceReadiness,
  type EstimateExitAction,
  type EstimatorState,
  type LivePreviewStatus,
  type Material,
  type PreviewMode,
  type Step,
} from "@/lib/estimatorModel";
import {
  consumePendingEstimatorAction,
  captureDeviceOrientation,
  chooseDrivewayPhotoFromGallery,
  getBluetoothAvailability,
  getDeviceConnectionSnapshot,
  getPreciseDeviceLocation,
  isMediaSelectionCanceled,
  isNativeMobileApp,
  takeDrivewayPhotoWithCamera,
} from "@/lib/deviceMedia";
import { trpc } from "@/lib/trpc";
import {
  calculateSquareFeetFromCorners,
  type CornerPoint,
} from "@shared/geometry";
import { toast } from "sonner";
import {
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Estimator() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("upload");
  const [state, setState] = useState<EstimatorState>(
    createInitialEstimatorState
  );

  const [loading, setLoading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("static");
  const [livePreviewStatus, setLivePreviewStatus] =
    useState<LivePreviewStatus>("idle");
  const [livePreviewError, setLivePreviewError] = useState<string | null>(null);
  const [estimateDecisionOpen, setEstimateDecisionOpen] = useState(false);
  const [estimateDecisionMode, setEstimateDecisionMode] = useState<
    "decision" | "accepted"
  >("decision");
  const [robotGuideOpen, setRobotGuideOpen] = useState(true);
  const [robotCommand, setRobotCommand] = useState("");
  const [robotResponse, setRobotResponse] = useState(
    "Tell me what to do inside the estimator."
  );
  const [savedProjectId, setSavedProjectId] = useState<number | null>(null);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCostItem[]>([
    createAdditionalCostItem(),
  ]);
  const [deviceReadiness, setDeviceReadiness] = useState<DeviceReadiness>({
    gpsAccuracyFeet: null,
    connectionLabel: "Unknown connection",
    online: true,
    bluetoothAvailable: null,
    pitch: null,
    roll: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const livePreviewVideoRef = useRef<HTMLVideoElement>(null);
  const livePreviewStreamRef = useRef<MediaStream | null>(null);

  const uploadPhotoMutation =
    trpc.projects.uploadPhotoAndDetectEdges.useMutation();
  const getPricingQuery = trpc.projects.getPricing.useQuery(
    {
      zipCode: state.zipCode,
      material: state.selectedMaterial || "hotmix",
      squareFeet: state.squareFeet || 1000,
      depthInches: state.depthInches,
    },
    {
      enabled:
        !!user &&
        !!state.zipCode &&
        !!state.selectedMaterial &&
        !!state.squareFeet,
    }
  );
  const generatePreviewMutation =
    trpc.projects.generateMaterialPreview.useMutation();
  const createProjectMutation = trpc.projects.create.useMutation();
  const finalizeInvoiceMutation = trpc.projects.finalizeInvoice.useMutation();
  const cornerPolygon = state.corners
    .map(corner => `${corner.x},${corner.y}`)
    .join(" ");
  const polygonClipPath = buildPolygonClipPath(state.corners);
  const liveOverlayStyle = getLiveOverlayStyle(state.selectedMaterial);
  const previewMatchesSelectedMaterial =
    state.previewMaterial === state.selectedMaterial;
  const photoAspectRatio =
    state.imageWidth && state.imageHeight
      ? `${state.imageWidth} / ${state.imageHeight}`
      : "16 / 9";
  const nativeMobileApp = isNativeMobileApp();
  const materialCost =
    getPricingQuery.data?.materialCost ??
    getPricingQuery.data?.totalCost ??
    null;
  const materialCostValue = materialCost ? parseCurrency(materialCost) : null;
  const contractorRateValue =
    state.contractorPricePerSquareFoot.trim() === ""
      ? null
      : Number.parseFloat(state.contractorPricePerSquareFoot);
  const laborCostValue =
    state.squareFeet && contractorRateValue && contractorRateValue > 0
      ? state.squareFeet * contractorRateValue
      : null;
  const estimatedProjectTotalValue =
    materialCostValue !== null
      ? materialCostValue + (laborCostValue ?? 0)
      : null;
  const normalizedAdditionalCosts = additionalCosts
    .map(item => ({
      ...item,
      label: item.label.trim(),
      amountValue:
        item.amount.trim() === ""
          ? null
          : Number.parseFloat(item.amount.replace(/[^0-9.]/g, "")),
    }))
    .filter(
      item =>
        item.label.length > 0 &&
        item.amountValue !== null &&
        Number.isFinite(item.amountValue) &&
        item.amountValue >= 0
    );
  const additionalCostsTotalValue = normalizedAdditionalCosts.reduce(
    (sum, item) => sum + (item.amountValue ?? 0),
    0
  );
  const finalInvoiceTotalValue =
    estimatedProjectTotalValue !== null
      ? estimatedProjectTotalValue + additionalCostsTotalValue
      : null;

  useEffect(() => {
    const stopLiveStream = () => {
      if (livePreviewStreamRef.current) {
        livePreviewStreamRef.current.getTracks().forEach(track => track.stop());
        livePreviewStreamRef.current = null;
      }

      if (livePreviewVideoRef.current) {
        livePreviewVideoRef.current.srcObject = null;
      }
    };

    if (step !== "preview" || previewMode !== "live") {
      stopLiveStream();
      setLivePreviewStatus(current =>
        current === "unsupported" || current === "error" ? current : "idle"
      );
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setLivePreviewStatus("unsupported");
      setLivePreviewError(
        "Live camera preview is not available on this device. Static AI preview is still available."
      );
      return;
    }

    let cancelled = false;

    setLivePreviewStatus("starting");
    setLivePreviewError(null);

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        livePreviewStreamRef.current = stream;

        if (livePreviewVideoRef.current) {
          livePreviewVideoRef.current.srcObject = stream;
          await livePreviewVideoRef.current.play().catch(() => undefined);
        }

        setLivePreviewStatus("ready");
      } catch (error) {
        console.error(error);
        if (cancelled) return;

        setLivePreviewStatus("error");
        setLivePreviewError(
          "We could not start the rear camera for live overlay. You can keep using the static AI preview."
        );
      }
    })();

    return () => {
      cancelled = true;
      stopLiveStream();
    };
  }, [previewMode, step]);

  // Capture device context that can improve field accuracy and capture quality.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const connection = getDeviceConnectionSnapshot();
      const [location, orientation, bluetoothAvailable] = await Promise.all([
        getPreciseDeviceLocation(),
        captureDeviceOrientation(),
        getBluetoothAvailability(),
      ]);

      if (cancelled) return;

      if (location) {
        setState(prev => ({
          ...prev,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
        }));
      }

      setDeviceReadiness({
        gpsAccuracyFeet:
          location?.accuracy != null
            ? Math.round(location.accuracy * 3.28084)
            : null,
        connectionLabel: connection.label,
        online: connection.online,
        bluetoothAvailable,
        pitch: orientation.pitch,
        roll: orientation.roll,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result;
        if (typeof result === "string") {
          resolve(result);
          return;
        }

        reject(new Error("Unable to read image file"));
      };
      reader.onerror = () => reject(new Error("Unable to read image file"));
      reader.readAsDataURL(file);
    });

  const loadImageDimensions = (dataUrl: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error("Unable to load image"));
      img.src = dataUrl;
    });

  const handlePhotoCapture = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error("Upload a JPG, PNG, or WebP image");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be 10 MB or smaller");
      return;
    }

    setLoading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.split(",")[1];
      if (!base64) throw new Error("Image file did not contain base64 data");

      const dimensions = await loadImageDimensions(dataUrl);
      const result = await uploadPhotoMutation.mutateAsync({
        photoBase64: base64,
        photoName: file.name,
        photoMimeType: file.type,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
      });

      setState(prev => ({
        ...prev,
        photoUrl: result.photoUrl,
        photoKey: result.photoKey,
        photoMimeType: file.type,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        corners: result.corners,
        detectionConfidence: result.confidence ?? null,
        detectionDescription: result.description ?? "",
        squareFeet:
          result.squareFeet ||
          calculateSquareFeetFromCorners(
            result.corners,
            dimensions.width,
            dimensions.height
          ),
        selectedMaterial: prev.selectedMaterial ?? "hotmix",
        previewPrompt:
          prev.previewPrompt.trim() ||
          defaultPreviewPromptByMaterial[prev.selectedMaterial ?? "hotmix"],
        previewUrl: null,
        previewKey: null,
        previewMaterial: null,
        previewUsedFallback: false,
      }));

      toast.success(
        `Driveway detected: ${result.squareFeet} sq ft. Opening image generator.`
      );
      setStep("material");
    } catch (error) {
      toast.error("Failed to process photo");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void handlePhotoCapture(file);
  };

  const handleTakePhoto = async () => {
    if (!nativeMobileApp) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const file = await takeDrivewayPhotoWithCamera();
      if (file) await handlePhotoCapture(file);
    } catch (error) {
      if (isMediaSelectionCanceled(error)) return;
      toast.error("Camera access is required to take a driveway photo");
      console.error(error);
    }
  };

  const handleUploadPhoto = async () => {
    if (!nativeMobileApp) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const file = await chooseDrivewayPhotoFromGallery();
      if (file) await handlePhotoCapture(file);
    } catch (error) {
      if (isMediaSelectionCanceled(error)) return;
      toast.error("Photo library access is required to upload an image");
      console.error(error);
    }
  };

  useEffect(() => {
    if (loading || state.photoUrl || step !== "upload") {
      return;
    }

    let routeFeature: string | null = null;
    let routeAction: "gallery" | null = null;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const startAction = params.get("start");
      routeFeature = params.get("feature");

      if (startAction === "upload") routeAction = "gallery";

      if (routeAction || routeFeature) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    const pendingAction =
      routeAction ?? (nativeMobileApp ? consumePendingEstimatorAction() : null);
    if (pendingAction === "gallery") {
      void handleUploadPhoto();
      return;
    }

    if (routeFeature === "capture") {
      toast.info(
        "Use Take Photo inside the estimator for camera or live view."
      );
    }
    if (routeFeature === "measure") {
      toast.info("Capture or upload a driveway photo to start AI measuring.");
    }
    if (routeFeature === "preview") {
      toast.info(
        "Capture a driveway first, then choose live or static preview."
      );
    }
    if (routeFeature === "quote") {
      toast.info("Capture and price the driveway to build the final quote.");
    }
  }, [loading, nativeMobileApp, state.photoUrl, step]);

  const handlePhotoDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handlePhotoCapture(file);
  };

  const updateCornerFromPointer = (
    clientX: number,
    clientY: number,
    cornerIndex: number
  ) => {
    if (!containerRef.current || !state.photoUrl) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setState(prev => {
      const newCorners = [...prev.corners];
      newCorners[cornerIndex] = {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };

      const squareFeet =
        prev.imageWidth && prev.imageHeight
          ? calculateSquareFeetFromCorners(
              newCorners,
              prev.imageWidth,
              prev.imageHeight
            )
          : prev.squareFeet;

      return { ...prev, corners: newCorners, squareFeet };
    });
  };

  const handleCornerPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingCorner(index);
    updateCornerFromPointer(event.clientX, event.clientY, index);
  };

  const handleCornerPointerMove = (
    event: PointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (draggingCorner !== index) return;
    event.preventDefault();
    updateCornerFromPointer(event.clientX, event.clientY, index);
  };

  const handleCornerPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingCorner(null);
  };

  const handleMaterialSelect = (material: Material) => {
    setState(prev => {
      const previousDefaultPrompt = prev.selectedMaterial
        ? defaultPreviewPromptByMaterial[prev.selectedMaterial]
        : "";
      const nextDefaultPrompt = defaultPreviewPromptByMaterial[material];
      const shouldReplacePrompt =
        prev.previewPrompt.trim() === "" ||
        prev.previewPrompt === previousDefaultPrompt;

      return {
        ...prev,
        selectedMaterial: material,
        previewPrompt: shouldReplacePrompt
          ? nextDefaultPrompt
          : prev.previewPrompt,
      };
    });
  };

  const applyPreviewPromptSuggestion = (suggestion: string) => {
    setState(prev => ({
      ...prev,
      previewPrompt: prev.previewPrompt.trim()
        ? `${prev.previewPrompt.trim()} ${suggestion}`
        : suggestion,
    }));
  };

  const addAdditionalCostRow = () => {
    setAdditionalCosts(prev => [...prev, createAdditionalCostItem()]);
  };

  const updateAdditionalCostRow = (
    id: string,
    field: "label" | "amount",
    value: string
  ) => {
    setAdditionalCosts(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        if (field === "amount") {
          const sanitized = value.replace(/[^0-9.]/g, "");
          if (!/^\d*(?:\.\d{0,2})?$/.test(sanitized)) {
            return item;
          }

          return { ...item, amount: sanitized };
        }

        return { ...item, label: value };
      })
    );
  };

  const removeAdditionalCostRow = (id: string) => {
    setAdditionalCosts(prev =>
      prev.length === 1 ? prev : prev.filter(item => item.id !== id)
    );
  };

  const exitEstimateFlow = (action: EstimateExitAction) => {
    setEstimateDecisionOpen(false);
    setEstimateDecisionMode("decision");

    if (action === "material") {
      setStep("material");
      return;
    }

    if (action === "project" && savedProjectId) {
      navigate(`/project/${savedProjectId}`);
      return;
    }

    navigate("/dashboard");
  };

  const handleGeneratePreview = async () => {
    if (!state.photoUrl || !state.selectedMaterial) return;

    setLoading(true);
    try {
      const result = await generatePreviewMutation.mutateAsync({
        photoUrl: state.photoUrl,
        photoMimeType: state.photoMimeType || "image/jpeg",
        material: state.selectedMaterial,
        editPrompt: state.previewPrompt.trim() || undefined,
      });

      setState(prev => ({
        ...prev,
        previewUrl: result.previewUrl,
        previewKey: result.previewKey ?? null,
        previewMaterial: state.selectedMaterial,
        previewUsedFallback: result.usedFallback ?? false,
      }));
      if (step !== "preview") {
        setPreviewMode("static");
      }

      toast.success(
        result.usedFallback
          ? "Preview service unavailable; showing original photo"
          : "Material preview generated!"
      );
      setStep("preview");
    } catch (error) {
      toast.error("Failed to generate preview");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (
      !state.photoUrl ||
      !state.photoKey ||
      !state.selectedMaterial ||
      !state.squareFeet
    ) {
      toast.error("Please complete all steps");
      return;
    }

    const projectName = state.projectName.trim();
    const contractorEmail = state.contractorEmail.trim();
    const notes = state.notes.trim();

    if (!projectName) {
      toast.error("Please enter a project name");
      return;
    }

    if (!contractorRateValue || contractorRateValue <= 0) {
      toast.error(
        "Enter the labor rate per sq ft before producing an estimate"
      );
      setStep("summary");
      return;
    }

    setLoading(true);
    try {
      const pricing = getPricingQuery.data;
      if (!pricing) {
        toast.error("Pricing not available");
        return;
      }

      const result = await createProjectMutation.mutateAsync({
        projectName,
        photoUrl: state.photoUrl,
        photoKey: state.photoKey as string,
        squareFeet: state.squareFeet,
        depthInches: state.depthInches,
        cornerPoints: state.corners,
        selectedMaterial: state.selectedMaterial,
        zipCode: state.zipCode,
        latitude: state.latitude || undefined,
        longitude: state.longitude || undefined,
        previewImageUrl:
          state.previewUrl && previewMatchesSelectedMaterial
            ? state.previewUrl
            : undefined,
        previewImageKey:
          state.previewKey && previewMatchesSelectedMaterial
            ? state.previewKey
            : undefined,
        contractorEmail: contractorEmail || undefined,
        contractorPricePerSquareFoot:
          contractorRateValue && contractorRateValue > 0
            ? contractorRateValue
            : undefined,
        notes: notes || undefined,
      });

      if (!result.projectId) {
        toast.error("Estimate was created but no project id was returned");
        return;
      }

      setSavedProjectId(result.projectId);
      setEstimateDecisionMode("decision");
      setAdditionalCosts([createAdditionalCostItem()]);
      setEstimateDecisionOpen(true);
      toast.success(
        "Estimate created. Ask the client what they want to do next."
      );
    } catch (error) {
      toast.error("Failed to save project");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeInvoice = async () => {
    if (!savedProjectId) {
      toast.error("No saved estimate was found for the invoice");
      return;
    }

    setLoading(true);
    try {
      await finalizeInvoiceMutation.mutateAsync({
        projectId: savedProjectId,
        additionalCosts: normalizedAdditionalCosts.map(item => ({
          label: item.label,
          amount: item.amountValue ?? 0,
        })),
      });

      toast.success("Final invoice created");
      exitEstimateFlow("project");
    } catch (error) {
      toast.error("Failed to finalize the invoice");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const materials: Array<{ id: Material; name: string; icon: string }> = [
    { id: "hotmix", name: materialDisplayNames.hotmix, icon: "🛣️" },
    { id: "millings", name: materialDisplayNames.millings, icon: "♻️" },
    {
      id: "tar_and_chip",
      name: materialDisplayNames.tar_and_chip,
      icon: "🪨",
    },
    { id: "gravel", name: materialDisplayNames.gravel, icon: "⚫" },
  ];
  const workflowSteps: Array<{
    id: Step;
    label: string;
    icon: typeof Camera;
  }> = [
    { id: "upload", label: "Capture", icon: Camera },
    { id: "adjust", label: "Measure", icon: Ruler },
    { id: "material", label: "Generate", icon: Sparkles },
    { id: "preview", label: "Compare", icon: ImageIcon },
    { id: "summary", label: "Quote", icon: FileText },
  ];
  const currentStepIndex = workflowSteps.findIndex(item => item.id === step);
  const robotGuide: Record<
    Step,
    { title: string; message: string; action: string }
  > = {
    upload: {
      title: "Photo first",
      message:
        "Take a straight-on driveway photo or upload one. I will send it straight into the AI generator after detection.",
      action: "Capture or upload",
    },
    adjust: {
      title: "Tune the outline",
      message:
        "Drag the corner handles only if the driveway boundary looks off. The area updates as you move them.",
      action: "Confirm measurement",
    },
    material: {
      title: "Generate the look",
      message:
        "Choose a material and prompt style. ZIP pricing is helpful for quotes, but the AI preview can run right away.",
      action: "Generate preview",
    },
    preview: {
      title: "Compare with the client",
      message:
        "Switch between the static AI render and live overlay. Regenerate if the finish needs a different texture.",
      action: "Approve preview",
    },
    summary: {
      title: "Close the quote",
      message:
        "Add labor, notes, and client details. Save the estimate, then create a final invoice if they accept.",
      action: "Save estimate",
    },
  };
  const canVisitStep = (targetStep: Step) => {
    if (targetStep === "upload") return true;
    if (targetStep === "adjust") return !!state.photoUrl;
    if (targetStep === "material") return !!state.photoUrl;
    if (targetStep === "preview") return !!state.previewUrl;
    if (targetStep === "summary") return !!state.photoUrl && !!state.selectedMaterial;
    return false;
  };

  const materialFromCommand = (command: string): Material | null => {
    if (command.includes("milling")) return "millings";
    if (command.includes("tar") || command.includes("chip")) {
      return "tar_and_chip";
    }
    if (command.includes("gravel")) return "gravel";
    if (command.includes("hot") || command.includes("asphalt")) {
      return "hotmix";
    }
    return null;
  };

  const generatePreviewFromRobot = async (material: Material) => {
    if (!state.photoUrl) {
      setRobotResponse("I need a driveway photo first. Try: take photo.");
      setStep("upload");
      return;
    }

    const prompt =
      state.previewPrompt.trim() || defaultPreviewPromptByMaterial[material];

    setLoading(true);
    try {
      const result = await generatePreviewMutation.mutateAsync({
        photoUrl: state.photoUrl,
        photoMimeType: state.photoMimeType || "image/jpeg",
        material,
        editPrompt: prompt,
      });

      setState(prev => ({
        ...prev,
        selectedMaterial: material,
        previewPrompt: prompt,
        previewUrl: result.previewUrl,
        previewKey: result.previewKey ?? null,
        previewMaterial: material,
        previewUsedFallback: result.usedFallback ?? false,
      }));
      setPreviewMode("static");
      setStep("preview");
      setRobotResponse(
        `Done. I generated a ${materialDisplayNames[material]} preview.`
      );
      toast.success("Robot generated the material preview");
    } catch (error) {
      setRobotResponse("I could not generate the preview. Check the AI service and try again.");
      toast.error("Failed to generate preview");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const runRobotCommand = async (rawCommand: string) => {
    const command = rawCommand.trim().toLowerCase();
    if (!command) return;

    setRobotCommand("");
    setRobotGuideOpen(true);

    if (command.includes("take") || command.includes("camera")) {
      setRobotResponse("Opening the camera. After capture, I will open the generator.");
      await handleTakePhoto();
      return;
    }

    if (command.includes("upload") || command.includes("gallery")) {
      setRobotResponse("Opening photo upload. After selection, I will open the generator.");
      await handleUploadPhoto();
      return;
    }

    if (command.includes("adjust") || command.includes("outline") || command.includes("measure")) {
      if (!state.photoUrl) {
        setRobotResponse("I need a photo before I can adjust the outline.");
        setStep("upload");
        return;
      }
      setStep("adjust");
      setRobotResponse("I opened the measurement editor. Drag the handles if the outline needs tuning.");
      return;
    }

    if (command.includes("generate") || command.includes("preview") || command.includes("render")) {
      const material = materialFromCommand(command) ?? state.selectedMaterial ?? "hotmix";
      await generatePreviewFromRobot(material);
      return;
    }

    const material = materialFromCommand(command);
    if (material) {
      handleMaterialSelect(material);
      setStep("material");
      setRobotResponse(`Selected ${materialDisplayNames[material]}. Say "generate preview" when ready.`);
      return;
    }

    if (command.includes("live")) {
      if (!state.previewUrl) {
        setRobotResponse("Generate a preview first, then I can switch to live overlay.");
        setStep(state.photoUrl ? "material" : "upload");
        return;
      }
      setPreviewMode("live");
      setStep("preview");
      setRobotResponse("Switched to live camera overlay.");
      return;
    }

    if (command.includes("static") || command.includes("compare")) {
      if (!state.previewUrl) {
        setRobotResponse("Generate a preview first, then I can show comparison.");
        setStep(state.photoUrl ? "material" : "upload");
        return;
      }
      setPreviewMode("static");
      setStep("preview");
      setRobotResponse("Showing the static AI preview for comparison.");
      return;
    }

    if (command.includes("quote") || command.includes("summary")) {
      if (!state.photoUrl || !state.selectedMaterial) {
        setRobotResponse("I need a photo and material before opening the quote.");
        setStep(state.photoUrl ? "material" : "upload");
        return;
      }
      setStep("summary");
      setRobotResponse("I opened the quote step. Add labor rate and project details.");
      return;
    }

    if (command.includes("save")) {
      setRobotResponse("I will try to save the estimate with the current details.");
      await handleSaveProject();
      return;
    }

    setRobotResponse(
      "I can help with estimator tasks: take photo, upload, adjust outline, select gravel/asphalt, generate preview, live overlay, quote, or save estimate."
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#06100d] p-4 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              AI driveway workflow
            </p>
            <h1 className="text-3xl font-black text-white sm:text-4xl">
              Capture, generate, quote
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-100">
              Take or upload a driveway photo, generate material previews,
              adjust measurements when needed, and turn it into a sales quote.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/12 bg-black/30 p-2 text-center text-xs text-slate-100">
            <div className="rounded-lg bg-white/8 px-3 py-2">
              <p className="font-bold text-white">
                {state.squareFeet ?? "--"}
              </p>
              <p>sq ft</p>
            </div>
            <div className="rounded-lg bg-white/8 px-3 py-2">
              <p className="font-bold text-white">
                {state.selectedMaterial
                  ? materialDisplayNames[state.selectedMaterial]
                  : "--"}
              </p>
              <p>material</p>
            </div>
            <div className="rounded-lg bg-white/8 px-3 py-2">
              <p className="font-bold text-white">
                {state.previewUrl ? "Ready" : "Open"}
              </p>
              <p>preview</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="-mx-1 mb-6 overflow-x-auto pb-2">
          <div className="flex min-w-max items-center gap-2 px-1">
            {workflowSteps.map((workflowStep, i) => {
              const Icon = workflowStep.icon;
              const isActive = step === workflowStep.id;
              const isComplete = currentStepIndex > i;
              const isReachable = canVisitStep(workflowStep.id);

              return (
                <button
                  key={workflowStep.id}
                  type="button"
                  disabled={!isReachable}
                  onClick={() => setStep(workflowStep.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    isActive
                      ? "border-emerald-200/60 bg-emerald-400/18 text-white shadow-[0_0_24px_rgba(52,211,153,0.18)]"
                      : isComplete
                        ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-50"
                        : isReachable
                          ? "border-white/14 bg-white/8 text-slate-100 hover:bg-white/12"
                          : "border-white/8 bg-black/20 text-slate-400"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {workflowStep.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Step */}
        {step === "upload" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                Step 1: Capture Your Driveway
              </CardTitle>
              <CardDescription>
                Take a photo or upload an image of your driveway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-200">
                  <p className="font-semibold text-white">
                    Field accuracy signals
                  </p>
                  <p className="mt-2">
                    GPS:{" "}
                    <span className="text-blue-300">
                      {deviceReadiness.gpsAccuracyFeet != null
                        ? `within about ${deviceReadiness.gpsAccuracyFeet} ft`
                        : "waiting for location lock"}
                    </span>
                  </p>
                  <p className="mt-1">
                    Connection:{" "}
                    <span className="text-blue-300">
                      {deviceReadiness.online
                        ? deviceReadiness.connectionLabel
                        : "Offline"}
                    </span>
                  </p>
                  <p className="mt-1">
                    Bluetooth:{" "}
                    <span className="text-blue-300">
                      {deviceReadiness.bluetoothAvailable === null
                        ? "not exposed on this device"
                        : deviceReadiness.bluetoothAvailable
                          ? "available"
                          : "off or unavailable"}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-200">
                  <p className="font-semibold text-white">Capture guidance</p>
                  <p className="mt-2">
                    Phone pitch:{" "}
                    <span className="text-emerald-300">
                      {deviceReadiness.pitch != null
                        ? `${deviceReadiness.pitch.toFixed(1)} deg`
                        : "not available"}
                    </span>
                  </p>
                  <p className="mt-1">
                    Phone roll:{" "}
                    <span className="text-emerald-300">
                      {deviceReadiness.roll != null
                        ? `${deviceReadiness.roll.toFixed(1)} deg`
                        : "not available"}
                    </span>
                  </p>
                  <p className="mt-2 text-slate-400">
                    A level phone and a strong GPS lock help produce cleaner
                    capture data and more reliable project data.
                  </p>
                </div>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  isDraggingOver
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-slate-600 hover:border-blue-500"
                }`}
                onDragEnter={event => {
                  event.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragOver={event => {
                  event.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={event => {
                  if (event.currentTarget === event.target) {
                    setIsDraggingOver(false);
                  }
                }}
                onDrop={handlePhotoDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="flex w-full flex-col items-center gap-4">
                  {loading ? (
                    <>
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                      <p className="text-slate-300">Processing photo...</p>
                    </>
                  ) : (
                    isDraggingOver ? (
                      <Upload className="w-12 h-12 text-blue-300" />
                    ) : (
                      <Camera className="w-12 h-12 text-slate-400" />
                    )
                  )}
                  <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      onClick={handleTakePhoto}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={loading}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Image
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Adjust Corners Step */}
        {step === "adjust" && state.photoUrl && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                Step 2: Adjust Driveway Corners
              </CardTitle>
              <CardDescription>
                Drag the corners to match your driveway edges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={containerRef}
                className="relative w-full touch-none overflow-hidden rounded-lg bg-black"
                style={{ aspectRatio: photoAspectRatio }}
              >
                <img
                  src={state.photoUrl}
                  alt="Driveway"
                  className="h-full w-full select-none object-cover"
                  draggable={false}
                />

                {state.corners.length >= 3 && (
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                  >
                    <polygon
                      points={cornerPolygon}
                      fill="rgba(37, 99, 235, 0.16)"
                      stroke="rgb(96, 165, 250)"
                      strokeWidth="0.75"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}

                {/* Corner Markers */}
                {state.corners.map((corner, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Adjust driveway corner ${i + 1}`}
                    onPointerDown={event => handleCornerPointerDown(event, i)}
                    onPointerMove={event => handleCornerPointerMove(event, i)}
                    onPointerUp={handleCornerPointerEnd}
                    onPointerCancel={handleCornerPointerEnd}
                    onLostPointerCapture={() => setDraggingCorner(null)}
                    className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-blue-500 shadow-lg shadow-black/30 outline-none ring-offset-2 ring-offset-slate-900 hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-300"
                    style={{ left: `${corner.x}%`, top: `${corner.y}%` }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-slate-300">Detected Area</Label>
                  <p className="text-2xl font-bold text-white">
                    {state.squareFeet} sq ft
                  </p>
                  {(state.detectionDescription ||
                    state.detectionConfidence != null) && (
                    <div className="mt-3 rounded-md border border-blue-400/20 bg-slate-900/70 p-3 text-sm text-slate-200">
                      <p className="font-semibold text-white">
                        AI boundary read
                      </p>
                      {state.detectionDescription && (
                        <p className="mt-1 leading-6 text-slate-300">
                          {state.detectionDescription}
                        </p>
                      )}
                      {state.detectionConfidence != null && (
                        <p className="mt-2 text-blue-300">
                          Confidence:{" "}
                          {Math.round(state.detectionConfidence * 100)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-slate-300">Depth</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={state.depthInches}
                    onChange={e => {
                      const depth = Number(e.target.value);
                      setState(prev => ({
                        ...prev,
                        depthInches: Number.isFinite(depth)
                          ? Math.min(12, Math.max(1, Math.round(depth)))
                          : prev.depthInches,
                      }));
                    }}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-400">inches</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => setStep("material")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue to Materials
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("upload")}
                >
                  Capture Another Photo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Material Selection Step */}
        {step === "material" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Wand2 className="h-5 w-5 text-emerald-200" />
                AI Image Generator
              </CardTitle>
              <CardDescription>
                Pick a surface, tune the prompt, then generate a client-ready
                driveway preview from the captured photo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.photoUrl && (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div
                    className="relative overflow-hidden rounded-xl border border-white/12 bg-black"
                    style={{ aspectRatio: photoAspectRatio }}
                  >
                    <img
                      src={state.photoUrl}
                      alt="Captured driveway"
                      className="h-full w-full object-cover"
                    />
                    {state.corners.length >= 3 && (
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        preserveAspectRatio="none"
                        viewBox="0 0 100 100"
                      >
                        <polygon
                          points={cornerPolygon}
                          fill="rgba(52, 211, 153, 0.14)"
                          stroke="rgb(110, 231, 183)"
                          strokeWidth="0.75"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    )}
                    <div className="absolute left-3 top-3 rounded-full border border-black/30 bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950 shadow">
                      Source image
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-xl border border-white/12 bg-white/8 p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-white">
                        <Ruler className="h-4 w-4 text-emerald-200" />
                        Detected measurement
                      </p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {state.squareFeet ?? "--"} sq ft
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-100">
                        {state.detectionDescription ||
                          "AI mapped the driveway boundary. Fine-tune corners if the outline needs correction before quoting."}
                      </p>
                      {state.detectionConfidence != null && (
                        <p className="mt-2 text-sm font-semibold text-emerald-100">
                          Confidence {Math.round(state.detectionConfidence * 100)}%
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("adjust")}
                        className="border-white/20 bg-white/8 text-white hover:bg-white/14"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        Adjust outline
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("upload")}
                        className="border-white/20 bg-white/8 text-white hover:bg-white/14"
                      >
                        <Camera className="h-4 w-4" />
                        New photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="pricing-zip" className="text-slate-200">
                  Pricing ZIP Code
                </Label>
                <Input
                  id="pricing-zip"
                  inputMode="numeric"
                  value={state.zipCode}
                  onChange={event =>
                    setState(prev => ({
                      ...prev,
                      zipCode: event.target.value
                        .replace(/[^\d-]/g, "")
                        .slice(0, 10),
                    }))
                  }
                  placeholder="Enter job site ZIP code"
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-400">
                  GPS helps confirm the job site, but ZIP code is what sets
                  local material pricing.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {materials.map(material => (
                  <button
                    key={material.id}
                    type="button"
                    aria-pressed={state.selectedMaterial === material.id}
                    onClick={() => handleMaterialSelect(material.id)}
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      state.selectedMaterial === material.id
                        ? "border-emerald-300 bg-emerald-300/12 shadow-[0_0_22px_rgba(52,211,153,0.12)]"
                        : "border-slate-600 bg-slate-700/50 hover:border-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    <div className="text-3xl mb-2">{material.icon}</div>
                    <p className="text-white font-semibold text-sm">
                      {material.name}
                    </p>
                    {state.selectedMaterial === material.id &&
                      getPricingQuery.data && (
                        <p className="text-blue-400 text-xs mt-2">
                          {formatUsd(getPricingQuery.data.pricePerSquareFoot)}{" "}
                          material/sq ft
                        </p>
                      )}
                  </button>
                ))}
              </div>

              {state.selectedMaterial && getPricingQuery.isLoading && (
                <div className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-700/50 p-3 text-sm text-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
                  Checking local material pricing...
                </div>
              )}

              {state.selectedMaterial && getPricingQuery.isError && (
                <div
                  role="alert"
                  className="rounded-md border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-100"
                >
                  Pricing is unavailable for this ZIP code right now.
                </div>
              )}

              {state.selectedMaterial && !state.zipCode && (
                <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-100">
                  Enter the job site ZIP code to load local material pricing.
                </div>
              )}

              {getPricingQuery.data && state.selectedMaterial && (
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="pt-6">
                    <div className="space-y-3 text-white">
                      <div className="flex justify-between">
                        <span>Quantity Needed:</span>
                        <span className="font-bold">
                          {getPricingQuery.data.quantityNeeded}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price per Ton:</span>
                        <span className="font-bold">
                          {formatUsd(getPricingQuery.data.pricePerTon)}
                        </span>
                      </div>
                      <div className="rounded-md border border-blue-400/20 bg-slate-800/70 p-3 text-sm text-slate-200">
                        Material pricing covers asphalt or aggregate only.
                        Labor, equipment, taxes, and contractor markup are not
                        included unless you add a contractor quote in the
                        summary step.
                      </div>
                      <div className="flex justify-between text-lg border-t border-slate-600 pt-2 mt-2">
                        <span>Estimated Material Cost:</span>
                        <span className="font-bold text-green-400">
                          {materialCost}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {state.selectedMaterial && (
                <div className="rounded-xl border border-emerald-500/25 bg-[#020b00] shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
                  <div className="flex items-center justify-between border-b border-emerald-500/15 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                    </div>
                    <span className="font-mono text-xs uppercase text-emerald-300">
                      ai-preview-terminal
                    </span>
                  </div>
                  <div className="space-y-4 px-4 py-4">
                    <div>
                      <Label
                        htmlFor="preview-prompt"
                        className="text-sm text-emerald-100"
                      >
                        AI edit prompt
                      </Label>
                      <p className="mt-1 text-xs leading-5 text-emerald-300/80">
                        Material comes from the selector above. Use this prompt
                        to describe finish, texture, cleanliness, and the exact
                        look you want the AI preview to generate.
                      </p>
                    </div>
                    <Textarea
                      id="preview-prompt"
                      value={state.previewPrompt}
                      onChange={event =>
                        setState(prev => ({
                          ...prev,
                          previewPrompt: event.target.value.slice(0, 500),
                        }))
                      }
                      placeholder="Example: Keep the same camera angle, make the asphalt darker, and clean up the driveway edges."
                      className="min-h-28 border-emerald-500/20 bg-black/75 font-mono text-sm text-emerald-200 placeholder:text-emerald-400/45"
                    />
                    <div className="flex flex-wrap gap-2">
                      {previewPromptSuggestions.map(suggestion => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() =>
                            applyPreviewPromptSuggestion(suggestion)
                          }
                          className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/14"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleGeneratePreview}
                disabled={
                  !state.selectedMaterial ||
                  loading ||
                  getPricingQuery.isError
                }
                className="h-12 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {getPricingQuery.isLoading
                    ? "Checking Pricing..."
                    : loading
                      ? "Generating AI Preview..."
                      : "Generate AI Material Preview"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Preview Step */}
        {step === "preview" && state.previewUrl && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                Step 4: Preview Your Driveway
              </CardTitle>
              <CardDescription>
                Switch between a static AI render and a live walk-around overlay
                to match the current sales conversation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label className="text-slate-200">Preview mode</Label>
                  <p className="mt-1 text-xs text-slate-400">
                    Static preview is best for quoting. Live overlay is best
                    when you want to walk the site and compare the material in
                    context.
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-slate-600 bg-slate-950/70 p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("static")}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      previewMode === "static"
                        ? "bg-emerald-600 text-white"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    Static AI Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("live")}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      previewMode === "live"
                        ? "bg-emerald-600 text-white"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    Live Camera Overlay
                  </button>
                </div>
              </div>

              <div
                className="relative w-full overflow-hidden rounded-lg bg-black"
                style={{ aspectRatio: photoAspectRatio }}
              >
                {previewMode === "static" ? (
                  <>
                    <img
                      src={state.previewUrl}
                      alt="Driveway material preview"
                      className="h-full w-full object-cover"
                    />
                    {!previewMatchesSelectedMaterial && (
                      <div className="absolute inset-x-3 bottom-3 rounded-lg border border-amber-400/35 bg-black/70 p-3 text-xs leading-5 text-amber-100">
                        This image was generated for{" "}
                        {state.previewMaterial
                          ? materialDisplayNames[state.previewMaterial]
                          : "a previous material"}
                        . Regenerate before saving to attach a matching project
                        preview.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <video
                      ref={livePreviewVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />

                    <div
                      className="absolute inset-0"
                      style={{ clipPath: polygonClipPath }}
                    >
                      <div
                        className="absolute inset-0 opacity-75"
                        style={liveOverlayStyle}
                      />
                      {!state.previewUsedFallback && (
                        <div
                          className="absolute inset-0 opacity-25"
                          style={{
                            backgroundImage: `url(${state.previewUrl})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                            mixBlendMode: "soft-light",
                          }}
                        />
                      )}
                    </div>

                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_46%,rgba(0,0,0,0.18)_100%)]" />

                    {state.corners.length >= 3 && (
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        preserveAspectRatio="none"
                        viewBox="0 0 100 100"
                      >
                        <polygon
                          points={cornerPolygon}
                          fill="rgba(16, 185, 129, 0.14)"
                          stroke="rgb(52, 211, 153)"
                          strokeWidth="0.8"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    )}

                    <div className="absolute left-3 top-3 rounded-full border border-emerald-400/30 bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase text-emerald-300">
                      Live overlay
                    </div>
                    <div className="absolute right-3 top-3 rounded-full border border-slate-200/15 bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase text-slate-200">
                      {state.selectedMaterial
                        ? materialDisplayNames[state.selectedMaterial]
                        : "Mapped material"}
                    </div>
                    <div className="absolute bottom-3 left-3 max-w-xs rounded-lg border border-slate-200/10 bg-black/60 p-3 text-xs leading-5 text-slate-100">
                      Walk the job with the client while keeping the phone close
                      to the original capture angle. The highlighted polygon is
                      the previously mapped driveway area.
                    </div>
                    {state.photoUrl && (
                      <div className="absolute bottom-3 right-3 overflow-hidden rounded-lg border border-slate-200/10 bg-black/70 shadow-lg">
                        <img
                          src={state.photoUrl}
                          alt="Original mapped driveway"
                          className="h-20 w-28 object-cover"
                        />
                      </div>
                    )}

                    {livePreviewStatus !== "ready" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-6 text-center">
                        <div className="max-w-sm rounded-xl border border-slate-200/10 bg-slate-950/80 p-4 text-sm text-slate-100">
                          <p className="font-semibold text-white">
                            {livePreviewStatus === "starting"
                              ? "Starting rear camera..."
                              : "Live overlay unavailable"}
                          </p>
                          <p className="mt-2 leading-6 text-slate-300">
                            {livePreviewStatus === "starting"
                              ? "We are opening the live camera so you can compare the selected surface while walking the site."
                              : (livePreviewError ??
                                "Switch back to Static AI Preview if this device does not expose live video in the app.")}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {previewMode === "live" && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm text-emerald-100">
                  <p className="font-semibold text-emerald-50">
                    Live walk-around overlay
                  </p>
                  <p className="mt-1 leading-6">
                    The selected surface is clipped to the mapped driveway area
                    so you can compare the material in the field. Use the static
                    preview when you need the polished AI render for the quote.
                  </p>
                </div>
              )}

              {previewMode === "static" && state.previewUsedFallback && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-100">
                  <p className="font-semibold text-amber-50">
                    AI preview service is not available right now
                  </p>
                  <p className="mt-1 leading-6">
                    You are seeing the original driveway photo because the live
                    image generation service did not return an edited result.
                    Once the AI service is configured, this panel will show the
                    generated material preview.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-slate-200">
                    Change material and regenerate
                  </Label>
                  <p className="mt-1 text-xs text-slate-400">
                    Switch materials here, then refine the AI prompt below to
                    make another preview pass from the original driveway photo.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {materials.map(material => (
                    <button
                      key={`preview-${material.id}`}
                      type="button"
                      aria-pressed={state.selectedMaterial === material.id}
                      onClick={() => handleMaterialSelect(material.id)}
                      className={`rounded-lg border-2 p-3 text-left transition ${
                        state.selectedMaterial === material.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-600 bg-slate-700/40 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-2xl">{material.icon}</div>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {material.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/25 bg-[#020b00] shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
                <div className="flex items-center justify-between border-b border-emerald-500/15 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                  </div>
                  <span className="font-mono text-xs uppercase text-emerald-300">
                    preview controls
                  </span>
                </div>
                <div className="space-y-4 px-4 py-4">
                  <div>
                    <Label
                      htmlFor="preview-prompt-regenerate"
                      className="text-sm text-emerald-100"
                    >
                      Prompt edits
                    </Label>
                    <p className="mt-1 text-xs leading-5 text-emerald-300/80">
                      Tell the AI exactly what finish you want while preserving
                      the same house, perspective, and surroundings.
                    </p>
                  </div>
                  <Textarea
                    id="preview-prompt-regenerate"
                    value={state.previewPrompt}
                    onChange={event =>
                      setState(prev => ({
                        ...prev,
                        previewPrompt: event.target.value.slice(0, 500),
                      }))
                    }
                    placeholder="Example: Make the gravel more compact, keep the same shadows, and avoid changing the lawn."
                    className="min-h-28 border-emerald-500/20 bg-black/75 font-mono text-sm text-emerald-200 placeholder:text-emerald-400/45"
                  />
                  <div className="flex flex-wrap gap-2">
                    {previewPromptSuggestions.map(suggestion => (
                      <button
                        key={`preview-suggestion-${suggestion}`}
                        type="button"
                        onClick={() => applyPreviewPromptSuggestion(suggestion)}
                        className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/14"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={!state.selectedMaterial || loading}
                  variant="outline"
                >
                  {loading
                    ? "Regenerating Preview..."
                    : previewMatchesSelectedMaterial
                      ? "Regenerate with AI"
                      : "Generate Matching Preview"}
                </Button>
                <Button
                  onClick={() => setStep("summary")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue to Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Step */}
        {step === "summary" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                Step 5: Project Summary
              </CardTitle>
              <CardDescription>
                Review and save your driveway sales estimate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300">Project Name</Label>
                  <Input
                    value={state.projectName}
                    onChange={e =>
                      setState(prev => ({
                        ...prev,
                        projectName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Front Driveway Renovation"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">
                    Contractor Email (Optional)
                  </Label>
                  <Input
                    type="email"
                    value={state.contractorEmail}
                    onChange={e =>
                      setState(prev => ({
                        ...prev,
                        contractorEmail: e.target.value,
                      }))
                    }
                    placeholder="contractor@example.com"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Labor Rate Per Sq Ft</Label>
                  <Input
                    inputMode="decimal"
                    value={state.contractorPricePerSquareFoot}
                    onChange={e => {
                      const nextValue = e.target.value.replace(/[^0-9.]/g, "");
                      if (!/^\d*(?:\.\d{0,2})?$/.test(nextValue)) return;
                      setState(prev => ({
                        ...prev,
                        contractorPricePerSquareFoot: nextValue,
                      }));
                    }}
                    placeholder="e.g., 4.25"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Required for the sales estimate. Enter the contractor&apos;s
                    labor or installed-rate quote per square foot before
                    producing the final estimate.
                  </p>
                </div>

                <div>
                  <Label className="text-slate-300">Notes (Optional)</Label>
                  <Textarea
                    value={state.notes}
                    onChange={e =>
                      setState(prev => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Any additional details..."
                    className="bg-slate-700 border-slate-600 text-white"
                    rows={3}
                  />
                </div>
              </div>

              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="pt-6">
                  <div className="space-y-2 text-white">
                    <div className="flex justify-between">
                      <span>Area:</span>
                      <span className="font-bold">
                        {state.squareFeet} sq ft
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Material:</span>
                      <span className="font-bold">
                        {
                          materials.find(m => m.id === state.selectedMaterial)
                            ?.name
                        }
                      </span>
                    </div>
                    {getPricingQuery.data && (
                      <>
                        <div className="flex justify-between">
                          <span>Quantity:</span>
                          <span className="font-bold">
                            {getPricingQuery.data.quantityNeeded}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Material Estimate:</span>
                          <span className="font-bold text-blue-300">
                            {materialCost}
                          </span>
                        </div>
                        {contractorRateValue && contractorRateValue > 0 ? (
                          <>
                            <div className="flex justify-between">
                              <span>Labor Rate:</span>
                              <span className="font-bold">
                                {formatUsd(contractorRateValue)}/sq ft
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Estimated Labor:</span>
                              <span className="font-bold text-amber-300">
                                {laborCostValue
                                  ? formatUsd(laborCostValue)
                                  : "--"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-100">
                            Enter the labor rate above to produce the installed
                            sales estimate.
                          </div>
                        )}
                        <div className="flex justify-between text-lg border-t border-slate-600 pt-2 mt-2">
                          <span>
                            {contractorRateValue && contractorRateValue > 0
                              ? "Installed Estimate Total"
                              : "Awaiting Labor Rate"}
                          </span>
                          <span className="font-bold text-green-400">
                            {contractorRateValue &&
                            estimatedProjectTotalValue !== null
                              ? formatUsd(estimatedProjectTotalValue)
                              : "--"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Material pricing and labor are shown separately so the
                          final estimate reflects the quoted installed price.
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleSaveProject}
                disabled={
                  loading ||
                  !state.projectName.trim() ||
                  !getPricingQuery.data ||
                  !contractorRateValue ||
                  contractorRateValue <= 0
                }
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? "Saving..." : "Generate & Save Estimate"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={estimateDecisionOpen}
        onOpenChange={open => {
          if (open) {
            setEstimateDecisionOpen(true);
            return;
          }

          exitEstimateFlow("dashboard");
        }}
      >
        <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
          {estimateDecisionMode === "decision" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">
                  Estimate created
                </DialogTitle>
                <DialogDescription className="text-slate-300">
                  Ask the client what they want to do next with this estimate.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  onClick={() => setEstimateDecisionMode("accepted")}
                >
                  Client accepts the job
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-600 text-slate-200 hover:bg-slate-800"
                  onClick={() => exitEstimateFlow("material")}
                >
                  Show a different material
                </Button>
                <p className="text-xs leading-5 text-slate-400">
                  Use the X in the corner to close the estimator if the client
                  is not interested.
                </p>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">
                  Accepted job add-ons
                </DialogTitle>
                <DialogDescription className="text-slate-300">
                  Add any extra charges before creating the final invoice.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-3">
                  {additionalCosts.map(item => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_auto_auto] items-start gap-2"
                    >
                      <Input
                        value={item.label}
                        onChange={event =>
                          updateAdditionalCostRow(
                            item.id,
                            "label",
                            event.target.value
                          )
                        }
                        placeholder="Add-on label"
                        className="border-slate-600 bg-slate-800 text-white"
                      />
                      <Input
                        inputMode="decimal"
                        value={item.amount}
                        onChange={event =>
                          updateAdditionalCostRow(
                            item.id,
                            "amount",
                            event.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-28 border-slate-600 bg-slate-800 text-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-600 text-slate-200 hover:bg-slate-800"
                        onClick={() => removeAdditionalCostRow(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-600 text-slate-200 hover:bg-slate-800"
                  onClick={addAdditionalCostRow}
                >
                  <Plus className="h-4 w-4" />
                  Add cost line
                </Button>

                <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm">
                  <div className="flex justify-between text-slate-200">
                    <span>Installed estimate</span>
                    <span>
                      {estimatedProjectTotalValue !== null
                        ? formatUsd(estimatedProjectTotalValue)
                        : "--"}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-slate-200">
                    <span>Additional costs</span>
                    <span>{formatUsd(additionalCostsTotalValue)}</span>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-slate-700 pt-3 text-base font-semibold text-emerald-300">
                    <span>Final invoice total</span>
                    <span>
                      {finalInvoiceTotalValue !== null
                        ? formatUsd(finalInvoiceTotalValue)
                        : "--"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-200 hover:bg-slate-800"
                    onClick={() => setEstimateDecisionMode("decision")}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={loading || finalizeInvoiceMutation.isPending}
                    onClick={handleFinalizeInvoice}
                  >
                    {loading || finalizeInvoiceMutation.isPending
                      ? "Creating Invoice..."
                      : "Create Final Invoice"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-6xl md:left-auto md:right-6 md:max-w-sm">
        <div className="flex items-end gap-3 md:justify-end">
          {robotGuideOpen && (
            <div className="pointer-events-auto max-w-[calc(100%-4.5rem)] rounded-2xl border border-emerald-200/30 bg-[#06100d]/96 p-4 text-white shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur md:max-w-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-100">
                    Estimator bot • {robotGuide[step].title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-50">
                    {robotResponse || robotGuide[step].message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRobotGuideOpen(false)}
                  className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold text-slate-100 hover:bg-white/16"
                  aria-label="Hide estimator bot"
                >
                  Hide
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-300/12 px-3 py-1.5 text-xs font-bold text-emerald-50">
                  {robotGuide[step].action}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
                {workflowSteps.map(item => (
                  <button
                    key={`bot-${item.id}`}
                    type="button"
                    disabled={!canVisitStep(item.id)}
                    onClick={() => setStep(item.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      step === item.id
                        ? "border-emerald-200/60 bg-emerald-300/20 text-white"
                        : canVisitStep(item.id)
                          ? "border-white/15 bg-white/8 text-slate-100 hover:bg-white/14"
                          : "border-white/8 bg-black/20 text-slate-500"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={event => {
                  event.preventDefault();
                  void runRobotCommand(robotCommand);
                }}
              >
                <Input
                  value={robotCommand}
                  onChange={event => setRobotCommand(event.target.value)}
                  placeholder='Try "generate gravel preview"'
                  className="h-10 border-emerald-200/20 bg-black/45 text-white placeholder:text-slate-300"
                />
                <Button
                  type="submit"
                  disabled={loading || !robotCommand.trim()}
                  className="h-10 bg-emerald-500 px-3 text-emerald-950 hover:bg-emerald-300"
                >
                  Go
                </Button>
              </form>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  "take photo",
                  "upload",
                  "generate asphalt preview",
                  "adjust outline",
                  "open quote",
                ].map(example => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => void runRobotCommand(example)}
                    className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold text-slate-100 hover:bg-white/12"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setRobotGuideOpen(open => !open)}
            className="pointer-events-auto relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-100/45 bg-emerald-400 text-emerald-950 shadow-[0_18px_50px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 hover:bg-emerald-300"
            aria-label={
              robotGuideOpen ? "Hide estimator bot" : "Show estimator bot"
            }
          >
            <Bot className="h-9 w-9" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#06100d] bg-white text-[10px] font-black text-emerald-900">
              AI
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
