# ==============================================================================
# STAGE 1: BUILD (Compiles Angular 18 Single Page Application)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies using clean install
COPY package*.json ./
RUN npm ci

# Copy project files and build production application bundle
COPY . .
CMD ["npm", "run", "build"]
