FROM node:22.22.2-alpine3.23@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS prod-deps

WORKDIR /app
COPY pnpm-lock.yaml package.json ./
COPY bin ./bin
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --prod --frozen-lockfile

# Remove large native modules for linux-x64-gnu platform (we use alpine which is musl-based)
RUN du -shL ./node_modules/.pnpm/* 2>/dev/null | grep '[0-9]M.*' | grep 'linux-x64-gnu@' | awk '{print $2}' | xargs rm -rf || true

FROM base AS build

ARG COMMIT_TAG
ENV COMMIT_TAG=${COMMIT_TAG}

WORKDIR /app
COPY . .

RUN apk add --no-cache python3 make g++ gcc libc6-compat bash && \
  npm install --global node-gyp
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CYPRESS_INSTALL_BINARY=0 pnpm install --frozen-lockfile
RUN pnpm build && rm -rf .next/cache

FROM base

ARG COMMIT_TAG
ENV NODE_ENV=production
ENV COMMIT_TAG=${COMMIT_TAG}

RUN apk add --no-cache tzdata

WORKDIR /app

COPY --chown=node:node . .
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/dist ./dist

# config/ may not exist in a clean checkout (its contents are gitignored),
# but the app needs it writable for its database and logs at runtime
RUN mkdir -p config && chown node:node config && \
  touch config/DOCKER && \
  echo "{\"commitTag\": \"${COMMIT_TAG}\"}" > committag.json

USER node:node

EXPOSE 5055

CMD ["npm", "start"]
