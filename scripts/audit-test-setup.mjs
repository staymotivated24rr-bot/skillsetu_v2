import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:process.env,stdio:'pipe'});
execFileSync(process.execPath,['--import','tsx','prisma/seed.ts'],{env:process.env,stdio:'pipe'});
