# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.16.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p ./cache && touch ./cache/notes.json && chown node:node ./cache/notes.json

USER node

EXPOSE 8000

CMD ["npm", "run", "start"]