'use client';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Inline script that runs before first paint. It is rendered on the server and matched during hydration only;
 * fresh client renders (e.g. error recovery) render nothing, because React cannot execute a script it creates and
 * warns when it tries. By then the script has already run.
 */
export function BootScript({ code }: { code: string }) {
  const fromServer = useSyncExternalStore(subscribe, () => false, () => true);
  return fromServer ? <script dangerouslySetInnerHTML={{ __html: code }} /> : null;
}
