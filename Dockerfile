FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json next.config.js tsconfig.json tailwind.config.ts postcss.config.js ./
COPY public ./public
COPY src ./src

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Runtime environment variables for backend connectivity
# These are read at runtime, not build time
ENV TF_SDK_URL=http://tf-sdk-api:8200
ENV TF_SDK_API_URL=http://tf-sdk-api:8200
ENV CORESIM_URL=http://core-simulator:8081

# Copy everything needed for Next.js to run
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src ./src

EXPOSE 3000

ENV PORT 3000

CMD ["npx", "next", "start"]
