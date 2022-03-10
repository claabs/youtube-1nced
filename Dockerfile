########
# BASE
########
FROM node:16-alpine3.15 as base

WORKDIR /usr/app

RUN apk add --no-cache tini

########
# BUILD
########
FROM base as build

# Copy all jsons
COPY package*.json tsconfig.json ./

# Add dev deps
RUN npm ci

# Copy source code
COPY src src

RUN npm run build

########
# DEPLOY
########
FROM base as deploy

COPY package*.json ./
RUN npm ci --only=production

# Steal compiled code from build image
COPY --from=build /usr/app/dist dist

USER node
# RUN mkdir config

ARG COMMIT_SHA=""

ENV NODE_ENV=production \
    COMMIT_SHA=${COMMIT_SHA}

ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "node", "/usr/app/dist/index.js" ]