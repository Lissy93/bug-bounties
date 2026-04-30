ARG NODE_IMAGE=node:22-alpine

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS build
WORKDIR /app
ENV DEPLOY_TARGET=node
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
COPY platform-programs.yml independent-programs.yml ../
RUN npm run build

FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
ENV NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false
COPY web/package.json web/package-lock.json ./
RUN npm ci --omit=dev

FROM ${NODE_IMAGE} AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server.mjs ./
COPY --from=build --chown=node:node /app/package.json ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD wget -q --spider "http://127.0.0.1:${PORT:-8080}/" || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "./server.mjs"]
