FROM flurdy/play-framework:2.5.12-alpine

MAINTAINER Ivar Abrahamsen <@flurdy>

RUN mkdir -p /etc/app && \
  mkdir -p $HOME/.sbt/0.13

COPY conf /etc/app
COPY conf/repositories $HOME/.sbt/
COPY conf/local.sbt $HOME/.sbt/0.13/
ADD . /opt/build/

WORKDIR /opt/build

RUN /opt/activator/bin/activator clean stage && \
    rm -f target/universal/stage/bin/*.bat && \
    mv target/universal/stage/bin/* target/universal/stage/bin/app && \
    mv target/universal /opt/app && \
    ln -s /opt/app/stage/logs /var/log/app && \
    rm -rf /opt/build && \
    rm -rf /root/.ivy2

WORKDIR /opt/app

ENTRYPOINT ["/opt/app/stage/bin/app"]

EXPOSE 9000
