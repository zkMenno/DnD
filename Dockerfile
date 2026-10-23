# Character sheets: PocketBase (with JS hooks) + the web app, one image: ghcr.io/zkmenno/dnd-tracker.
# Built by CI (.github/workflows/deploy.yml) for arm64 and run on the shared server by AppInfra (github.com/zkMenno/AppInfra):
# service `dnd`, behind the shared Caddy at dungeontracker.com. Local build:  docker build -t dnd-tracker .
#
# What AppInfra runs it with: port 3000 (GET /health → 200), a named volume on /pb/pb_data (database, uploads,
# PocketBase's own nightly backups), a read-only filesystem except /tmp, APP_URL (or ORIGIN) = https://dungeontracker.com.

# REG: optional registry mirror prefix, e.g. mirror.gcr.io/library/ (default: Docker Hub)
ARG REG=

# Runs on Arm and x86 alike: every base image here ships both, the server is pure Go (SQLite included, no C),
# and the web app is plain files.
# GOARM64: the Arm instruction level the server binary may use. Hetzner CAX (Ampere Altra, Neoverse N1) is Armv8.2,
# which brings faster atomic instructions (LSE) that Go's runtime and SQLite locking use. Older Arm boards
# (Raspberry Pi 4 and earlier): build with --build-arg GOARM64=v8.0. On x86 servers it's ignored.
ARG GOARM64=v8.2

# 1. PocketBase v0.40.x from source (same as the official binary, plus our flags). The Go version must match server/go.mod.
FROM ${REG}golang:1.27-alpine AS pb
ARG GOARM64
WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/pocketbase-main.go ./main.go
RUN CGO_ENABLED=0 GOARM64=${GOARM64} go build -trimpath -ldflags "-s -w" -o /pocketbase .

# 2. the web app (engine + packs + pages)
FROM ${REG}node:22-alpine AS web
WORKDIR /app
COPY src ./src
COPY packs ./packs
COPY data ./data
COPY web ./web
COPY tools/build.js tools/looks.js ./tools/
RUN node tools/build.js

# 3. runtime
FROM ${REG}alpine:3.20
# HTTPS root certificates from the Go image (no package downloads needed at this stage)
COPY --from=pb /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
RUN adduser -D -u 10001 pb
WORKDIR /pb
COPY --from=pb /pocketbase /pb/pocketbase
COPY server/pb_migrations /pb/pb_migrations
COPY server/pb_hooks /pb/pb_hooks
COPY --from=web /app/dist/web /pb/pb_public
RUN mkdir -p /pb/pb_data && chown -R pb:pb /pb
USER pb
EXPOSE 3000
VOLUME /pb/pb_data
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:3000", "--dir=/pb/pb_data", "--hooksDir=/pb/pb_hooks", "--migrationsDir=/pb/pb_migrations", "--publicDir=/pb/pb_public"]
