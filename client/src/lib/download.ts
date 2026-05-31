type DownloadBase64FileOptions = {
  base64: string;
  filename: string;
  mimeType: string;
};

export function downloadBase64File({
  base64,
  filename,
  mimeType,
}: DownloadBase64FileOptions) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Downloads require a browser environment");
  }

  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let index = 0; index < binaryString.length; index++) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}
