FROM node:alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

FROM nginx:alpine

COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/build/ /var/www/html
