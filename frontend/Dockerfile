# ====
# BANDspirit — Next.js Frontend Dockerfile (V1.0.2)
# Kein Prisma / kein Datenbankzugriff mehr im Frontend.
# Alle DB-Operationen laufen im C# OData Backend (Dockerfile.api).
# ====

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
# libc6-compat: benötigt für kompatible Node.js Binaries unter Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --production=false --ignore-engines

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=8192"

RUN yarn build

# ── Stage 3: Production Runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner
# wget: für Health-Check benötigt
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sicherheit: Non-root User
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Next.js Standalone-Artefakte kopieren
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 -O /dev/null http://localhost:3000 || exit 1

CMD ["node", "server.js"]
