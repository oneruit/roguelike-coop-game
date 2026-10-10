/**
 * Resolves a public asset path against Vite's base URL (e.g. for GitHub Pages).
 * Ensures that both local dev ('/'), relative paths ('./'), and subpaths ('/roguelike-coop-game/') work seamlessly.
 */
export function getAssetUrl(path: string): string {
  if (!path) return '';
  if (
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  const base = (import.meta.env?.BASE_URL || '/').trim();
  const cleanBase = base.endsWith('/') ? base : `${base}/`;

  // If path is already relative with './'
  let cleanPath = path;
  if (cleanPath.startsWith('./')) {
    cleanPath = cleanPath.slice(2);
  }

  // Remove leading slash if any
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.slice(1);
  }

  // Check if cleanPath already begins with the base path segment (e.g. "roguelike-coop-game/")
  const baseSegment = cleanBase.replace(/^\/+|\/+$/g, '');
  if (baseSegment && cleanPath.startsWith(`${baseSegment}/`)) {
    return cleanBase.startsWith('/') ? `/${cleanPath}` : `./${cleanPath}`;
  }

  return `${cleanBase}${cleanPath}`;
}
