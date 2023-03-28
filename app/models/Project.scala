package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
// import scala.collection.JavaConversions._
import scala.jdk.CollectionConverters
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat

import Licenses._

case class Project(
    title: String,
    encoded: Option[String],
    description: Option[String] = None,
    urls: Urls = Urls(),
    dates: ProjectDates = ProjectDates(),
    versions: Versions = Versions(),
    news: List[News] = List.empty,
    comments: List[Comment] = List.empty,
    tags: Set[Tag] = Set.empty,
    tech: Set[Technology] = Set.empty,
    license: Option[License] = None,
    characteristics: ProjectCharacteristics = new ProjectCharacteristics()
) {
  val isLive                         = urls.hasLive && characteristics.isLive
  val isApp                          = tags.contains(Tag("mobile"))
  val isAnIdea                       = tags.contains(Tag("idea"))
  val isCommercial                   = tags.contains(Tag("commercial"))
  val isPopular                      = tags.contains(Tag("popular"))
  val isUnlikely                     = characteristics.isUnlikely
  val isUnappealing                  = characteristics.isUnappealing
  lazy val isDead                    =
    characteristics.isNotReleasedOrMothballed &&
      characteristics.isNotStartedOrAbandoned &&
      !isAnIdea &&
      !isRecentlyUpdated &&
      !isRecentlyAdded
  lazy val isNewsStale               = !news.map(_.isStale).exists(_ == false)
  lazy val isStale                   =
    dates.isStaleOrUndated &&
      isNewsStale &&
      characteristics.isNotReleasedOrMothballed &&
      characteristics.isNotStartedOrAbandoned
  lazy val isNewsRecent              = !news.filter(_.isRecent).isEmpty
  lazy val isRecentlyUpdated         = dates.isRecentlyUpdated || isNewsRecent
  lazy val isRecentlyAdded           = dates.isRecentlyCreated
  val link                           = encoded.getOrElse(title)
  def isProject(projectName: String) = encoded
    .map(_.toLowerCase)
    .contains(projectName.toLowerCase) || title.toLowerCase == projectName.toLowerCase
}
