FROM node:16-alpine
WORKDIR /home/picture-bed
COPY . .
RUN npm config set registry https://registry.npm.taobao.org \
    && npm i 

CMD ["npm","run","dev"]

EXPOSE 8080
