from node:18-alpine as base
workdir /usr/src/app

run npm i -g pnpm

from base as deps
workdir /app

copy package.json pnpm-lock.yaml ./
run pnpm i

from base as build
workdir /app

copy . .
copy --from=deps /app/node_modules ./node_modules
run pnpm build
run pnpm prune --prod

from base as deploy
workdir /app

copy package.json ./
copy --from=build /app/out ./out/
copy --from=build /app/node_modules ./node_modules

cmd ["node", "./out/index.js"]
