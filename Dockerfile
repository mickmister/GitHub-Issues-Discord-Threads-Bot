FROM node:22

RUN npm i -g pnpm

ADD . .

RUN pnpm i
RUN npm run build