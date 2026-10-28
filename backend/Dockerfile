# ==========================================
# STAGE 2: PHP 8.4 FPM + Nginx Production
# ==========================================
FROM php:8.4-fpm-alpine

# Install system dependencies & extensions
RUN apk update && apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    postgresql-dev \
    oniguruma-dev \
    libxml2-dev \
    bash \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        pdo_pgsql \
        mbstring \
        zip \
        bcmath \
        intl \
        opcache \
        gd \
        dom \
        xml \
        xmlwriter \
        fileinfo

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy backend application code
COPY . /var/www/html/

# Install Composer dependencies
RUN composer install --no-dev --no-scripts --optimize-autoloader --no-interaction --prefer-dist --ignore-platform-reqs

# Copy Nginx & Supervisor configuration
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Secure file permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/public \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod +x /var/www/html/entrypoint.sh

# Expose port 80 for Render
EXPOSE 80

# Start services via production entrypoint
ENTRYPOINT ["/var/www/html/entrypoint.sh"]
