package models

import play.api.Configuration
import scala.collection.JavaConversions._

case class GoogleAnalytics(enabled: Boolean, trackingId: Option[String]){

   def this(trackingId: String) = this(true, Some(trackingId))

}

object GoogleAnalytics {
   def apply(configuration: Option[Configuration]) : Option[GoogleAnalytics] =
      for{
         conf <- configuration
            if conf.getBoolean("enabled").contains(true)
         trackingId <- conf.getString("trackingId")
      } yield new GoogleAnalytics(trackingId)
}
