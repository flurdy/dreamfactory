package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.{Configuration, Environment}
// import scala.collection.JavaConversions._
import scala.jdk.CollectionConverters
import util.Random
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
      if (subsetOfProjects.size < size)
        randomiseProjects(projects.diff(subsetOfProjects)).take(size - subsetOfProjects.size)
      else Nil
    subsetOfProjects ::: fillProjects
  }

  def findPopularProjects(size: Int): List[Project] = {
    fillWithOtherProjects(
      randomiseProjects(projects.filter(_.tags.exists(t => t.name == "popular")))
        .take(size),
      size
    )
  }

  private def lookupUpdatedProjects(excludeProjects: Set[Project] = Set()): List[Project] =
    (projects.filter(_.dates.hasDate).toSet -- excludeProjects).toList
      .filter(_.dates.hasDate)
      .sortBy(_.dates.newestDate.get.getMillis)
      .reverse

  def findUpdatedProjects(size: Int, newProjects: List[Project] = List()) = {
    val allUpdatedProjects      = lookupUpdatedProjects()
    val nonIdeas                = newProjects.filter(n => n.isAnIdea || n.characteristics.isNotStarted)
    val filteredUpdatedProjects = lookupUpdatedProjects(nonIdeas.toSet)
    if (filteredUpdatedProjects.size < size)
      (filteredUpdatedProjects ::: allUpdatedProjects.take(size - filteredUpdatedProjects.size))
        .filter(_.dates.hasDate)
        .sortBy(_.dates.newestDate.get.getMillis)
        .reverse
    else
      filteredUpdatedProjects.take(size)
  }

  private def newestProjects =
    projects
      .filter(_.dates.created.isDefined)
      .sortBy(_.dates.created)
      .reverse

  def findNewestProjects(size: Int) =
    fillWithOtherProjects(newestProjects.take(size), size)

  lazy val howManyProjects = projects.size

  def findProject(projectName: String): Option[Project] =
    projects.filter(_.isProject(projectName)).headOption

  def findRandomProjects(size: Int, excludeProjects: Set[Project] = Set()) = {
    val includedProjects = projects.toSet -- excludeProjects
    randomiseProjects(includedProjects.toList).take(size)
  }

  private def randomiseProjects(someProjects: List[Project]) = Random.shuffle(someProjects)

  private def loadConfigFile(path: String): Configuration = Configuration(ConfigFactory.load(path))

  private def findDynamicDreamsConfig: List[Configuration] =
    environment
      .getExistingFile("conf/dreams.d")
      .toList
      .flatMap(_.listFiles)
      .filter(_.getName.endsWith(".conf"))
      .map(f => FilenameUtils.removeExtension(f.getName))
      .map(f => s"dreams.d/${f}")
      .map(loadConfigFile(_))

  private def findProjectDreams: List[Configuration] =
    findDynamicDreamsConfig.map { d =>
      d.getOptional[Seq[Configuration]]("dreams.projects").toList.flatten
    }.flatten

  private lazy val projects = for {
    projectConfig <- findProjectDreams
    title         <- projectConfig.getOptional[String]("title").toList
    description = projectConfig.getOptional[String]("description")
  } yield {
    val urls: Urls              = projectConfig.getOptional[Configuration]("urls").fold(Urls())(new Urls(_))
    val dates: ProjectDates     =
      projectConfig.getOptional[Configuration]("dates").fold(ProjectDates())(new ProjectDates(_))
    val versions: Versions      =
      projectConfig.getOptional[Configuration]("versions").fold(Versions())(new Versions(_))
    val tags: Set[Tag]          =
      projectConfig.getOptional[Seq[String]]("tags").fold[Set[Tag]](Set.empty)(t => Tag.extract(t.toList))
    val news: List[News]        =
      projectConfig
        .getOptional[Seq[Configuration]]("news")
        .fold[List[News]](List.empty)(l => News.extract(title, l.toList))
    val comments: List[Comment] = projectConfig
      .getOptional[Seq[Configuration]]("comments")
      .fold[List[Comment]](List.empty)(l => Comment.extract(title, l.toList))
    val characteristics         = projectConfig
      .getOptional[Configuration]("characteristics")
      .fold(new ProjectCharacteristics())(new ProjectCharacteristics(_))
    val license                 = projectConfig.getOptional[String]("license").flatMap(License(_, licenses))
    val encoded                 = projectConfig.getOptional[String]("encoded")
    val tech: Set[Technology]   =
      projectConfig
        .getOptional[Seq[String]]("tech")
        .fold[Set[Technology]](Set.empty)(t => Technology.extract(t.toList))
    Project(
      title = title,
      encoded = encoded,
      description = description,
      urls = urls,
      dates = dates,
      versions = versions,
      license = license,
      tags = tags,
      tech = tech,
      news = news,
      comments = comments,
      characteristics = characteristics
    )
  }

  val findAllTheProjects: List[Project] = projects

  def findProjectsBySearch(searchTerm: String): List[Project] =
    projects.filter { p =>
      p.title.toLowerCase.contains(searchTerm) || p.description.exists(_.toLowerCase.contains(searchTerm))
    }

  def findTags(size: Int): List[Tag] = findTagsInProjects(projects, size)

  def findTechnologies(size: Int): List[Technology] = findTechnologiesInProjects(projects, size)

  def findTagsInProjects(tagProjects: List[Project], size: Int): List[Tag] = {
    (for {
      project <- tagProjects
      tag     <- project.tags
    } yield tag)
      .groupBy(_.name)
      .view
      .mapValues(_.size)
      .toList
      .sortBy { case (_, tagCount) => tagCount }
      .takeRight(size)
      .reverse
      .map { case (name, _) => Tag(name) }
  }

  def findTechnologiesInProjects(techProjects: List[Project], size: Int): List[Technology] = {
    (for {
      project <- techProjects
      tech    <- project.tech
    } yield tech)
      .groupBy(_.name)
      .view
      .mapValues(_.size)
      .toList
      .sortBy { case (_, count) => count }
      .takeRight(size)
      .reverse
      .map { case (name, _) => Technology(name.toLowerCase) }
  }

  def findProjectsByTag(tag: Tag): List[Project] = projects.filter { p =>
    p.tags.exists(_.name.toLowerCase == tag.name.toLowerCase)
  }

  def findProjectsByTech(tech: Technology): List[Project] = projects.filter { p =>
    p.tech.exists(_.name.toLowerCase == tech.name.toLowerCase)
  }

  def findProjectsByCharacteristic(characteristic: Characteristic): List[Project] =
    projects.filter { p => p.characteristics.hasCharacteristic(characteristic) }

  def findProjectsByTags(tags: List[Tag]): List[Project] = projects.filter { p =>
    tags.toSet.subsetOf(p.tags)
  }

  def findProjectsByTechnologies(tech: List[Technology]): List[Project] = projects.filter { p =>
    tech.toSet.subsetOf(p.tech)
  }

  private lazy val allTheNews =
    (for {
      project <- projects
      news    <- project.news
    } yield news).sortBy(n => n.date.getMillis).reverse

  def findNews(size: Int) = allTheNews.take(size)

}

@Singleton
class ProjectRepostitory @Inject() (val configuration: Configuration, val environment: Environment)
    extends ProjectLookup
