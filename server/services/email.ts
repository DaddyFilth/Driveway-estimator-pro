/**
 * Email notification service
 * In production, integrate with SendGrid, AWS SES, or similar
 * This is a mock implementation that logs emails
 */

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").slice(0, 200);
}

/**
 * Send email notification for project estimate
 */
export async function sendEstimateNotification(
  recipientEmail: string,
  projectName: string,
  squareFeet: number,
  material: string,
  totalCost: string,
  shareLink: string
): Promise<{ success: boolean; messageId?: string }> {
  const safeProjectName = escapeHtml(projectName);
  const safeMaterial = escapeHtml(formatMaterialName(material));
  const safeTotalCost = escapeHtml(totalCost);
  const safeShareLink = escapeHtml(shareLink);

  const html = `
    <h2>Driveway Estimate Ready</h2>
    <p>Your driveway estimate for <strong>${safeProjectName}</strong> is ready!</p>
    
    <h3>Project Summary</h3>
    <ul>
      <li><strong>Area:</strong> ${squareFeet} sq ft</li>
      <li><strong>Material:</strong> ${safeMaterial}</li>
      <li><strong>Estimated Cost:</strong> ${safeTotalCost}</li>
    </ul>
    
    <p><a href="${safeShareLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      View Full Estimate
    </a></p>
    
    <p>You can share this link with contractors or use it to get quotes.</p>
    <p>Best regards,<br/>Driveway Estimator Pro</p>
  `;

  const text = `
Driveway Estimate Ready

Your driveway estimate for ${projectName} is ready!

Project Summary:
- Area: ${squareFeet} sq ft
- Material: ${formatMaterialName(material)}
- Estimated Cost: ${totalCost}

View your estimate: ${shareLink}

You can share this link with contractors or use it to get quotes.

Best regards,
Driveway Estimator Pro
  `.trim();

  return sendEmail({
    to: recipientEmail,
    subject: sanitizeSubject(`Driveway Estimate Ready: ${projectName}`),
    html,
    text,
  });
}

/**
 * Send email notification to contractor with project details
 */
export async function sendContractorNotification(
  contractorEmail: string,
  ownerName: string,
  projectName: string,
  squareFeet: number,
  material: string,
  totalCost: string,
  shareLink: string
): Promise<{ success: boolean; messageId?: string }> {
  const safeOwnerName = escapeHtml(ownerName);
  const safeProjectName = escapeHtml(projectName);
  const safeMaterial = escapeHtml(formatMaterialName(material));
  const safeTotalCost = escapeHtml(totalCost);
  const safeShareLink = escapeHtml(shareLink);

  const html = `
    <h2>New Driveway Project Estimate</h2>
    <p><strong>${safeOwnerName}</strong> has shared a driveway estimate with you.</p>
    
    <h3>Project Details</h3>
    <ul>
      <li><strong>Project Name:</strong> ${safeProjectName}</li>
      <li><strong>Area:</strong> ${squareFeet} sq ft</li>
      <li><strong>Material:</strong> ${safeMaterial}</li>
      <li><strong>Estimated Cost:</strong> ${safeTotalCost}</li>
    </ul>
    
    <p><a href="${safeShareLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      View Project Details
    </a></p>
    
    <p>You can use this information to prepare a quote for the homeowner.</p>
    <p>Best regards,<br/>Driveway Estimator Pro</p>
  `;

  const text = `
New Driveway Project Estimate

${ownerName} has shared a driveway estimate with you.

Project Details:
- Project Name: ${projectName}
- Area: ${squareFeet} sq ft
- Material: ${formatMaterialName(material)}
- Estimated Cost: ${totalCost}

View project details: ${shareLink}

You can use this information to prepare a quote for the homeowner.

Best regards,
Driveway Estimator Pro
  `.trim();

  return sendEmail({
    to: contractorEmail,
    subject: sanitizeSubject(`New Driveway Project: ${projectName}`),
    html,
    text,
  });
}

/**
 * Core email sending function
 * In production, replace with actual email service provider
 */
async function sendEmail(
  notification: EmailNotification
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const mockMessageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    await new Promise(resolve => setTimeout(resolve, 100));

    console.info("[Email] Mock email accepted", {
      messageId: mockMessageId,
      toDomain: notification.to.split("@")[1] ?? "unknown",
      subject: notification.subject,
    });
    return { success: true, messageId: mockMessageId };
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return { success: false };
  }
}

/**
 * Format material name for display
 */
function formatMaterialName(material: string): string {
  const names: Record<string, string> = {
    hotmix: "Hot Mix Asphalt",
    millings: "Asphalt Millings",
    tar_and_chip: "Tar and Chip",
    gravel: "Gravel",
  };
  return names[material] || material;
}
