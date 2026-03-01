# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY tsconfig.json ./

# Railway sets PORT automatically; we map it to APP_PORT
ENV MCP_TRANSPORT=HTTP
ENV APP_PORT=3000

EXPOSE 3000

CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]
