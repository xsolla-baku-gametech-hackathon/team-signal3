FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_SOCKET_URL=http://localhost:3000
ARG VITE_ROOM_ID=DEMO-123
ARG VITE_CONTROLLER_PUBLIC_URL=http://localhost:8082
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_ROOM_ID=$VITE_ROOM_ID
ENV VITE_CONTROLLER_PUBLIC_URL=$VITE_CONTROLLER_PUBLIC_URL

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV PORT=80
EXPOSE $PORT
