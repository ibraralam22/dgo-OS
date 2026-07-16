# ==========================================
# Stage 1: Build NestJS Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install package files
COPY package*.json ./

# Install packages including devDependencies
RUN npm ci

# Copy application source files
COPY . .

# Generate Prisma Client code
RUN npx prisma generate

# Compile TypeScript code
RUN npm run build

# Remove development dependencies to keep final image minimal
RUN npm prune --production

# ==========================================
# Stage 2: Production Execution Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy configurations, prisma schemes, and build outputs
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 5000

# Start server using node execution
CMD ["node", "dist/main.js"]
