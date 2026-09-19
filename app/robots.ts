import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.apexai.one";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/apexmind", "/account", "/api/"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
