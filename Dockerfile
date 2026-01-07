# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy source
COPY . .

# Build client
RUN cd client && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Install production dependencies only
WORKDIR /app/server
RUN npm install --omit=dev

# Create data directories
RUN mkdir -p data/analytics data/authors

# Copy author data
COPY --from=builder /app/server/data/authors ./data/authors

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "index.js"]
