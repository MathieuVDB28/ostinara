import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/blog/categories";

/** Les moteurs lisent les pages publiques ; l'app elle-meme demande un compte. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/commu/", "/admin"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
