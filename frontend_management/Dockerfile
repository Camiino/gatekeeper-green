FROM alpine:latest

# Install required packages
RUN apk add --no-cache \
    nginx \
    php83 \
    php83-fpm \
    php83-mysqli \
    php83-pdo \
    php83-pdo_mysql \
    php83-session \
    php83-opcache \
    php83-curl \
    php83-mbstring \
    php83-json \
    php83-xml \
    php83-fileinfo \
    php83-zlib \
    supervisor \
    unzip \
    wget

# Set working directory
WORKDIR /var/www/localhost/htdocs

# Remove default nginx content
RUN rm -rf /var/www/localhost/htdocs/*

# Copy your app into the container
COPY . /var/www/localhost/htdocs/

# Download PHPMailer into vendor directory (AFTER app copy)
RUN mkdir -p vendor/phpmailer && \
    wget -O /tmp/phpmailer.zip https://github.com/PHPMailer/PHPMailer/archive/master.zip && \
    unzip /tmp/phpmailer.zip -d /tmp && \
    cp -r /tmp/PHPMailer-master/src /var/www/localhost/htdocs/vendor/phpmailer && \
    rm -rf /tmp/phpmailer.zip /tmp/PHPMailer-master

# Copy Nginx and Supervisor configs
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

# Expose web port
EXPOSE 80

# Start Supervisor (PHP + Nginx)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
