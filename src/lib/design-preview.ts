// Never show proposed projects in production, even if the local flag is copied.
export function isDesignPreview(query?: string): boolean {
  return process.env.NODE_ENV === "development" &&
    query !== "0" &&
    (query === "1" || process.env.SEBGD_DESIGN_PREVIEW === "1");
}
