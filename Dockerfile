FROM alpine:3.21

#RUN apk add --update python3 py3-pip make

RUN apk add --update nodejs npm tzdata
RUN ln -s /usr/share/zoneinfo/Europe/Brussels /etc/localtime

# Install required packages for locale support
RUN apk add --no-cache \
    icu-data-full \
    icu-libs

# Set the timezone
ENV TZ=UTC

# Set up locale environment variables
ENV LANG=de_DE.UTF-8 \
    LANGUAGE=de_DE:de \
    LC_ALL=de_DE.UTF-8

# Optional: Install additional locale packages if needed
RUN apk add --no-cache \
    musl-locales \
    musl-locales-lang


RUN addgroup -S node && adduser -S node -G node

USER node

RUN mkdir /home/node/code

WORKDIR /home/node/code

COPY --chown=node:node package-lock.json package.json ./

RUN npm i

COPY --chown=node:node ./src ./src

CMD ["node", "src/index.js"]