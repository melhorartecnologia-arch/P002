# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies
RUN corepack enable && \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# Copy source code
COPY . .

# Build TypeScript
RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; \
    elif [ -f yarn.lock ]; then yarn build; \
    else npm run build; fi

# Stage 2: Run
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

# Copy package files and install production deps only
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

RUN corepack enable && \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile --prod; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile --production; \
    elif [ -f package-lock.json ]; then npm ci --omit=dev; \
    else npm install --omit=dev; fi

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

USER appuser

EXPOSE 3001

CMD ["node", "dist/main.js"]
