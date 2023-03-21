FROM sbtscala/scala-sbt:openjdk-11.0.16_1.7.3_2.13.10

RUN sbt compile
RUN sbt test
RUN sbt stage
RUN sbt dist
RUN rm -f target/universal/stage/bin/*.bat && \
   mv target/universal/stage/bin/* target/universal/stage/bin/app


FROM eclipse-temurin:11.0.18_10-jre-alpine

RUN apk update && apk add bash && rm -rf /var/cache/apk/*

RUN mkdir -p /etc/opt/app && \
   mkdir -p /opt/app && \
   mkdir -p $HOME/.sbt/1.0

WORKDIR /opt/app

COPY conf /etc/opt/app
ADD target/universal /opt/app/target/universal
RUN ln -s /opt/app/stage/logs /var/log/app

ENTRYPOINT ["/opt/app/target/universal/stage/bin/app"]

EXPOSE 9000
