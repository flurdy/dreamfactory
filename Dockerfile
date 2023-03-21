FROM sbtscala/scala-sbt:openjdk-11.0.16_1.7.3_2.13.10

ADD . /opt/build/

WORKDIR /opt/build

RUN sbt clean compile test stage dist

RUN rm -f target/universal/stage/bin/*.bat && \
   mv target/universal/stage/bin/* target/universal/stage/bin/app

RUN rm -rf /opt/build && \
   rm -rf /root/.ivy2 && \
   rm -rf /root/.m2

WORKDIR /opt/app


FROM eclipse-temurin:11.0.18_10-jre-alpine

RUN apk update && apk add bash && rm -rf /var/cache/apk/*

RUN mkdir -p /etc/opt/app && \
   mkdir -p /opt/app && \
   mkdir -p $HOME/.sbt/1.0

WORKDIR /opt/app

COPY conf /etc/opt/app
ADD target/universal /opt/app/target/universal
RUN ln -s /opt/app/target/universal/stage/logs /var/log/app

ENTRYPOINT ["/opt/app/target/universal/stage/bin/app"]

EXPOSE 9000
