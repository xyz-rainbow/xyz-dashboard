import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { parsePackIconRef } from '../iconLibrary';

/** Resolves `pack:<packId>:<iconId>` to an absolute file URL for `<img src>`. */
export function useResolvedPackIconSrc(iconValue?: string) {
  const packRef = parsePackIconRef(iconValue);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!packRef) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    invoke<string>('resolve_pack_icon_path', {
      packId: packRef.packId,
      iconId: packRef.iconId,
    })
      .then((path) => {
        if (!cancelled) setSrc(path);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [iconValue, packRef?.packId, packRef?.iconId]);

  return { packRef, src, isPackIcon: Boolean(packRef) };
}
