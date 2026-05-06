import { PrismaClient } from '@prisma/client';

async function test(url: string): Promise<boolean> {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    return true;
  } catch (err: any) {
    try { await prisma.$disconnect(); } catch {}
    console.log('   →', err.message);
    return false;
  }
}

const password = 'VideoRemix2026';
const projectRef = 'bzxohkrxcwodllketcpz';
const regions = ['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'ap-southeast-2'];

for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  // Transaction mode port 6543, with external_id reference option
  const url = `postgresql://postgres:${password}@${host}:6543/postgres?sslmode=require&options=reference%3D${projectRef}`;
  console.log(`→ Tx mode +options ${region}...`);
  if (await test(url)) {
    console.log(`\n✅ Transaction mode with options success! Region: ${region}`);
    console.log(`   URL: ${url}`);
    process.exit(0);
  }
}
console.log('\n❌ No pooler configuration succeeded with options.');
