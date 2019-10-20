package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
import scala.collection.JavaConversions._
// import util.Random
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
// import java.net.URL


case class Versions(dev: Option[String] = None, live: Option[String] = None){
   def this(configuration: Configuration) = {
      this( dev  = configuration.getString("dev"),
            live = configuration.getString("live") )
   }
   val isEmpty = dev.orElse(live).isEmpty
}

case class ProjectDates(created: Option[String] = None, updated: Option[String] = None){
   def this(configuration: Configuration) = {
      this( created = configuration.getString("created"),
            updated = configuration.getString("updated") )
   }
   val isEmpty = created.orElse(updated).isEmpty
}

case class Tag(name: String)

trait TagExtractor {
   def extract(configuration: List[String]) = configuration.map(Tag(_)).toSet
}

object Tag extends TagExtractor

case class News(date: DateTime, project: String, description: String) {
   lazy val dateFormatted = News.startTimeFormatter.print(date)
}

trait NewsExtractor {
   lazy val startTimeFormatter = DateTimeFormat.forPattern("yyyy-MMM-dd")
   def extract(project: String, configuration: List[Configuration]): List[News] = {
      ( for {
               config      <- configuration
               newsDate    <- config.getString("date")
               date        =  new DateTime(newsDate)
               description <- config.getString("description")
            } yield News(date, project, description) )
         .sortBy(_.date.getMillis())
         .reverse
   }
}

object News extends NewsExtractor

object EnumModel {

   trait EnumName {
      def name: String
      def names: Set[String] = Set(name)
      override def toString = name
   }

   trait EnumParse[A <: EnumName] {
      def apply(name: String, values: Set[A]): Option[A] = {
         val v = values.filter(_.names.exists(_.toLowerCase == name.toLowerCase)).headOption
        //  if(v.isEmpty) println(s"========== $name $v $values")
         v
      }
   }

}

import Licenses._

case class Project(title: String,
                   description: Option[String] = None,
                   urls: Urls = Urls(),
                   dates: ProjectDates = ProjectDates(),
                   versions: Versions = Versions(),
                   news: List[News] = List.empty,
                   tags: Set[Tag] = Set.empty,
                   license: Option[License] = None,
                   characteristics: ProjectCharacteristics = new ProjectCharacteristics()){
   val isLive = urls.hasLive && characteristics.isLive
   val isApp = tags.contains(Tag("mobile"))
   val isAnIdea = tags.contains(Tag("idea"))
   val isOpenSource = license.exists(_.isOpenSource)
   val isDead = (characteristics.isMothballed || characteristics.isNotReleased) && (characteristics.isAbandoned || characteristics.isNotStarted)
   val isCommercial = tags.contains(Tag("commercial"))
}
