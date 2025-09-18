# Stage 1: Build React app
FROM node:18-alpine as build
WORKDIR /app

# Copy dependencies and install
COPY package*.json ./
RUN npm install

# Copy source code and build React
COPY . .
RUN npm run build

# Tambahkan file _redirects agar SPA tidak 404 saat refresh
RUN echo "/* /index.html 200" > /app/build/_redirects

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Hapus config default bawaan
RUN rm /etc/nginx/conf.d/default.conf

# Copy hasil build React ke Nginx html
COPY --from=build /app/build /usr/share/nginx/html

# Copy config custom ke dalam container
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
