FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/config/package.json packages/config/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN npm run db:generate && npm run build
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
