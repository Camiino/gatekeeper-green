FROM mariadb:11

# Copy all init scripts (sql / sh) into the image
COPY init/ /docker-entrypoint-initdb.d/

# Make sure it's readable inside container
RUN chmod 755 /docker-entrypoint-initdb.d/init.sql
