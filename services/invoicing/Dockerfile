# =============================================================================
# Dockerfile — nm/invoicing-service (Laravel 12 + Greenter + DomPDF)
# =============================================================================
# Extensiones PHP requeridas por Greenter:
#   soap    → comunicación SOAP con SUNAT
#   xml     → construcción del XML UBL 2.1
#   dom     → manipulación del DOM XML
#   curl    → consultas a apis.net.pe (DNI/RUC)
#   zip     → empaquetado del CDR (.zip)
#   mbstring→ codificación de cadenas (UTF-8)
#
# Extensiones extra requeridas por Laravel / DomPDF:
#   pdo_pgsql → conexión a PostgreSQL
#   gd        → generación de imágenes (QR / PDF)
#   intl      → locale y formateo numérico
#   opcache   → rendimiento en producción
# =============================================================================

FROM php:8.3-fpm-alpine AS base

LABEL maintainer="Novedades Maritex <dev@nm.pe>"
LABEL service="invoicing-service"

# ── Dependencias del sistema ────────────────────────────────────────────────
RUN apk add --no-cache \
        bash \
        curl \
        curl-dev \
        git \
        unzip \
        zip \
        libzip-dev \
        libxml2-dev \
        libpq-dev \
        icu-dev \
        freetype-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        oniguruma-dev \
        # soap requiere libxml2 y openssl
        openssl-dev

# ── Extensiones PHP obligatorias para Greenter ──────────────────────────────
RUN docker-php-ext-install \
        soap \
        xml \
        dom \
        curl \
        zip \
        mbstring \
    # Extensiones extra para Laravel / DomPDF / PostgreSQL
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        intl \
        opcache \
    # GD con soporte JPEG/PNG para renderizado PDF (DomPDF)
    && docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd

# ── Composer ────────────────────────────────────────────────────────────────
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# ── Código fuente ────────────────────────────────────────────────────────────
WORKDIR /var/www/invoicing

COPY composer.json composer.lock* ./

# Instalar dependencias PHP (sin devtools en prod, con autoloader optimizado)
RUN composer install \
        --no-dev \
        --no-interaction \
        --no-scripts \
        --prefer-dist \
        --optimize-autoloader

COPY . .

# ── Permisos de Laravel ──────────────────────────────────────────────────────
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && mkdir -p storage/app/sunat/xml \
               storage/app/sunat/cdr \
               storage/app/sunat/cache \
               storage/logs \
               bootstrap/cache

# ── Optimización de configuración para producción ───────────────────────────
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

# ── Nginx como proxy inverso ─────────────────────────────────────────────────
RUN apk add --no-cache nginx supervisor

COPY docker/nginx.conf      /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8000

# Producción: nginx + php-fpm via supervisord.
# Desarrollo local: usar Dockerfile.dev (php artisan serve + hot-reload).
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
