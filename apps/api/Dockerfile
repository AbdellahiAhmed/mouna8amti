# syntax=docker/dockerfile:1

# FrankenPHP serves Laravel's public/ directly — no separate Nginx/FPM pair to run.
FROM dunglas/frankenphp:1-php8.4-alpine AS base
RUN install-php-extensions pdo_pgsql redis intl zip bcmath pcntl opcache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
ENV SERVER_NAME=:8000
EXPOSE 8000

# Development: source is bind-mounted, dependencies installed by the entrypoint.
FROM base AS dev
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
ENTRYPOINT ["entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]

# Production: immutable image with optimised autoloader and no dev dependencies.
FROM base AS prod
ENV APP_ENV=production APP_DEBUG=false
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
 && chown -R www-data:www-data storage bootstrap/cache
USER www-data
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
