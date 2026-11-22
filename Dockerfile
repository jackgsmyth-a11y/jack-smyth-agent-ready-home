# Multi-stage production Dockerfile for Google Cloud Run (@workspace/home)
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.34.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/home/package.json artifacts/home/tsconfig.json artifacts/home/build.mjs ./artifacts/home/
COPY artifacts/home/src ./artifacts/home/src
COPY artifacts/home/public ./artifacts/home/public

RUN pnpm install --frozen-lockfile --filter @workspace/home...
RUN pnpm --filter @workspace/home run typecheck
RUN pnpm --filter @workspace/home run build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/artifacts/home/dist/index.mjs ./dist/index.mjs
COPY --from=builder /app/artifacts/home/public ./public

USER node
EXPOSE 8080

CMD ["node", "./dist/index.mjs"]
