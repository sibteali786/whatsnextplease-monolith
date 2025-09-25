# Build Stage
FROM node:20-alpine AS builder
# Install necessary build tools
RUN apk add --no-cache libc6-compat python3 make g++ openssl openssl-dev
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Copy root package files for monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json ./

# Copy package.json from workspaces we need
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/types/package.json ./packages/types/
COPY packages/logger/package.json ./packages/logger/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies (include dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code for packages we need
COPY packages/types/ ./packages/types/
COPY packages/logger/ ./packages/logger/
COPY packages/typescript-config/ ./packages/typescript-config/

# Build the packages first
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/packages/logger
RUN pnpm build

# Copy the backend files
WORKDIR /app/apps/backend
COPY apps/backend/api ./api
COPY apps/backend/prisma ./prisma
COPY apps/backend/tsconfig.json .
COPY apps/backend/.env* .

# Generate Prisma Client and build
RUN pnpm dlx prisma generate
RUN pnpm tsc

# Production Stage
FROM node:20-alpine AS runner
# Install build tools and runtime dependencies
RUN apk add --no-cache curl openssl openssl-dev python3 make g++
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/typescript-config/package.json ./packages/typescript-config/
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/logger/package.json ./packages/logger/
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/.env* ./apps/backend/

# Install production dependencies and rebuild bcrypt
ENV NODE_ENV=production
WORKDIR /app
# Use both --frozen-lockfile and --ignore-scripts, but allow specific scripts
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    cd apps/backend/node_modules/bcrypt && pnpm rebuild && cd ../.. && \
    pnpm dlx prisma generate

# Add health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

WORKDIR /app/apps/backend
# Start the application
CMD ["node", "dist/index.js"]