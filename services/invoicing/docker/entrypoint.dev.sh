#!/bin/sh
set -e

cd /var/www/invoicing

if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist
fi

if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force 2>/dev/null || true
fi

mkdir -p \
  storage/app/sunat/xml \
  storage/app/sunat/cdr \
  storage/app/sunat/cache \
  storage/logs \
  bootstrap/cache

chmod -R 775 storage bootstrap/cache 2>/dev/null || true

exec php artisan serve --host=0.0.0.0 --port=8000
