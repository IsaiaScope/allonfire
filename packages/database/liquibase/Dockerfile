# syntax=docker/dockerfile:1
# check=error=true

# The db-migrate image: Liquibase, the PostgreSQL driver, pg_dump and the
# changelog. Each deploy runs it twice before the Apps start (ADR 0008):
# `backup`, then `deploy`. Local and CI run it through scripts/liquibase.sh,
# so every environment runs the same bits.
#
# Build context is the repo root: the root package.json carries the release
# version the deploy tags. Dockerfile.dockerignore keeps the context to the
# three paths below.

# Pinned by digest: a tag can be re-pushed, a digest cannot. Bump tag and
# digest together (Dependabot opens the PR).
FROM liquibase/liquibase:5.0.4@sha256:060f96efff4811ccf03957ff3160f21ea04139b89940640f8ad54a065cdc6906

LABEL org.opencontainers.image.title="allonfire-db-migrate" \
      org.opencontainers.image.description="Applies the allonfire Liquibase changelog and tags the release" \
      org.opencontainers.image.source="https://github.com/IsaiaScope/allonfire" \
      org.opencontainers.image.licenses="MIT"

# Liquibase 5 ships without JDBC drivers. lpm verifies the jar's checksum; the
# version is pinned so a rebuild cannot change the driver underneath us.
ARG POSTGRESQL_DRIVER_VERSION=42.7.8
RUN lpm add "postgresql@${POSTGRESQL_DRIVER_VERSION}" --global

# pg_dump and pg_restore for the backup command, major version 16 to match the
# server. /backups belongs to the runtime user, so a named volume mounted there
# starts out writable by it, and 0700 keeps the dumps private.
USER root
RUN apt-get update \
 && apt-get install --yes --no-install-recommends "postgresql-client-16=16.*" \
 && rm -rf /var/lib/apt/lists/* \
 && install --directory --owner=liquibase --group=liquibase --mode=0700 /backups
VOLUME ["/backups"]

# Settings that never change between environments. Credentials and the URL
# arrive at run time (entrypoint.sh), never at build time.
#   STRICT: fail on a changeset without author, an unknown LIQUIBASE_* name or
#     a missing include, instead of skipping it (Liquibase calls it a best
#     practice; off by default).
#   DUPLICATE_FILE_MODE: two changelog files at one path is an error.
#   CHANGELOG_LOCK_WAIT_TIME: a lock left by a killed run fails the deploy
#     after 5 minutes instead of 60; clear it with `release-locks`.
#   ANALYTICS: usage data stays on our machines (ADR 0006).
ENV LIQUIBASE_ANALYTICS_ENABLED=false \
    LIQUIBASE_CHANGELOG_LOCK_WAIT_TIME_IN_MINUTES=5 \
    LIQUIBASE_COMMAND_CHANGELOG_FILE=db.changelog-master.yaml \
    LIQUIBASE_DUPLICATE_FILE_MODE=ERROR \
    LIQUIBASE_SEARCH_PATH=/liquibase/changelog \
    LIQUIBASE_SHOW_BANNER=false \
    LIQUIBASE_STRICT=true

# Owned by root and read-only to the runtime user: the container can read the
# changelog but never rewrite it. --chmod also normalises files from a
# filesystem without Unix owners (exFAT), and BuildKit applies it to the
# directories COPY creates, so directories need the execute bit: 0555.
COPY --chmod=0555 package.json /liquibase/release/package.json
COPY --chmod=0555 packages/database/changelog/ /liquibase/changelog/
COPY --chmod=0555 packages/database/liquibase/database-url.sh packages/database/liquibase/entrypoint.sh /liquibase/scripts/

# Back to the base image's unprivileged user for everything at run time.
USER liquibase:liquibase

ENTRYPOINT ["/liquibase/scripts/entrypoint.sh"]
CMD ["status", "--verbose"]
