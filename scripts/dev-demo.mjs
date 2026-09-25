// Cross-platform `ZL_DEMO=1 next dev` (the inline env syntax does not work in Windows cmd or PowerShell).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
const child = spawn(process.execPath, [next, 'dev', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, ZL_DEMO: '1' } });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
