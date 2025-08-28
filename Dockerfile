# Dockerfile for NestJS Storage Service
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# --- Production image ---
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Tạo thư mục uploads (mount volume ngoài sẽ ghi đè lên)
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3005
ENV UPLOAD_PATH=/app/uploads

EXPOSE 3005

CMD ["node", "dist/main.js"]
