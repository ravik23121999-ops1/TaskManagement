# ==========================================
# STAGE 1: Build Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: PHP 8.3 FPM + Nginx Production
# ==========================================
FROM php:8.3-fpm-alpine

# Install system dependencies
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
        gd

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy backend application code
COPY backend/ /var/www/html/

# Copy compiled frontend assets from Stage 1 directly into Laravel public directory
COPY --from=frontend-builder /app/frontend/dist/ /var/www/html/public/

# Install Composer dependencies (production optimized)
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# Copy Nginx & Supervisor configuration
COPY backend/nginx.conf /etc/nginx/http.d/default.conf
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Secure file permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/public \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod +x /var/www/html/entrypoint.sh

# Expose port 80 for Render Web Service
EXPOSE 80

# Start services via production entrypoint
ENTRYPOINT ["/var/www/html/entrypoint.sh"]
