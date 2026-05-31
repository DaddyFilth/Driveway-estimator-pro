import { jsPDF } from "jspdf";
import type { Project } from "../../drizzle/schema";

type AdditionalCost = {
  label: string;
  amount: number;
};

function isAdditionalCost(value: unknown): value is AdditionalCost {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { label?: unknown }).label === "string" &&
    typeof (value as { amount?: unknown }).amount === "number"
  );
}

function parseAdditionalCosts(additionalCostsJson: string | null | undefined) {
  if (!additionalCostsJson) return [];

  try {
    const parsed = JSON.parse(additionalCostsJson) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isAdditionalCost);
  } catch {
    return [];
  }
}

/**
 * Generate a PDF summary of a driveway project
 * Includes: project name, photo, measurements, material, pricing, notes
 */
export async function generateProjectPDF(project: Project): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(40, 40, 40);
  doc.text("Driveway Estimate", margin, yPosition);

  yPosition += 12;
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text(project.projectName || "Project", margin, yPosition);

  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Created: ${new Date(project.createdAt).toLocaleDateString()}`,
    margin,
    yPosition
  );

  yPosition += 15;

  // Measurements Section
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Measurements", margin, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  const measurements = [
    `Area: ${project.squareFeet} sq ft`,
    `Depth: ${project.depthInches} inches`,
    `Location: ${project.zipCode}`,
  ];

  measurements.forEach(measurement => {
    doc.text(measurement, margin + 5, yPosition);
    yPosition += 6;
  });

  yPosition += 8;

  // Material Section
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Material", margin, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  const materials: Record<string, string> = {
    hotmix: "Hot Mix Asphalt",
    millings: "Asphalt Millings",
    tar_and_chip: "Tar & Chip",
    gravel: "Gravel",
  };

  const materialName = project.selectedMaterial
    ? materials[project.selectedMaterial] || project.selectedMaterial
    : "Unknown";

  doc.text(`Type: ${materialName}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Quantity: ${project.quantityNeeded}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Price per Unit: ${project.pricePerUnit}`, margin + 5, yPosition);

  yPosition += 10;

  // Pricing Section
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Pricing", margin, yPosition);

  yPosition += 8;
  doc.setFontSize(11);
  doc.setTextColor(60, 100, 180);
  doc.text(
    `Material Cost: ${project.materialCost || project.totalCost}`,
    margin + 5,
    yPosition
  );

  if (project.contractorPricePerSquareFoot && project.laborCost) {
    yPosition += 6;
    doc.setTextColor(140, 100, 20);
    doc.text(
      `Contractor Rate: ${project.contractorPricePerSquareFoot}/sq ft`,
      margin + 5,
      yPosition
    );
    yPosition += 6;
    doc.text(`Estimated Labor: ${project.laborCost}`, margin + 5, yPosition);
  }

  yPosition += 6;
  doc.setTextColor(0, 128, 0);
  doc.text(`Estimated Total: ${project.totalCost}`, margin + 5, yPosition);
  yPosition += 6;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Material pricing excludes labor unless a contractor quote is provided.",
    margin + 5,
    yPosition
  );

  const additionalCosts = parseAdditionalCosts(project.additionalCostsJson);
  if (additionalCosts.length > 0) {
    yPosition += 12;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Accepted Job Add-ons", margin, yPosition);

    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);

    additionalCosts.forEach(item => {
      doc.text(
        `${item.label}: $${item.amount.toFixed(2)}`,
        margin + 5,
        yPosition
      );
      yPosition += 6;
    });

    if (project.finalInvoiceTotal) {
      yPosition += 2;
      doc.setFontSize(11);
      doc.setTextColor(0, 128, 0);
      doc.text(
        `Final Invoice Total: ${project.finalInvoiceTotal}`,
        margin + 5,
        yPosition
      );
    }
  }

  yPosition += 15;

  // Notes Section (if present)
  if (project.notes) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Notes", margin, yPosition);

    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);

    const noteLines = doc.splitTextToSize(project.notes, contentWidth - 10);
    noteLines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin + 5, yPosition);
      yPosition += 6;
    });
  }

  // Footer
  yPosition = pageHeight - margin - 10;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by Driveway Estimator Pro", margin, yPosition);
  doc.text(`${new Date().toLocaleString()}`, margin, yPosition + 5);

  // Return PDF as buffer
  return Buffer.from(doc.output("arraybuffer"));
}
