# Use Node.js 20 LTS (Iron) - current LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Install dev dependencies for building
RUN npm ci && npm run build

# Ensure schema.sql is available in dist
RUN mkdir -p dist/database && cp src/database/schema.sql dist/database/

# Remove dev dependencies and reinstall only production
RUN rm -rf node_modules && npm ci --only=production

# Expose port
EXPOSE 4019

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4019/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]