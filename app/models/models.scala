package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
import scala.collection.JavaConversions._
import util.Random
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import java.net.URL

case class Url(title: Option[String], value: URL) {
   def this(value: String) = this(None, new URL(value))
   def this(title: String, value: String) = this(Some(title), new URL(value))
   def naked = value.getHost() + Option(value.getPath()).getOrElse("") + Option(value.getQuery()).getOrElse("")
   def curt(maxLength: Int)  = if(naked.length > maxLength) ".." + naked.takeRight(maxLength) else naked
}

case class Urls(values: Map[String,Url] = Map.empty){
   def this(configuration: Configuration) =
      this(
         ( for{
               key <- configuration.keys
               value: String <- configuration.getString(key).toSet
             } yield (key,new Url(key, value))
         ).toMap )
   def project = get("project")
   def live = get("live")
   def get(key: String) = values.get(key)
   val others = values.filter{ case (key,_) => !Set("project","live").contains(key) }
   val liveOrProject = get("live").orElse(get("project"))
   val isEmpty = liveOrProject.isEmpty
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

object ProjectCharacteristics {

   trait Characteristic extends EnumName {
      def alternatives: Set[String]
      def parentName: String
      override val names: Set[String] = alternatives + name
   }

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

   sealed abstract class Appeal(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "appeal") extends Characteristic
   object Appeal extends EnumParse[Appeal]
   case object Keen             extends Appeal("keen")
   case object Interested       extends Appeal("interested", Set("good"))
   case object MaybeAppeal      extends Appeal("maybe")
   case object LowAppeal        extends Appeal("low")
   val appeals: Set[Appeal] = Set(Keen, Interested, MaybeAppeal, LowAppeal)

   sealed abstract class Complexity(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "complexity") extends Characteristic
   object Complexity extends EnumParse[Complexity]
   case object VeryComplex      extends Complexity("verydifficult", Set("veryhigh"))
   case object Difficult        extends Complexity("difficult", Set("high","hard"))
   case object MediumComplex    extends Complexity("medium", Set("average"))
   case object Easy             extends Complexity("easy", Set("low"))
   val complexities: Set[Complexity] = Set(VeryComplex, Difficult, MediumComplex, Easy)

   sealed abstract class Likelihood(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "likelihood") extends Characteristic
   object Likelihood extends EnumParse[Likelihood]
   case object HighlyLikely     extends Likelihood("high")
   case object Possibly         extends Likelihood("possibly", Set("maybe"))
   case object Unlikely         extends Likelihood("unlikely", Set("low","slight"))
   case object Never            extends Likelihood("never")
   val likelihoods: Set[Likelihood] = Set(HighlyLikely, Possibly, Unlikely, Never)

   sealed abstract class DevelopmentStatus(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "status.development") extends Characteristic
   object DevelopmentStatus extends EnumParse[DevelopmentStatus]
   case object Abandoned        extends DevelopmentStatus("abandoned",Set("cancelled","mothballed"))
   case object Alpha            extends DevelopmentStatus("alpha")
   case object Beta             extends DevelopmentStatus("beta")
   case object Completed        extends DevelopmentStatus("completed")
   case object NotStarted       extends DevelopmentStatus("notstarted")
   val developmentStatuses: Set[DevelopmentStatus] = Set(Abandoned, Alpha, Beta, Completed, NotStarted)

   sealed abstract class ReleaseStatus(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "status.release") extends Characteristic
   object ReleaseStatus extends EnumParse[ReleaseStatus]
   case object Mature           extends ReleaseStatus("mature")
   case object Released         extends ReleaseStatus("released")
   case object BetaRelease      extends ReleaseStatus("beta")
   case object NotReleased      extends ReleaseStatus("notreleased")
   case object Mothballed       extends ReleaseStatus("mothballed")
   val releaseStatuses: Set[ReleaseStatus] = Set(Mature, Released, BetaRelease, NotReleased, Mothballed)

   sealed abstract class DeployStatus(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "status.deploy") extends Characteristic
   object DeployStatus extends EnumParse[DeployStatus]
   case object Live             extends DeployStatus("live", Set("demo"))
   case object Offline          extends DeployStatus("offline")
   val deployStatuses: Set[DeployStatus] = Set(Live, Offline)


   case class CharacteristicPossibilities(appeals: Set[Appeal],
                                          complexities: Set[Complexity],
                                          likelihoods: Set[Likelihood],
                                          developmentStatuses: Set[DevelopmentStatus],
                                          releaseStatuses: Set[ReleaseStatus],
                                          deployStatuses: Set[DeployStatus]){

      val isEmpty = appeals.isEmpty && complexities.isEmpty &&
                    likelihoods.isEmpty && developmentStatuses.isEmpty &&
                    releaseStatuses.isEmpty && deployStatuses.isEmpty

      def findCharacteristic(name: String) =
        Appeal(name,appeals)
          .orElse(Complexity(name, complexities))
          .orElse(Likelihood(name, likelihoods))
          .orElse(DevelopmentStatus(name, developmentStatuses))
          .orElse(ReleaseStatus(name, releaseStatuses))
          .orElse(DeployStatus(name, deployStatuses))
   }

   val characteristicPossibilities = CharacteristicPossibilities(appeals, complexities, likelihoods, developmentStatuses, releaseStatuses, deployStatuses)
}

import ProjectCharacteristics._

case class ProjectCharacteristics( appeal:            Option[Appeal],
                                   complexity:        Option[Complexity],
                                   likelihood:        Option[Likelihood], // resuscitate
                                   developmentStatus: Option[DevelopmentStatus],
                                   releaseStatus:     Option[ReleaseStatus],
                                   deployStatus:      Option[DeployStatus] ){
   def this() = this(None, None, None, None, None, None)
   def this(configuration: Configuration) = this(
         appeal            = configuration.getString("appeal")            .flatMap(Appeal(_, appeals)),
         complexity        = configuration.getString("complexity")        .flatMap(Complexity(_, complexities)),
         likelihood        = configuration.getString("likelihood")        .flatMap(Likelihood(_, likelihoods)),
         developmentStatus = configuration.getString("status.development").flatMap(DevelopmentStatus(_, developmentStatuses)),
         releaseStatus     = configuration.getString("status.release")    .flatMap(ReleaseStatus(_, releaseStatuses)),
         deployStatus      = configuration.getString("status.deploy")     .flatMap(DeployStatus(_, deployStatuses)) )
   val isEmpty = appeal.orElse(complexity)
                       .orElse(likelihood)
                       .orElse(developmentStatus)
                       .orElse(releaseStatus)
                       .orElse(deployStatus)
                       .isEmpty
  val characteristics: List[Characteristic] = appeal.toList ::: complexity.toList :::
                                                                likelihood.toList :::
                                                                developmentStatus.toList :::
                                                                releaseStatus.toList :::
                                                                deployStatus.toList
  def hasCharacteristic(characteristic: Characteristic) = characteristics.contains(characteristic)
}

object Licenses {
   sealed abstract class License(val name: String, val link: String) extends EnumName
   object License      extends EnumParse[License]
   case object Agpl3   extends License("AGPL v3", "https://opensource.org/licenses/agpl-3.0")
   case object Apache2 extends License("Apache 2.0", "https://www.apache.org/licenses/LICENSE-2.0")
   case object Respect extends License("Respect", "http://flurdy.com/docs/license/respect/0.3/")
   case object Bsd     extends License("BSD", "https://opensource.org/licenses/BSD-3-Clause")
   case object Mit     extends License("MIT", "https://opensource.org/licenses/MIT")
   case object Gpl     extends License("GPL", "https://opensource.org/licenses/gpl-license")
   case object Lgpl    extends License("LGPL", "https://opensource.org/licenses/lgpl-license")
   case object CcSa    extends License("Creative Commons - Attribution ShareAlike", "https://creativecommons.org/licenses/by-sa/2.5/")
   val licenses: Set[License] = Set(Agpl3, Apache2, Respect, Bsd, Mit, Gpl, Lgpl, CcSa)
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
                   characteristics: ProjectCharacteristics = new ProjectCharacteristics())

@ImplementedBy(classOf[ProjectRepostitory])
trait ProjectLookup {

   def configuration: Configuration

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
         projects.filter(_.title == projectName).headOption

   def findRandomProjects(size: Int)  = randomiseProjects(projects).take(size)

   private def randomiseProjects(someProjects: List[Project])  = Random.shuffle(someProjects)

   private lazy val projects = for{
         projectsFound <- configuration.getConfigList("dreams.projects").toList
         projectConfig <- projectsFound
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
class ProjectRepostitory @Inject() (val configuration: Configuration) extends ProjectLookup
