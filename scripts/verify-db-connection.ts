#!/usr/bin/env tsx
/**
 * Database Connection Verification Script
 *
 * Tests connectivity to the Supabase database using Prisma Client.
 * Run after updating .env with a valid DATABASE_URL.
 */
import { PrismaClient } from '@prisma/client';

async function verifyConnection() {
  console.log('🔍 Verifying database connectivity...');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^@]*@/, ':***@')}\n`);

  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database (TCP + SSL handshake OK)');

    // Simple query to verify query execution
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log('✅ Query executed successfully:', result);

    // Optionally check user count
    const userCount = await prisma.user.count();
    console.log(`ℹ️  User count: ${userCount}`);

    console.log('\n✅ Database connection fully functional.');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Database connection failed:');
    console.error('   ', err.message);
    if (err.meta?.cause) {
      console.error('   Cause:', err.meta.cause);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConnection();
