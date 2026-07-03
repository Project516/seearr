FROM node:22.22.2-alpine3.23@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ARG COMMIT_TAG
ARG BUILD_VERSION
ARG SOURCE_DATE_EPOCH

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile && pnpm build

ENV NODE_ENV=production
EXPOSE 5055

CMD ["node", "dist/index.js"]
