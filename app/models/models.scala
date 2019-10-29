package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
import scala.collection.JavaConversions._
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat


trait DateComparator {
   def isDateStale(date: DateTime) = DateTime.now.minusYears(5).isAfter(date)
   def isDateRecent(date: DateTime) = DateTime.now.minusYears(2).isBefore(date)
   def toDate(date: String) = new DateTime(date)
}

case class Versions(dev: Option[String] = None, live: Option[String] = None){
   def this(configuration: Configuration) = {
      this( dev  = configuration.getString("dev"),
            live = configuration.getString("live") )
   }
   val isEmpty = dev.orElse(live).isEmpty
}

case class ProjectDates(created: Option[String] = None, updated: Option[String] = None) extends DateComparator {
   def this(configuration: Configuration) = {
      this( created = configuration.getString("created"),
            updated = configuration.getString("updated") )
   }
   private val dates = (created.toList ::: updated.toList).map(toDate)
   val isEmpty = created.orElse(updated).isEmpty
   val isStale = !dates.filter(isDateStale).isEmpty
   val isStaleOrUndated = isStale || isEmpty
   val isRecentlyUpdated = !dates.filter(isDateRecent).isEmpty
   val isRecentlyCreated = !created.map(toDate).filter(isDateRecent).isEmpty
}

case class Tag(name: String)

trait TagExtractor {
   def extract(configuration: List[String]) = configuration.map(Tag(_)).toSet
}

object Tag extends TagExtractor

case class News(date: DateTime, project: String, description: String) extends DateComparator {
   lazy val dateFormatted = News.startTimeFormatter.print(date)
   def isStale = isDateStale(date)
   val isRecent = isDateRecent(date)
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
      def apply(name: String, values: Set[A]): Option[A] =
         values.filter(_.names.exists(_.toLowerCase == name.toLowerCase)).headOption
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
                   characteristics: ProjectCharacteristics = new ProjectCharacteristics()) {
   val isLive = urls.hasLive && characteristics.isLive
   val isApp = tags.contains(Tag("mobile"))
   val isAnIdea = tags.contains(Tag("idea"))
   val isCommercial = tags.contains(Tag("commercial"))
   val isPopular = tags.contains(Tag("popular"))
   val isUnlikely = characteristics.isUnlikely
   val isUnappealing = characteristics.isUnappealing
   lazy val isDead = characteristics.isNotReleasedOrMothballed && characteristics.isNotStartedOrAbandoned && !isAnIdea
   lazy val isNewsStale = !news.map(_.isStale).exists(_ == false)
   lazy val isStale = dates.isStaleOrUndated && isNewsStale && characteristics.isNotReleasedOrMothballed && characteristics.isNotStartedOrAbandoned
   lazy val isNewsRecent = !news.filter(_.isRecent).isEmpty
   lazy val isRecentlyUpdated = dates.isRecentlyUpdated || isNewsRecent
   lazy val isRecentlyAdded = dates.isRecentlyCreated
}
