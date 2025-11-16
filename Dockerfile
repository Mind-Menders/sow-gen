# --- builder stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest
COPY . .

# Build client and server
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Copy any needed public/server runtime files (if any)
# expose port (server defaults to 5000)
EXPOSE 5000

# Default environment (can be overridden at runtime)
ENV PORT=5000

# Start the server
CMD ["node", "dist/index.js"]
