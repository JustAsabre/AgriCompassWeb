# Use Node.js 20 as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size (use legacy peer deps to avoid conflicts)
RUN npm prune --omit=dev --legacy-peer-deps

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]