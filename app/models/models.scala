package models
import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
import scala.collection.JavaConversions._
import util.Random

case class Urls(project: Option[String] = None, live: Option[String] = None){
   def this(configuration: Configuration) = {
      this( project = configuration.getString("project"),
            live    = configuration.getString("project") )
   }
}

case class ProjectDates(created: Option[String] = None, updated: Option[String] = None){
   def this(configuration: Configuration) = {
      this( created = configuration.getString("created"),
            updated = configuration.getString("updated") )
   }
}

case class Tag(name: String)

case class Project(title: String,
                   urls: Option[Urls] = None,
                   dates: Option[ProjectDates] = None,
                   tags: Set[Tag] = Set.empty)

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
      projects.filter(_.dates.map(_.updated).isDefined)
         .sortBy(_.dates.map(_.updated))
         .reverse
         .take(size)
   def findNewestProjects(size: Int)  =
      projects.filter(_.dates.map(_.created).isDefined)
         .sortBy(_.dates.map(_.created))
         .reverse
         .take(size)

   lazy val howManyProjects = projects.size

   def findProject(projectName: String): Option[Project] =
         projects.filter(_.title == projectName).headOption

   def findRandomProjects(size: Int)  = randomiseProjects(projects).take(size)
   private def randomiseProjects(someProjects: List[Project])  = Random.shuffle(someProjects)

   private lazy val projects = for{
         projectsFound  <- configuration.getConfigList("dream.projects").toList
         projectConfig  <- projectsFound
         title: String  <- projectConfig.getString("title").toList
      } yield {
         val urls: Option[Urls]         = projectConfig.getConfig("urls").map(new Urls(_))
         val dates:Option[ProjectDates] = projectConfig.getConfig("dates").map(new ProjectDates(_))
         val tags: Set[Tag]         = ( for {
            configTags <- projectConfig.getStringList("tags").toList
            tagName    <- configTags
         } yield Tag(tagName) ).toSet
            // projectConfig.getStringList("tags").fold(List.empty)(t => t.toList.map(tt => Tag(tt)))
         Project(title = title, urls = urls, dates = dates , tags = tags)
      }
}

@Singleton
class ProjectRepostitory @Inject() (val configuration: Configuration) extends ProjectLookup
