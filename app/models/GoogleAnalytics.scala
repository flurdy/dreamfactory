package models

import play.api.Configuration
// import scala.collection.JavaConversions._
import scala.jdk.CollectionConverters

case class GoogleAnalytics(enabled: Boolean, trackingId: Option[String]) {

  def this(trackingId: String) = this(true, Some(trackingId))

}

object GoogleAnalytics {
  def apply(configuration: Option[Configuration]): Option[GoogleAnalytics] =
    for {
      conf       <- configuration
      enabled    <- conf.getOptional[Boolean]("enabled")
      trackingId <- conf.getOptional[String]("trackingId") if enabled
    } yield new GoogleAnalytics(trackingId)
}
