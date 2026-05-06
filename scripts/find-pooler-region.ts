import { PrismaClient } from '@prisma/client';

async function testConnection(url: string): Promise<boolean> {
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

// Expanded list of Supabase/AWS regions
const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'us-west-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
  'me-south-1',
  'af-south-1',
  'ap-east-1',
];

for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const url = `postgresql://postgres.${projectRef}:${password}@${host}:5432/postgres?sslmode=require`;
  console.log(`→ Testing ${region}...`);
  if (await testConnection(url)) {
    console.log(`\n✅ Success! Region: ${region}`);
    console.log(`   Pooler URL: postgresql://postgres.${projectRef}:${password}@${host}:5432/postgres?sslmode=require`);
    process.exit(0);
  }
}
console.log('\n❌ No region matched.');
