// The Play plugin
addSbtPlugin("com.typesafe.play" % "sbt-plugin" % "2.8.19")

addSbtPlugin("org.scalameta"                                      % "sbt-scalafmt" % "2.4.6")
ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-xml"    % VersionScheme.Always
