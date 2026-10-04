# Sirve la web con nginx y las cabeceras de seguridad de nginx.conf
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
EXPOSE 80
