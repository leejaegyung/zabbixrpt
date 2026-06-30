# syntax=docker/dockerfile:1
# ── Stage 1: Composer 의존성 (폐쇄망 대비 vendor 동봉) ───────────────
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-interaction

# ── Stage 2: php-fpm 런타임 ─────────────────────────────────────────
FROM php:8.2-fpm-alpine

# Laravel 필수 확장 (mbstring, bcmath). HTTP는 stream wrapper로 충분.
RUN apk add --no-cache oniguruma-dev \
    && docker-php-ext-install bcmath mbstring opcache

WORKDIR /var/www/html
COPY --from=vendor /app /var/www/html

# storage / bootstrap cache 쓰기 권한
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# 런타임에 config/route 캐시 생성 후 php-fpm 기동
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
