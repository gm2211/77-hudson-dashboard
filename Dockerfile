FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client and build frontend + server
RUN npm run build

# --- Production ---
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Prisma generated client from build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Built frontend + bundled server
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# Prisma schema + empty database (schema applied, app seeds on first start)
COPY --from=build /app/prisma ./prisma

# Static assets (built-in images)
COPY public ./public

# Symlink uploads into dist so express.static serves them in production
RUN mkdir -p public/images/uploads \
 && rm -rf dist/images/uploads \
 && ln -s /app/public/images/uploads dist/images/uploads

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist-server/index.js"]
