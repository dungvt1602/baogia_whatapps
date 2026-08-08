# syntax=docker/dockerfile:1

# ============================================================
# Base
# ============================================================
FROM node:22-alpine AS base
# libc6-compat: một số package cần cho glibc trên Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ============================================================
# Cài dependencies (chạy `prisma generate` qua postinstall)
# ============================================================
FROM base AS deps
# Cần package + schema + config để postinstall `prisma generate` chạy được
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Placeholder để prisma.config.ts (env()) load được lúc build. Giá trị thật đến từ
# docker-compose (env_file) khi container chạy, không dính vào image.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm ci

# ============================================================
# Build ứng dụng Next.js
# ============================================================
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
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

# Copy output standalone (đã trace sẵn node_modules cần thiết, gồm Prisma Client)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
