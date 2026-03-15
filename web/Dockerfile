# Stage 1 - Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci

# Stage 2 - Build static site
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
COPY platform-programs.yml independent-programs.yml ../
RUN npm run build

# Stage 3 - Serve with nginx
FROM nginx:alpine AS runtime
COPY web/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
