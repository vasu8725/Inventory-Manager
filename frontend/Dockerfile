# Stage 1: Build React Application
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install packages
RUN npm ci

# Copy project files
COPY . .

# Set build-time argument for API URL (defaults to localhost)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:8000}

# Build application
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy built files from Builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support SPA routing (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose Nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
