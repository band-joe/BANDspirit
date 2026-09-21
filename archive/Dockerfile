# ==============================================================================
# BANDspirit — Multi-Stage Dockerfile
# ==============================================================================

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --production=false

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma-Schema für Docker-Umgebung anpassen (Output-Pfad + Binary-Targets)
RUN sed -i '/^[[:space:]]*output/s|output.*|output = "./node_modules/.prisma/client"|' prisma/schema.prisma && \
    sed -i '/^[[:space:]]*binaryTargets/s|binaryTargets.*|binaryTargets = ["native", "linux-musl-openssl-3.0.x", "linux-musl-arm64-openssl-3.0.x"]|' prisma/schema.prisma

# next.config.js: outputFileTracingRoot auf Container-Pfad setzen
RUN sed -i "s|outputFileTracingRoot:.*|outputFileTracingRoot: '/app',|" next.config.js

# Prisma Client generieren
RUN yarn prisma generate

# Next.js Build (Standalone-Modus)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_DIST_DIR=.build
ENV NEXT_OUTPUT_MODE=standalone
ENV NODE_OPTIONS="--max-old-space-size=8192"

RUN yarn build

# ── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:18-alpine AS runner
RUN apk add --no-cache libc6-compat openssl wget
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sicherheit: Non-root User
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone-Artefakte kopieren
COPY --from=builder /app/.build/standalone ./
COPY --from=builder /app/.build/static ./.build/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Uploads-Verzeichnis
RUN mkdir -p uploads && chown nextjs:nodejs uploads

# Berechtigungen setzen
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health-Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/auth/providers || exit 1

CMD ["node", "server.js"]
