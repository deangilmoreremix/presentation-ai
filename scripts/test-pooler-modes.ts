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
  // Transaction mode: port 6543, username 'postgres'
  const url = `postgresql://postgres:${password}@${host}:6543/postgres?sslmode=require`;
  console.log(`→ Tx mode ${region}...`);
  if (await test(url)) {
    console.log(`\n✅ Transaction mode success! Region: ${region}`);
    console.log(`   URL: ${url}`);
    process.exit(0);
  }
}
// Also try session mode with 'postgres' username just in case
for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const url = `postgresql://postgres:${password}@${host}:5432/postgres?sslmode=require`;
  console.log(`→ Session mode (postgres user) ${region}...`);
  if (await test(url)) {
    console.log(`\n✅ Session mode (postgres user) success! Region: ${region}`);
    console.log(`   URL: ${url}`);
    process.exit(0);
  }
}
console.log('\n❌ No pooler configuration succeeded.');
