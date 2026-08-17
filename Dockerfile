FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall дёргает nuxt prepare, а исходников на этом слое ещё нет; типы всё равно сгенерирует generate
RUN npm ci --ignore-scripts
COPY . .
RUN npm run generate

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public /usr/share/nginx/html
