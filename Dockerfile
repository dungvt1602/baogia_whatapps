# syntax=docker/dockerfile:1

# ============================================================
# Base
# ============================================================
FROM node:22-alpine AS base
# libc6-compat: một số package cần cho glibc trên Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ============================================================
# Cài dependencies
# ============================================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# Build ứng dụng Next.js
# ============================================================
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ============================================================
# Runner (image production, gọn nhẹ)
# ============================================================
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Chạy bằng user không phải root cho an toàn
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy output standalone (đã trace sẵn node_modules cần thiết)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
