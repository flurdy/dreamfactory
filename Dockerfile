FROM java:openjdk-8u72-jdk-alpine

MAINTAINER flurdy

ENV DEBIAN_FRONTEND noninteractive
ENV APPDIR /opt/app

RUN apk update && apk add bash

ENV APPLICATION dreamfactory
ENV VERSION 1.0-SNAPSHOT

WORKDIR /opt/app

RUN mkdir -p /etc/opt/app && \
  mkdir -p /opt/app && \
  mkdir -p $HOME/.sbt/0.13

COPY conf /etc/opt/app
COPY conf/repositories $HOME/.sbt/
COPY conf/local.sbt $HOME/.sbt/0.13/
ADD target/universal /opt/app/target/universal

ENTRYPOINT ["/opt/app/target/universal/stage/bin/dreamfactory"]

EXPOSE 9000
