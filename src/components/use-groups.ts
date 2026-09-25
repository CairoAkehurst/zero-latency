'use client';
import { useMemo } from 'react';
import { groupThreads, type ThreadGroup } from '@/lib/shared/views';
import { useAccountData } from '@/lib/client/store';
import { useMail } from './mail-context';

/** Groups the loaded threads the way the current view (or folder) asks. Shared by the list and the sidebar. */
export function useThreadGroups(): ThreadGroup[] {
  const { nav, activeView: view, threads, labels, me } = useMail();
  const data = useAccountData();
  return useMemo(() => {
    const groupBy = view?.groupBy ?? (nav.kind === 'folder' && ['drafts', 'spam', 'trash'].includes(nav.id) ? { kind: 'none' as const } : { kind: 'date' as const });
    const props = view ? data.properties[view.id] ?? [] : [];
    const prop = groupBy.kind === 'property' ? props.find((p) => p.id === groupBy.propertyId) : undefined;
    return groupThreads(threads, groupBy, {
      me, labels,
      propertyValue: prop ? (id) => {
        const v = data.values[id]?.[prop.id];
        const opt = prop.options.find((o) => o.id === (Array.isArray(v) ? v[0] : v)) ?? prop.options.find((o) => o.id === prop.defaultOptionId);
        return opt?.name ?? null;
      } : undefined,
      propertyOptions: prop?.options.map((o) => o.name),
    });
  }, [threads, view, nav, me, labels, data.properties, data.values]);
}
