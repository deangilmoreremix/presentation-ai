# Next.js 16.2.1 requires Node >= 20.9 (engines.node); 22 is the current LTS.
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager.
# pnpm-workspace.yaml + patches/ must be copied too: the workspace file declares
# `patchedDependencies` and pnpm aborts a frozen install when that config does
# not match the lockfile.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY patches ./patches
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# PRODUCTION_DEPLOYMENT_CHECKLIST.md: the build needs a >=4GB heap.
ENV NODE_OPTIONS=--max-old-space-size=4096

# NEXT_PUBLIC_* variables are statically inlined into the client bundle at BUILD
# time, so they must be supplied here rather than only at runtime:
#   docker build --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... \
#               --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#               --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... .
# Server-only secrets (CLERK_SECRET_KEY, DATABASE_URL, ...) are read at runtime
# and are NOT passed as build args, so build-time validation has to be skipped;
# the runtime stage still validates and fails fast if they are missing.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Builder-stage only: `next.config.js` imports `src/env.js`, which validates on
# load. Deliberately NOT inherited by the `runner` stage, so a misconfigured
# container still fails at startup instead of silently booting broken.
ENV SKIP_ENV_VALIDATION=1

RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]