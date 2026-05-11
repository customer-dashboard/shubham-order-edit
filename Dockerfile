FROM node:24-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 1. Copy dependency files
COPY package.json package-lock.json* ./

# 2. Install ALL dependencies (including devDependencies needed for build)
RUN npm install --include=dev --legacy-peer-deps

# 3. Copy the rest of the application code
COPY . .

# 4. Build the application
RUN npm run build

# 5. Prune development dependencies to keep the production image lean
RUN npm prune --omit=dev --legacy-peer-deps && npm cache clean --force

# 6. Start the application
CMD ["npm", "run", "docker-start"]
