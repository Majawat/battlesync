# Multi-stage build for production deployment
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for both backend and frontend
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install all dependencies (including dev dependencies for building)
RUN npm ci
RUN cd frontend && npm ci

# Copy source code
COPY src/ ./src/
COPY frontend/src/ ./frontend/src/
COPY frontend/public/ ./frontend/public/
COPY frontend/index.html ./frontend/
COPY frontend/*.config.* ./frontend/
COPY frontend/*.json ./frontend/
COPY tsconfig.json ./

# Build both backend and frontend
RUN npm run build:backend
RUN cd frontend && npm run build

# Ensure schema.sql is available in dist
RUN mkdir -p dist/database && cp src/database/schema.sql dist/database/

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application and frontend build
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/frontend/dist/ ./frontend/dist/

# Create data directory for SQLite
RUN mkdir -p data

# Expose port
EXPOSE 4019

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4019/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application in production mode
CMD ["npm", "run", "start:production"]