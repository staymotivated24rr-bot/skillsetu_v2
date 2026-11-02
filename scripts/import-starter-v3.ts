import { importStarterDraft } from '../src/lib/diagnostic/starter-v3/import';
import { db } from '../src/lib/db';
async function main() {
  try {
    console.log(JSON.stringify(await importStarterDraft()));
  } finally {
    await db.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
