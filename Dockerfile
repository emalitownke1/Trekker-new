# Use Node.js 20+ slim image for smaller footprint
FROM node:20-alpine

# Install git (required by yarn for some dependencies)
RUN apk add --no-cache git

# Create non-root user for security and resource management
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock (if available)
COPY package.json yarn.lock* ./

# Install dependencies with production optimizations
RUN yarn install --frozen-lockfile --production=false && \
    yarn cache clean

# Copy source code
COPY . .
RUN chown -R botuser:nodejs /app

# Build the application
RUN yarn build

# Remove dev dependencies to save space
RUN yarn install --frozen-lockfile --production=true && \
    yarn cache clean

# Switch to non-root user
USER botuser

# Set environment variables for memory optimization
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=768 --optimize-for-size --gc-interval=100" \
    PORT=8080 \
    UV_THREADPOOL_SIZE=4

# Expose port 8080
EXPOSE 8080

# Health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application with resource-optimized settings
CMD ["sh", "-c", "PORT=8080 node --max-old-space-size=768 --optimize-for-size node_modules/.bin/tsx server/index.ts"]
