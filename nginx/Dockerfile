FROM nginx:alpine

# openssl no viene instalado por defecto en nginx:alpine, hace falta añadirlo
RUN apk add --no-cache openssl

COPY conf.d/ /etc/nginx/conf.d/
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
