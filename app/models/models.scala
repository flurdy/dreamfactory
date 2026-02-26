package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
// import scala.collection.JavaConversions._
import scala.jdk.CollectionConverters
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat

trait DateComparator {
  def isDateStale(date: DateTime)  = DateTime.now.minusYears(8).isAfter(date)
  def isDateRecent(date: DateTime) = DateTime.now.minusYears(3).isBefore(date)
  def toDate(date: String)         = new DateTime(date)
}

case class Versions(dev: Option[String] = None, live: Option[String] = None) {
  def this(configuration: Configuration) = {
    this(dev = configuration.getOptional[String]("dev"), live = configuration.getOptional[String]("live"))
  }
  val isEmpty = dev.orElse(live).isEmpty
}

case class ProjectDates(created: Option[String] = None, updated: Option[String] = None)
    extends DateComparator {
  def this(configuration: Configuration) = {
    this(
      created = configuration.getOptional[String]("created"),
      updated = configuration.getOptional[String]("updated")
    )
  }
  private val dates     = (created.toList ::: updated.toList).map(toDate)
  val isEmpty           = created.orElse(updated).isEmpty
  val hasDate           = !isEmpty
  lazy val newestDate   = dates.sortBy(_.getMillis).reverse.headOption
  val isStale           = !dates.filter(isDateStale).isEmpty
  val isStaleOrUndated  = isStale || isEmpty
  val isRecentlyUpdated = !dates.filter(isDateRecent).isEmpty
  val isRecentlyCreated = !created.map(toDate).filter(isDateRecent).isEmpty
}

case class Tag(name: String)

trait TagExtractor {
  def extract(configuration: List[String]) = configuration.map(_.toLowerCase).map(Tag(_)).toSet
}

object Tag extends TagExtractor

case class Technology(name: String)

trait TechnologyExtractor {
  def extract(configuration: List[String]) = configuration.map(_.toLowerCase).map(Technology(_)).toSet
}

object Technology extends TechnologyExtractor

case class News(date: DateTime, project: String, description: String) extends DateComparator {
  lazy val dateFormatted = News.startTimeFormatter.print(date)
  def isStale            = isDateStale(date)
  val isRecent           = isDateRecent(date)
}

trait NewsExtractor {
  lazy val startTimeFormatter = DateTimeFormat.forPattern("yyyy-MMM-dd")
  def extract(project: String, configuration: List[Configuration]): List[News] = {
    (for {
      config   <- configuration
      newsDate <- config.getOptional[String]("date")
      date = new DateTime(newsDate)
      description <- config.getOptional[String]("description")
    } yield News(date, project, description))
      .sortBy(_.date.getMillis())
      .reverse
  }
}

object News extends NewsExtractor

case class Comment(date: DateTime, comment: String) extends DateComparator {
  lazy val dateFormatted = News.startTimeFormatter.print(date)
  def isStale            = isDateStale(date)
  val isRecent           = isDateRecent(date)
}

trait CommentExtractor {
  lazy val startTimeFormatter = DateTimeFormat.forPattern("yyyy-MMM-dd")
  def extract(project: String, configuration: List[Configuration]): List[Comment] = {
    (for {
      config      <- configuration
      commentDate <- config.getOptional[String]("date")
      date = new DateTime(commentDate)
      comment <- config.getOptional[String]("comment")
    } yield Comment(date, comment))
      .sortBy(_.date.getMillis())
      .reverse
  }
}

object Comment extends CommentExtractor

object EnumModel {

  trait EnumName {
    def name: String
    def names: Set[String] = Set(name)
    override def toString  = name
  }

  trait EnumParse[A <: EnumName] {
    def apply(name: String, values: Set[A]): Option[A] =
      values.filter(_.names.exists(_.toLowerCase == name.toLowerCase)).headOption
  }

}
