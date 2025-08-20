FROM node:20-alpine

# Install Docker CLI and bash for script execution
RUN apk add --no-cache docker-cli bash

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3200

CMD ["npm", "run", "dev"]
