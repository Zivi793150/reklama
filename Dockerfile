FROM node:18-alpine
WORKDIR /app

# Install only prod deps for server
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server and client
COPY server/ ./
COPY client/ ../client/

ENV PORT=4000
ENV CLIENT_DIR=../client
ENV DB_PATH=/data/data.sqlite

EXPOSE 4000

CMD ["npm", "start"]


