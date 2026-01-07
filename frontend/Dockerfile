# STAGE 1: Build the application
# We use Node 22 because your devDependencies include @types/node^22
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files to install dependencies
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for the build)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the application (creates the /build folder)
RUN npm run build


# STAGE 2: Production Runner
# This stage creates the final, smaller image
FROM node:22-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package.json and lockfile to install production-only deps
COPY package.json package-lock.json ./

# Install ONLY production dependencies (skips devDependencies like TypeScript/Vite)
RUN npm ci --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /app/build ./build

# Expose the port used by react-router-serve (default is 3000)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]