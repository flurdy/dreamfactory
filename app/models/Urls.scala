package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
// import scala.collection.JavaConversions._
// import util.Random
// import org.joda.time.DateTime
// import org.joda.time.format.DateTimeFormat
import java.net.URL

case class Url(title: Option[String], value: URL) {
  def this(value: String) = this(None, new URL(value))
  def this(title: String, value: String) = this(Some(title), new URL(value))
  def naked = value.getHost() + Option(value.getPath()).getOrElse("") + Option(value.getQuery()).getOrElse("")
  def curt(maxLength: Int) = if (naked.length > maxLength) ".." + naked.takeRight(maxLength) else naked
}

case class Urls(values: Map[String, Url] = Map.empty) {
  def this(configuration: Configuration) =
    this((for {
      key           <- configuration.keys
      value: String <- configuration.getOptional[String](key).toSet
    } yield (key, new Url(key, value))).toMap)
  def project          = get("project")
  def live             = get("live")
  def get(key: String) = values.get(key)
  val others           = values.filter { case (key, _) => !Set("project", "live").contains(key) }
  val liveOrProject    = get("live").orElse(get("project"))
  val isEmpty          = liveOrProject.isEmpty
  val hasLive          = live.isDefined
  val hasProject       = project.isDefined
}
