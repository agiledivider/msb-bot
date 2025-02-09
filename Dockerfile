FROM alpine:3.21

#RUN apk add --update python3 py3-pip make

RUN apk add --update nodejs npm

RUN addgroup -S node && adduser -S node -G node

USER node

RUN mkdir /home/node/code

WORKDIR /home/node/code

COPY --chown=node:node package-lock.json package.json ./

RUN npm i

COPY --chown=node:node ./src ./src

CMD ["node", "src/index.js"]