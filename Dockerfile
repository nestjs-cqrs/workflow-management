FROM node:20-alpine AS development

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./

CMD ["npm", "run", "start:dev"]


FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist

USER appuser
EXPOSE ${PORT}
CMD ["node", "dist/main.js"]
