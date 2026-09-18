# ==============================================================================
# STAGE 1: BUILD (Compiles TypeScript & Generates Prisma Client)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies required for compilation)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy Prisma Schema and generate Prisma Client engine
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source code and compile TypeScript
COPY src ./src
RUN npm run build

# ==============================================================================
# STAGE 2: PRODUCTION RUNTIME (Minimal & Secure Image)
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client artifacts from builder stage
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled JavaScript files
COPY --from=builder /app/dist ./dist

# Expose API Service Port
EXPOSE 3000

# Launch REST API Server
CMD ["node", "dist/index.js"]
