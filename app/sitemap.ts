import type { MetadataRoute } from "next";

const SITE = "https://monogate.dev";

const STATIC_PATHS: Array<{ path: string; priority: number; changefreq: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/",                            priority: 1.0, changefreq: "weekly" },
  { path: "/challenge",                   priority: 0.9, changefreq: "weekly" },
  { path: "/challenge/leaderboard",       priority: 0.8, changefreq: "weekly" },
  { path: "/challenge/search",            priority: 0.7, changefreq: "monthly" },
  { path: "/lab",                         priority: 0.9, changefreq: "weekly" },
  { path: "/lab/optimizer",               priority: 0.8, changefreq: "monthly" },
  { path: "/lab/em-cost",                 priority: 0.8, changefreq: "monthly" },
  { path: "/explorer",                    priority: 0.8, changefreq: "monthly" },
  { path: "/superbest",                   priority: 0.9, changefreq: "monthly" },
  { path: "/one-operator",                priority: 0.7, changefreq: "monthly" },
  { path: "/how-to-submit",               priority: 0.6, changefreq: "monthly" },
  { path: "/docs",                        priority: 0.6, changefreq: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_PATHS.map((p) => ({
    url: `${SITE}${p.path}`,
    lastModified: now,
    changeFrequency: p.changefreq,
    priority: p.priority,
  }));
}
