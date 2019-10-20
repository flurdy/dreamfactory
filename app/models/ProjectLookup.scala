package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.{Configuration,Environment}
import scala.collection.JavaConversions._
import util.Random
// import scala.tools.nsc.io.Path
// import org.joda.time.DateTime
// import org.joda.time.format.DateTimeFormat
// import java.net.URL
import com.typesafe.config.ConfigFactory
import org.apache.commons.io.FilenameUtils

import ProjectCharacteristics._
import Licenses._

@ImplementedBy(classOf[ProjectRepostitory])
trait ProjectLookup {

   def configuration: Configuration
   def environment: Environment

   def fillWithOtherProjects(subsetOfProjects: List[Project], size: Int) = {
      val fillProjects =
         if(subsetOfProjects.size < size)
            randomiseProjects(projects.diff(subsetOfProjects)).take(size-subsetOfProjects.size)
         else Nil
      subsetOfProjects ::: fillProjects
   }

   def findPopularProjects(size: Int): List[Project] = {
      fillWithOtherProjects(
         randomiseProjects(
               projects.filter(
                  _.tags.exists(
                     t => t.name == "popular" ) ) )
            .take(size),
         size)
   }

   def findUpdatedProjects(size: Int) =
      fillWithOtherProjects(
         projects.filter(_.dates.updated.isDefined)
            .sortBy(_.dates.updated)
            .reverse
            .take(size),
         size)

   def findNewestProjects(size: Int)  =
      fillWithOtherProjects(
         projects.filter(_.dates.created.isDefined)
            .sortBy(_.dates.created)
            .reverse
            .take(size),
         size)

   lazy val howManyProjects = projects.size

   def findProject(projectName: String): Option[Project] =
         projects.filter(_.title.toLowerCase == projectName.toLowerCase).headOption

   def findRandomProjects(size: Int, excludeProjects: Set[Project] = Set())  = {
      val includedProjects = projects.toSet -- excludeProjects
      randomiseProjects(includedProjects.toList).take(size)
   }

   private def randomiseProjects(someProjects: List[Project])  = Random.shuffle(someProjects)

   private def loadConfigFile(path: String): Configuration = Configuration(ConfigFactory.load(path))

   private def findDynamicDreamsConfig: List[Configuration]  =
      environment
         .getExistingFile("conf/dreams.d")
         .toList
         .flatMap(_.listFiles)
         .filter(_.getName.endsWith(".conf"))
         .map( f =>  FilenameUtils.removeExtension(f.getName) )
         .map( f => s"dreams.d/${f}" )
         .map( loadConfigFile(_) )

   private def findProjectDreams: List[Configuration]  =
      findDynamicDreamsConfig.map{ d =>
          d.getConfigList("dreams.projects").toList.flatten
      }.flatten

   private lazy val projects = for{
         projectConfig <- findProjectDreams
         title         <- projectConfig.getString("title").toList
         description   =  projectConfig.getString("description")
      } yield {
         val urls: Urls          = projectConfig.getConfig("urls").fold( Urls() )( new Urls(_) )
         val dates: ProjectDates = projectConfig.getConfig("dates").fold( ProjectDates() )(new ProjectDates(_))
         val versions: Versions  = projectConfig.getConfig("versions").fold( Versions() )(new Versions(_))
         val tags: Set[Tag]      = projectConfig.getStringList("tags").fold[Set[Tag]]( Set.empty )( t => Tag.extract(t.toList) )
         val news: List[News]    = projectConfig.getConfigList("news").fold[List[News]]( List.empty )( l => News.extract(title, l.toList) )
         val characteristics     = projectConfig.getConfig("characteristics").fold( new ProjectCharacteristics() )(new ProjectCharacteristics(_))
         val license             = projectConfig.getString("license").flatMap( License( _, licenses))
         Project(title = title, description= description,
                  urls = urls, dates = dates , versions = versions, license = license,
                  tags = tags, news = news, characteristics = characteristics)
      }

   val findAllTheProjects: List[Project] = projects

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

   def findProjectsByCharacteristic(characteristic: Characteristic): List[Project] =
     projects.filter{ p => p.characteristics.hasCharacteristic(characteristic) }

   def findProjectsByTags(tags: List[Tag]): List[Project] = projects.filter{ p => tags.toSet.subsetOf(p.tags) }

   private lazy val allTheNews =
      ( for {
         project <- projects
         news    <- project.news
      } yield news
      ).sortBy( n => n.date.getMillis )
      .reverse

   def findNews(size: Int) = allTheNews.take(size)

}

@Singleton
class ProjectRepostitory @Inject() (val configuration: Configuration, val environment: Environment) extends ProjectLookup
