FROM alpine

# Install dependencies
RUN apk add --no-cache \
    nginx \
    nodejs \
    npm

# Set working directory
WORKDIR /app

# Accept and expose API base URL for Vite build
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

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
