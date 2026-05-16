export type InlineWpSize = "xxs" | "xs" | "s";
export type BlockWpSize = "m" | "l" | "xl";

export type WpSize = InlineWpSize | BlockWpSize;

// Visible link-text prefix for a work-package reference, sized to match the
// chip variant. Used by both inline and block toExternalHTML so the markdown
// export carries the size information visually:
//   xxs (tiny inline)            → "#"
//   xs  (compact inline)         → "##"
//   s   (regular inline)         → "###"
//   m / l / xl (block + preview) → "###"
export function hashesForSize(size: string | undefined): string {
  if (size === "xxs") return "#";
  if (size === "xs") return "##";
  return "###";
}
