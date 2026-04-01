import { convertFileSrc } from '@tauri-apps/api/core';

/** Local filesystem paths need conversion for `<img>` in the WebView. */
export function toDisplaySrc(localPath: string): string {
  const p = localPath.trim();
  if (!p) return '';
  if (
    p.startsWith('http://') ||
    p.startsWith('https://') ||
    p.startsWith('data:') ||
    p.startsWith('blob:') ||
    p.startsWith('asset:')
  ) {
    return p;
  }
  return convertFileSrc(p);
}
