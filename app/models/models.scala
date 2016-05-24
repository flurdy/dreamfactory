package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
import scala.collection.JavaConversions._
import util.Random
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat

case class Urls(project: Option[String] = None, live: Option[String] = None){
   def this(configuration: Configuration) = {
      this( project = configuration.getString("project"),
            live    = configuration.getString("live") )
   }
   val isEmpty = project.orElse(live).isEmpty
}

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

case class News(date: DateTime, description: String) {
   lazy val dateFormatted = News.startTimeFormatter.print(date)
}

trait NewsExtractor {
   lazy val startTimeFormatter = DateTimeFormat.forPattern("yyyy-MMM-dd")
   def extract(configuration: List[Configuration]): List[News] = {
      ( for {
               config      <- configuration
               newsDate    <- config.getString("date")
               date        =  new DateTime(newsDate)
               description <- config.getString("description")
            } yield News(date,description) )
         .sortBy(_.date.getMillis())
         .reverse
   }
}

object News extends NewsExtractor

case class Project(title: String,
                   description: Option[String] = None,
                   urls: Urls = Urls(),
                   dates: ProjectDates = ProjectDates(),
                   versions: Versions = Versions(),
                   news: List[News] = List.empty,
                   tags: Set[Tag] = Set.empty )

@ImplementedBy(classOf[ProjectRepostitory])
trait ProjectLookup {

   def configuration: Configuration

   def findPopularProjects(size: Int) =
      randomiseProjects(
         projects.filter(
            _.tags.exists(
               t => t.name == "popular" ) ) )
         .take(size)

   def findUpdatedProjects(size: Int) =
      projects.filter(_.dates.updated.isDefined)
         .sortBy(_.dates.updated)
         .reverse
         .take(size)

   def findNewestProjects(size: Int)  =
      projects.filter(_.dates.created.isDefined)
         .sortBy(_.dates.created)
         .reverse
         .take(size)

   lazy val howManyProjects = projects.size

   def findProject(projectName: String): Option[Project] =
         projects.filter(_.title == projectName).headOption

   def findRandomProjects(size: Int)  = randomiseProjects(projects).take(size)

   private def randomiseProjects(someProjects: List[Project])  = Random.shuffle(someProjects)

   private lazy val projects = for{
         projectsFound <- configuration.getConfigList("dream.projects").toList
         projectConfig <- projectsFound
         title         <- projectConfig.getString("title").toList
         description   =  projectConfig.getString("description")
      } yield {
         val urls: Urls          = projectConfig.getConfig("urls").fold( Urls() )( new Urls(_) )
         val dates: ProjectDates = projectConfig.getConfig("dates").fold( ProjectDates() )(new ProjectDates(_))
         val versions: Versions  = projectConfig.getConfig("versions").fold( Versions() )(new Versions(_))
         val tags: Set[Tag]      = projectConfig.getStringList("tags").fold[Set[Tag]]( Set.empty )( t => Tag.extract(t.toList) )
         val news: List[News]    = projectConfig.getConfigList("news").fold[List[News]]( List.empty )( l => News.extract(l.toList) )
         Project(title = title, description= description,
                  urls = urls, dates = dates , versions = versions,
                  tags = tags, news = news)
      }

   def findProjectsBySearch(searchTerm: String): List[Project] =
      projects.filter{ p =>
         p.title.toLowerCase.contains( searchTerm) || p.description.exists(_.toLowerCase.contains(searchTerm)) }

   def findTags(size: Int): List[Tag] = findTagsInProjects(projects,size)

   def findTagsInProjects(tagProjects: List[Project], size: Int): List[Tag] = {
      ( for {
         project <- tagProjects
         tag     <- project.tags
      } yield tag
      ).groupBy(_.name)
      .mapValues(_.size)
      .toList
      .sortBy{ case (_, tagCount) => tagCount }
      .takeRight(size)
      .reverse
      .map{ case (name,_) => Tag(name) }
   }

   def findProjectsByTag(tag: Tag): List[Project] = projects.filter{ p => p.tags.exists(_.name == tag.name) }

   def findProjectsByTags(tags: List[Tag]): List[Project] = projects.filter{ p => tags.toSet.subsetOf(p.tags) }

}

@Singleton
class ProjectRepostitory @Inject() (val configuration: Configuration) extends ProjectLookup
