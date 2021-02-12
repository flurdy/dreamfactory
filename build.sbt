name := """dreamfactory"""

version := "1.4.7-SNAPSHOT"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.12"

libraryDependencies ++= Seq(
  jdbc,
  cache,
  ws,
  "org.scalatestplus.play" %% "scalatestplus-play" % "1.5.1" % Test,
  "org.webjars" %% "webjars-play" % "2.5.0",
  "org.webjars" %  "bootstrap"    % "3.3.6",
  "org.webjars" %  "jquery"       % "2.2.3",
  "commons-io"  %  "commons-io"   % "2.5"
)

// resolvers += "scalaz-bintray" at "http://dl.bintray.com/scalaz/releases"
