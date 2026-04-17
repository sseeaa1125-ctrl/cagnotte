FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client then build TypeScript
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Audit 030 HI-03 — Prisma generated client lives in src/generated/, not dist/
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./

EXPOSE 4000

CMD ["node", "dist/index.js"]
