import { uploadPublicImage } from "@/lib/storage/upload-public-image";

/** Une image du blog (couverture ou image d'article) : bucket `blog`, equipe. */
export function uploadBlogImage(file: File, userId: string) {
  return uploadPublicImage("blog", file, userId, {
    maxBytes: 10 * 1024 * 1024,
    types: /^image\/(jpeg|png|webp|gif)$/,
  });
}
