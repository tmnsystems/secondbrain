FROM node:20-alpine
WORKDIR /usr/src/app

# Install deps defined in package.json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

CMD ["node", "server.js"]