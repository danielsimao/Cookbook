import * as cheerio from "cheerio";

export async function scrapeUrl(url: string): Promise<{ html: string; imageUrl: string | null }> {
  // Handle Pinterest URLs - they often redirect, so we follow
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer to reduce noise
  $("script, style, nav, footer, header, iframe, noscript").remove();

  // Try to find recipe image
  let imageUrl: string | null = null;
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) imageUrl = ogImage;

  // Get cleaned HTML (main content area if possible)
  const mainContent =
    $("article").html() ||
    $('[itemtype*="Recipe"]').html() ||
    $("main").html() ||
    $("body").html() ||
    "";

  return { html: mainContent, imageUrl };
}
