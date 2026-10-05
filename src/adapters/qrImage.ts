export async function decodeQrImage(
  file: File,
  signal: AbortSignal,
): Promise<string> {
  if (file.size > 5000000 || !/^image\/(png|jpeg|webp)$/.test(file.type))
    throw new Error("Use a PNG, JPEG or WebP QR image up to 5 MB.");
  signal.throwIfAborted();
  const { default: jsQR } = await import("jsqr");
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(file);
  try {
    signal.throwIfAborted();
    if (bitmap.width * bitmap.height > 20000000)
      throw new Error("QR image dimensions are too large.");
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error(
        "Image reading is unavailable. Paste the request instead.",
      );
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(data.data, data.width, data.height);
    signal.throwIfAborted();
    if (!code?.data)
      throw new Error(
        "No supported single QR code found. Try a clear image or paste its text.",
      );
    if (code.data.length > 140000)
      throw new Error("QR data exceeds the supported limit.");
    return code.data;
  } finally {
    bitmap.close();
  }
}
