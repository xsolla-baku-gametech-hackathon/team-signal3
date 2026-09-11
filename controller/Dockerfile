FROM node:22-alpine AS build
WORKDIR /app

ARG SOCKET_URL=http://localhost:3000
ARG CONTROLLER_PUBLIC_URL=http://localhost:8082
ARG DEFAULT_ROOM_ID=DEMO-123

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .

RUN sed -i \
  -e "s#socketUrl: '.*'#socketUrl: '${SOCKET_URL}'#" \
  -e "s#controllerPublicUrl: '.*'#controllerPublicUrl: '${CONTROLLER_PUBLIC_URL}'#" \
  -e "s#defaultRoomId: '.*'#defaultRoomId: '${DEFAULT_ROOM_ID}'#" \
  src/environments/environment.ts

RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist/controller /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV PORT=80
EXPOSE $PORT
