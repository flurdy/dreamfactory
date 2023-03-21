FROM sbtscala/scala-sbt:openjdk-11.0.16_1.7.3_2.13.10 AS builder

ADD . /opt/build/

WORKDIR /opt/build

RUN sbt clean compile test stage dist

RUN rm -f target/universal/stage/bin/*.bat && \
   mv target/universal/stage/bin/* target/universal/stage/bin/app


FROM eclipse-temurin:11.0.18_10-jre-alpine

RUN apk update && apk add bash && rm -rf /var/cache/apk/*

RUN mkdir -p /etc/opt/app && \
   mkdir -p /opt/app && \
   mkdir -p $HOME/.sbt/1.0

WORKDIR /opt/app

COPY conf /etc/opt/app

COPY --from=builder /opt/build/target/universal/stage /opt/app

RUN ln -s /opt/app/logs /var/log/app

ENTRYPOINT ["/opt/app/bin/app"]

EXPOSE 9000
