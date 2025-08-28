FROM node:20-alpine
WORKDIR /app

# install deps first for better caching
COPY package*.json ./
RUN npm ci --omit=dev

# copy source
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]
