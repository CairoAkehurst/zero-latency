import { json, withErrors } from '@/lib/server/api';
import { env } from '@/lib/server/env';
import { DEMO_ACCOUNT } from '@/lib/server/demo';
import { loadAccount, publicAccount } from '@/lib/server/session';
import type { SessionInfo } from '@/lib/shared/types';

export async function GET(req: Request) {
  return withErrors(req, async () => {
    const e = env();
    if (e.demo) {
      const info: SessionInfo = { accounts: [{ ...DEMO_ACCOUNT, canReadFreeBusy: true }], activeId: DEMO_ACCOUNT.id, demo: true, aiEnabled: true };
      return json(info);
    }
    const a = await loadAccount();
    if (!a) return json({ accounts: [], activeId: null, demo: false, aiEnabled: false } satisfies SessionInfo);
    const info: SessionInfo = { accounts: [publicAccount(a)], activeId: a.id, demo: false, aiEnabled: !!e.openaiApiKey };
    return json(info);
  });
}
