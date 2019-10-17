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

import EnumModel._

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
   case object Proprietary extends License("Proprietary", "https://eray.uk")
   val licenses: Set[License] = Set(Agpl3, Apache2, Respect, Bsd, Mit, Gpl, Lgpl, CcSa, Proprietary)
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
