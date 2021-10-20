FROM node:alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN npm install --save styled-components
RUN yarn install

COPY . .
RUN yarn build

FROM nginx:alpine

ENV GRAPHQL_ENDPOINT="http://api/graphql" \
    GRAPHQL_SOCK_ENDPOINT="ws://api/graphql"

COPY deploy/entrypoint.sh /entrypoint.sh
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/build/ /var/www/html

RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
