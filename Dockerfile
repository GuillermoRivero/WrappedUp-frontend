# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci && \
    npm install -D tailwindcss postcss autoprefixer

COPY . .

# Make sure the build arg is required
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:?'NEXT_PUBLIC_API_URL is required'}

# Create a .env.production file
RUN echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" > .env.production

RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV HOSTNAME=0.0.0.0
ENV PORT=80

# Add build arg to production stage and make it required
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:?'NEXT_PUBLIC_API_URL is required'}

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.env.production ./

EXPOSE 80

# Use JSON format for CMD to prevent signal handling issues
CMD ["sh", "-c", "echo \"Using API URL: $NEXT_PUBLIC_API_URL\" && node server.js -H 0.0.0.0 -p 80"] 