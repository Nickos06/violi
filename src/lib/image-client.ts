// Browser-side image helpers: downscale + re-encode to JPEG so uploads are small and always a format
// the server accepts (this also converts iPhone HEIC photos that the browser can decode).

export async function compressImage(file: File, max = 1600, quality = 0.85): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", quality));
  return { blob, dataUrl };
}

export async function uploadImage(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.set("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error ?? "upload_failed");
  return json.url as string;
}
