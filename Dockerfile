# Backend
FROM node:alpine
COPY package.json ./
COPY package-lock.json ./
COPY server ./server
RUN npm install
EXPOSE 3005
WORKDIR ./
CMD ["node", "./server/index.js"]
