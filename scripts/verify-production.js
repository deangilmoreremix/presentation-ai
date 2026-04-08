#!/usr/bin/env node
// Production readiness verification script

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const checks = {
  environment: false,
  docker: false,
  security: false,
  monitoring: false,
  testing: false,
  documentation: false,
};

const issues = [];

console.log("🔍 Production Readiness Verification\n");

// Check environment configuration
console.log("📋 Environment Configuration:");
if (existsSync(".env.production.example")) {
  console.log("✅ .env.production.example exists");
  checks.environment = true;
} else {
  console.log("❌ .env.production.example missing");
  issues.push("Environment example file not found");
}

// Check Docker setup
console.log("\n🐳 Docker Configuration:");
if (existsSync("Dockerfile")) {
  console.log("✅ Dockerfile exists");
} else {
  console.log("❌ Dockerfile missing");
  issues.push("Dockerfile not found");
}

if (existsSync("docker-compose.prod.yml")) {
  console.log("✅ docker-compose.prod.yml exists");
  checks.docker = true;
} else {
  console.log("❌ docker-compose.prod.yml missing");
  issues.push("Production docker-compose file not found");
}

// Check security setup
console.log("\n🔒 Security Configuration:");
if (existsSync("middleware.ts")) {
  console.log("✅ Security middleware exists");
} else {
  console.log("❌ Security middleware missing");
  issues.push("Security middleware not found");
}

if (existsSync("src/lib/security/")) {
  console.log("✅ Security utilities exist");
  checks.security = true;
} else {
  console.log("❌ Security utilities missing");
  issues.push("Security utilities not found");
}

// Check monitoring setup
console.log("\n📊 Monitoring Configuration:");
if (existsSync("src/app/api/health/route.ts")) {
  console.log("✅ Health check endpoint exists");
} else {
  console.log("❌ Health check endpoint missing");
  issues.push("Health check endpoint not found");
}

if (existsSync("src/lib/logging/")) {
  console.log("✅ Logging system exists");
  checks.monitoring = true;
} else {
  console.log("❌ Logging system missing");
  issues.push("Logging system not found");
}

// Check testing setup
console.log("\n🧪 Testing Configuration:");
if (existsSync("vitest.config.ts")) {
  console.log("✅ Test configuration exists");
} else {
  console.log("❌ Test configuration missing");
  issues.push("Test configuration not found");
}

if (existsSync("src/__tests__/")) {
  console.log("✅ Test files exist");
  checks.testing = true;
} else {
  console.log("❌ Test files missing");
  issues.push("Test files not found");
}

// Check documentation
console.log("\n📚 Documentation:");
if (existsSync("PRODUCTION.md")) {
  console.log("✅ Production documentation exists");
} else {
  console.log("❌ Production documentation missing");
  issues.push("Production documentation not found");
}

if (existsSync("README.md")) {
  const readme = readFileSync("README.md", "utf8");
  if (readme.includes("Production Deployment")) {
    console.log("✅ README includes deployment info");
    checks.documentation = true;
  } else {
    console.log("❌ README missing deployment info");
    issues.push("README missing deployment information");
  }
} else {
  console.log("❌ README.md missing");
  issues.push("README file not found");
}

// Check package.json scripts
console.log("\n📦 Package.json Scripts:");
try {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const requiredScripts = ["prod:build", "prod:start", "prod:migrate", "health:check"];

  for (const script of requiredScripts) {
    if (packageJson.scripts[script]) {
      console.log(`✅ ${script} script exists`);
    } else {
      console.log(`❌ ${script} script missing`);
      issues.push(`Package.json missing ${script} script`);
    }
  }
} catch (error) {
  console.log("❌ Cannot read package.json");
  issues.push("Package.json not readable");
}

// Summary
console.log("\n🎯 Summary:");
const passedChecks = Object.values(checks).filter(Boolean).length;
const totalChecks = Object.keys(checks).length;

console.log(`✅ ${passedChecks}/${totalChecks} checks passed`);

if (issues.length === 0) {
  console.log("\n🎉 Application is PRODUCTION READY!");
  console.log("\nNext steps:");
  console.log("1. Configure environment variables");
  console.log("2. Set up PostgreSQL database");
  console.log("3. Run: docker-compose -f docker-compose.prod.yml up -d");
  console.log("4. Execute migrations: docker-compose exec app pnpm prod:migrate");
  console.log("5. Configure domain and SSL certificates");
  console.log("6. Set up monitoring and alerting");
} else {
  console.log("\n❌ Issues found:");
  issues.forEach(issue => console.log(`   - ${issue}`));
  console.log("\n🔧 Please resolve the issues above before deploying to production.");
}