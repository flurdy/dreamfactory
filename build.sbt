name := """dreamfactory"""

version := "1.5.0-SNAPSHOT"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

resolvers += ("Local Maven Repository" at s"file:///${Path.userHome.absolutePath}/.m2/repository")

scalaVersion                   := "2.13.10"
addCompilerPlugin("com.olegpy" %% "better-monadic-for" % "0.3.1")

libraryDependencies ++= Seq(
  guice,
  //   jdbc,
//   cache,
//   ws,
  "org.webjars" %% "webjars-play" % "2.8.18",
  "org.webjars"  % "bootstrap"    % "3.3.6",
  "org.webjars"  % "jquery"       % "2.2.3",
  "commons-io"   % "commons-io"   % "2.5"
)
