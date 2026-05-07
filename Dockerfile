FROM node:20-alpine

RUN npm install -g pnpm@9.0.0

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --filter=api...

COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/

RUN pnpm --filter=api build

RUN mkdir -p apps/api/dist/db && cp apps/api/src/db/schema.sql apps/api/dist/db/schema.sql

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["sh", "-c", "node apps/api/dist/db/migrate.js && node apps/api/dist/index.js"]
