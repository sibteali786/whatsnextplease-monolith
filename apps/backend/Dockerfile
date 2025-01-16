# Build Stage
FROM --platform=linux/amd64 node:20-alpine AS builder
# Install necessary build tools
RUN apk add --no-cache libc6-compat python3 make g++ openssl openssl-dev
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
# Copy root package files for monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json ./
# Copy package.json from workspaces we need
COPY packages/types/package.json ./packages/types/
COPY apps/backend/package.json ./apps/backend/
# Install dependencies (include dev dependencies for build)
RUN pnpm install --frozen-lockfile
# Copy source code for packages we need, excluding cdk
COPY packages/types/ ./packages/types/
# Copy the entire backend directory structure (excluding cdk)
COPY apps/backend/api ./apps/backend/api
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/.env* ./apps/backend/
# Generate Prisma Client and build
WORKDIR /app/apps/backend
# First generate Prisma client
RUN pnpm dlx prisma generate
# Then run TypeScript compilation
RUN pnpm tsc

# Production Stage
FROM --platform=linux/amd64 node:20-alpine AS runner
# Install curl and OpenSSL for health checks and Prisma
RUN apk add --no-cache curl openssl openssl-dev
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
# Copy necessary files from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
# Install production dependencies only
ENV NODE_ENV=${NODE_ENV:-production}
WORKDIR /app
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
# Generate Prisma Client in production
WORKDIR /app/apps/backend
RUN pnpm dlx prisma generate
# Add health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
# Expose port
EXPOSE 3000
# Start the application
CMD ["node", "dist/index.js"]