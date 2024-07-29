FROM node:20.16.0-alpine AS base

RUN apk add --no-cache curl tini

################################ Development BE ####################################

FROM base AS app-dev

# Set the workdir
WORKDIR /home/node/storage-server

# Copy the entrypoint script to a non-volumed folder
COPY ./scripts/entrypoint.sh /home/node/entrypoint.sh

# Make tini the entry point of the image
ENTRYPOINT ["/sbin/tini", "-s", "--"]

# Run the script as PID 1
CMD ["/home/node/entrypoint.sh"]
