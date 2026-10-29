#!/bin/sh
set -e

echo "==> Preparing Laravel for production..."

# Clear any stale configuration
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Discover packages & register service providers
php artisan package:discover --ansi || true

# Create storage directory links if missing
php artisan storage:link || true

# Cache configuration, routes, and views for high performance
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Handle Database Configuration
if [ "$DB_CONNECTION" = "sqlite" ] || [ -z "$DB_HOST" -a -z "$DATABASE_URL" -a -z "$DB_URL" -a "$DB_CONNECTION" != "mysql" -a "$DB_CONNECTION" != "pgsql" ]; then
    echo "==> Ensuring SQLite database exists..."
    touch /var/www/html/database/database.sqlite
    chown www-data:www-data /var/www/html/database/database.sqlite
    chmod 664 /var/www/html/database/database.sqlite
    echo "==> Running SQLite database migrations..."
    php artisan migrate --force || echo "==> SQLite migration completed or pending, continuing..."
elif [ -n "$DB_HOST" ] || [ -n "$DATABASE_URL" ] || [ -n "$DB_URL" ] || [ "$DB_CONNECTION" = "pgsql" ] || [ "$DB_CONNECTION" = "mysql" ]; then
    echo "==> Running database migrations..."
    php artisan migrate --force || echo "==> Migration skipped or pending, continuing..."
fi

# Seed if requested
if [ "$RUN_SEEDER" = "true" ]; then
    echo "==> Running database seeders..."
    php artisan db:seed --force || true
fi

echo "==> Starting Nginx & PHP-FPM via Supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
