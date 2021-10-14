#!/bin/sh

# Write config file based on ENV vars
cat <<EOF > /var/www/html/config.json
{"apolloSock":"${GRAPHQL_SOCK_ENDPOINT}","apolloHttp":"${GRAPHQL_ENDPOINT}"}
EOF

# Start NGINX
nginx -g "daemon off;"
