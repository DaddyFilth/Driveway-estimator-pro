const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const SUPPORTED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedPhotoMimeType = (typeof SUPPORTED_PHOTO_MIME_TYPES)[number];

export function isSupportedPhotoMimeType(
  value: string
): value is SupportedPhotoMimeType {
  return SUPPORTED_PHOTO_MIME_TYPES.includes(value as SupportedPhotoMimeType);
}

export function getPhotoExtension(mimeType: SupportedPhotoMimeType) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

export function sanitizePhotoName(photoName: string) {
  const safeName = photoName
    .trim()
    .replace(/[/\\]/g, "_")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

  return safeName || "driveway-photo";
}

function hasImageSignature(
  buffer: Buffer,
  mimeType: SupportedPhotoMimeType
): boolean {
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  return (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export function decodePhotoBase64(
  photoBase64: string,
  mimeType: SupportedPhotoMimeType
) {
  if (!/^[A-Za-z0-9+/=\s]+$/.test(photoBase64)) {
    throw new Error("Photo data is not valid base64");
  }

  const buffer = Buffer.from(photoBase64, "base64");
  if (buffer.length === 0) {
    throw new Error("Photo data is empty");
  }
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new Error("Photo must be 10 MB or smaller");
  }
  if (!hasImageSignature(buffer, mimeType)) {
    throw new Error("Photo data does not match the declared image type");
  }

  return buffer;
}

export function buildStoredPhotoName(
  photoName: string,
  mimeType: SupportedPhotoMimeType
) {
  const safeName = sanitizePhotoName(photoName);
  const extension = getPhotoExtension(mimeType);

  if (
    mimeType === "image/jpeg" &&
    (safeName.toLowerCase().endsWith(".jpg") ||
      safeName.toLowerCase().endsWith(".jpeg"))
  ) {
    return safeName;
  }

  if (safeName.toLowerCase().endsWith(`.${extension}`)) {
    return safeName;
  }

  return `${safeName}.${extension}`;
}
