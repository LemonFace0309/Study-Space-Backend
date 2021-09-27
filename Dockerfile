FROM node:14

WORKDIR /app

COPY ./package.json .

RUN npm install

COPY . .

EXPOSE 8080

# ENV PORT=8080
# ENV REDIS_PORT=6379
# ENV REDIS_URL=localhost

CMD ["npm", "run", "dev"]

