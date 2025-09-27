# Use Node.js 20+ as required by your engines
FROM node:20-alpine

# Install git (required by yarn for some dependencies)
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock (if available)
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Set PORT environment variable for Cloud Run
ENV PORT=8080

# Expose port 8080
EXPOSE 8080

# Start the application with PORT override
CMD ["sh", "-c", "PORT=8080 yarn start"]
