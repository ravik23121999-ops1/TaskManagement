#!/bin/sh
set -e

echo "==> Preparing Laravel for production..."

# Create storage directory links if missing
php artisan storage:link || true

# Cache configuration, routes, and views for high performance
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Run database migrations
if [ -n "$DB_HOST" ] || [ -n "$DATABASE_URL" ]; then
    echo "==> Running database migrations..."
    php artisan migrate --force || echo "Migration encountered an issue, proceeding..."
fi

# Seed if requested
if [ "$RUN_SEEDER" = "true" ]; then
    echo "==> Running database seeders..."
    php artisan db:seed --force || true
fi

echo "==> Starting Nginx & PHP-FPM via Supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
