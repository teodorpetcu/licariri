# first build to see if it passes all tests
FROM denoland/deno AS build

WORKDIR /app

COPY app/deno.json app/deno.lock app/package*.json /app
RUN deno ci --prod --skip-types

COPY app/ /app
COPY tests-data/ /data

ENV NODE_ENV="development"

RUN deno task build:client
RUN deno test -A

# production build
FROM denoland/deno AS production

WORKDIR /app

COPY --from=build app/ ./

ENV NODE_ENV="production"

VOLUME /data

EXPOSE 8000

CMD ["deno", "--cached-only", "-A", "app.ts"]
