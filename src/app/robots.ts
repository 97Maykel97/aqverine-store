import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/aqverine-control", "/api/", "/checkout", "/login", "/register", "/forgot-password", "/payment/"],
    },
    sitemap: new URL("/sitemap.xml", origin).toString(),
  };
}
