# syntax=docker/dockerfile:1

# EverydayTools backend — production image.
# Build context: repository root is NOT required; build from Utilza_backend/.
#   docker build -t utilza-backend ./Utilza_backend
# Run (see docs/DEPLOY.md for the full variable table):
#   docker run --env-file .env -p 4000:4000 utilza-backend

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
# generate needs DATABASE_URL present (never connects); the real value is
# injected at runtime via --env-file (see docs/DEPLOY.md).
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate && npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Carry node_modules from build: it holds prod deps, the prisma CLI (needed
# for `migrate deploy` at boot) and the generated Prisma client. A separate
# `npm ci --omit=dev` would uninstall the CLI and break migrations.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json package-lock.json ./
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]
