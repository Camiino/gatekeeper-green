FROM alpine

# Install dependencies
RUN apk add --no-cache \
    nginx \
    nodejs \
    npm

# Set working directory
WORKDIR /app

# Copy Vite project files
COPY . .

# Install & build Vite app
RUN npm install && npm run build

# Move build to nginx web root
RUN mkdir -p /var/www/html && \
    cp -r dist/* /var/www/html

# ✅ Skip removing default config (it's in http.d now)
# ❌ RUN rm /etc/nginx/conf.d/default.conf

# Add custom nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
