/**
 * Reduit une image dans le navigateur avant envoi (avatar, etc.).
 *
 * Une photo de telephone pese souvent 3 a 8 Mo : sans ca, la limite de 2 Mo
 * de l'envoi d'avatar la refusait. L'image est redessinee en JPEG, son plus
 * grand cote ramene a `maxSize`. Si le navigateur ne sait pas la decoder,
 * le fichier d'origine est rendu tel quel (le serveur tranchera).
 */
export async function resizeImage(
  file: File,
  maxSize = 512,
  quality = 0.85
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Fond blanc : un PNG transparent ne devient pas noir en JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]*$/, "") || "avatar";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
