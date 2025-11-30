# first build to see if it passes all tests
FROM node:25-slim AS build

WORKDIR /app

COPY app/package*.json ./
RUN npm install

COPY app/ ./
COPY tests-data/ /data
COPY tests/ /tests

ENV NODE_ENV="development"

# jest localstorage has to be set since otherwise it may send a warning
RUN NODE_OPTIONS="--localstorage-file=/tests/jest-storage" npm test

# production build
FROM node:25-slim AS production

WORKDIR /app

COPY --from=build app/ ./

ENV NODE_ENV="production"

RUN npm prune --omit=dev

EXPOSE 8000

CMD ["node", "server.js"]
