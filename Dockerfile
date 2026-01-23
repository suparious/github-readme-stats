FROM node:22-slim AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies (--ignore-scripts skips husky setup)
RUN npm ci --omit=dev --ignore-scripts

# Copy application source
COPY . .

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/api ./api
COPY --from=builder /app/src ./src
COPY --from=builder /app/themes ./themes

# Expose the default port
EXPOSE 9000

# Run as non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the server
CMD ["node", "server.js"]
