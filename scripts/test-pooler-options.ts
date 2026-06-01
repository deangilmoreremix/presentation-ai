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

// Get credentials from environment
const password = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF || process.env.PROJECT_REF || 'YOUR-PROJECT-REF';

if (!password) {
  console.log('❌ SUPABASE_DB_PASSWORD or DATABASE_PASSWORD environment variable required');
  process.exit(1);
}

const regions = ['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'ap-southeast-2'];

for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  // Transaction mode port 6543, with external_id reference option
  const url = `postgresql://postgres:${password}@${host}:6543/postgres?sslmode=require&options=reference%3D${projectRef}`;
  console.log(`→ Tx mode +options ${region}...`);
  if (await test(url)) {
    console.log(`\n✅ Transaction mode with options success! Region: ${region}`);
    console.log(`   URL: postgresql://postgres:***@${host}:6543/postgres?sslmode=require&options=reference%3D${projectRef}`);
    process.exit(0);
  }
}
console.log('\n❌ No pooler configuration succeeded with options.');