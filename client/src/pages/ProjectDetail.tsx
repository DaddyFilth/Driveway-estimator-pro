import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { copyTextToClipboard } from "@/lib/clipboard";
import { downloadBase64File } from "@/lib/download";
import { toast } from "sonner";
import { Loader2, Share2, Download, ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [contractorEmail, setContractorEmail] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const projectQuery = trpc.projects.getById.useQuery(
    { projectId: parseInt(projectId || "0") },
    { enabled: !!projectId && !!user }
  );

  const createShareLinkMutation = trpc.projects.createShareLink.useMutation({
    onSuccess: async data => {
      setShareLink(data.shareLink);
      const copied = await copyTextToClipboard(data.shareLink);
      toast.success(
        copied
          ? "Share link created and copied."
          : "Share link created. Copy it from the dialog."
      );
    },
    onError: error => {
      toast.error("Failed to create share link");
    },
  });

  const handleShare = async () => {
    if (!projectId) return;
    try {
      await createShareLinkMutation.mutateAsync({
        projectId: parseInt(projectId),
        contractorEmail: contractorEmail.trim() || undefined,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const downloadPDFMutation = trpc.projects.downloadPDF.useMutation({
    onSuccess: data => {
      try {
        downloadBase64File({
          base64: data.pdfBase64,
          filename: data.filename,
          mimeType: "application/pdf",
        });
        toast.success("PDF downloaded successfully");
      } catch (error) {
        console.error("PDF download failed:", error);
        toast.error("Failed to download PDF");
      }
    },
    onError: () => {
      toast.error("Failed to download PDF");
    },
  });

  const handleDownloadPDF = () => {
    if (!projectId) return;
    downloadPDFMutation.mutate({ projectId: parseInt(projectId) });
  };

  const materials: Record<string, { name: string; icon: string }> = {
    hotmix: { name: "Hot Mix Asphalt", icon: "🛣️" },
    millings: { name: "Asphalt Millings", icon: "♻️" },
    tar_and_chip: { name: "Tar & Chip", icon: "🪨" },
    gravel: { name: "Gravel", icon: "⚫" },
  };

  if (projectQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!projectQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-slate-400 mb-4">Project not found</p>
              <p className="text-slate-500 text-sm">
                The project you're looking for doesn't exist or has been
                deleted.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const project = projectQuery.data;
  const materialInfo = project.selectedMaterial
    ? materials[project.selectedMaterial]
    : null;
  const materialCost = project.materialCost || project.totalCost;
  const hasLaborQuote =
    !!project.contractorPricePerSquareFoot && !!project.laborCost;
  const additionalCosts = Array.isArray(project.additionalCosts)
    ? project.additionalCosts
    : [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
              {project.projectName}
            </h1>
            <p className="text-slate-300">
              Created on {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog
              open={isShareDialogOpen}
              onOpenChange={open => {
                setIsShareDialogOpen(open);
                if (!open) {
                  setShareLink("");
                  setContractorEmail("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Share Project
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Generate a shareable link and optionally send it to a
                    contractor
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">
                      Contractor Email (Optional)
                    </Label>
                    <Input
                      type="email"
                      value={contractorEmail}
                      onChange={e => setContractorEmail(e.target.value)}
                      placeholder="contractor@example.com"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleShare}
                    disabled={createShareLinkMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {createShareLinkMutation.isPending
                      ? "Creating..."
                      : "Create & Copy Link"}
                  </Button>
                  {shareLink && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Share Link</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          readOnly
                          value={shareLink}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={async () => {
                            const copied = await copyTextToClipboard(shareLink);
                            toast.success(
                              copied ? "Copied link." : "Copy unavailable."
                            );
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {project.photoUrl && (
            <Card className="bg-slate-800 border-slate-700 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white">Original Photo</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative w-full bg-black rounded-lg overflow-hidden"
                  style={{ aspectRatio: "16/9" }}
                >
                  <img
                    src={project.photoUrl}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {project.previewImageUrl && (
            <Card className="bg-slate-800 border-slate-700 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white">Material Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative w-full bg-black rounded-lg overflow-hidden"
                  style={{ aspectRatio: "16/9" }}
                >
                  <img
                    src={project.previewImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Measurements */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Measurements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-slate-400 text-sm">Area</p>
                <p className="text-2xl font-bold text-white">
                  {project.squareFeet} sq ft
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Depth</p>
                <p className="text-lg font-semibold text-white">
                  {project.depthInches} inches
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Location</p>
                <p className="text-lg font-semibold text-white">
                  {project.zipCode}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Material */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Material</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl mb-2">{materialInfo?.icon}</div>
              <div>
                <p className="text-slate-400 text-sm">Type</p>
                <p className="text-lg font-semibold text-white">
                  {materialInfo?.name}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Quantity</p>
                <p className="text-lg font-semibold text-white">
                  {project.quantityNeeded}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-slate-400 text-sm">Price per Unit</p>
                <p className="text-lg font-semibold text-white">
                  {project.pricePerUnit}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Material Cost</p>
                <p className="text-lg font-semibold text-blue-300">
                  {materialCost}
                </p>
              </div>
              {hasLaborQuote && (
                <>
                  <div>
                    <p className="text-slate-400 text-sm">Contractor Rate</p>
                    <p className="text-lg font-semibold text-white">
                      {project.contractorPricePerSquareFoot}/sq ft
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Estimated Labor</p>
                    <p className="text-lg font-semibold text-amber-300">
                      {project.laborCost}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-slate-400 text-sm">
                  {hasLaborQuote ? "Estimated Total" : "Material-Only Total"}
                </p>
                <p className="text-3xl font-bold text-green-400">
                  {project.totalCost}
                </p>
              </div>
              {additionalCosts.length > 0 && (
                <div className="rounded-md border border-emerald-500/20 bg-slate-900/60 p-3">
                  <p className="text-sm font-semibold text-emerald-300">
                    Accepted Job Add-ons
                  </p>
                  <div className="mt-2 space-y-2 text-sm">
                    {additionalCosts.map((item: any, index: number) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="flex justify-between text-slate-200"
                      >
                        <span>{item.label}</span>
                        <span>${Number(item.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {project.finalInvoiceTotal && (
                <div>
                  <p className="text-slate-400 text-sm">Final Invoice Total</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {project.finalInvoiceTotal}
                  </p>
                </div>
              )}
              <p className="text-xs text-slate-400">
                Material pricing excludes labor unless a contractor quote is
                provided.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {project.notes && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">{project.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
