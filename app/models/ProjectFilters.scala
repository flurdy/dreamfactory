package models

import play.api.Logging

case class ProjectFilters(
    popular: Option[String],
    dead: Option[String],
    unlikely: Option[String],
    recent: Option[String],
    updated: Option[String],
    stale: Option[String],
    live: Option[String],
    idea: Option[String],
    code: Option[String],
    mobile: Option[String],
    commercial: Option[String]
) extends Logging {

  private def requireProperty(propertyFilter: Option[String]) = propertyFilter.contains("require")
  private def excludeProperty(propertyFilter: Option[String]) = propertyFilter.contains("exclude")

  private def filterProperty(
      project: Project,
      hasProperty: Boolean,
      propertyFilter: Option[String]
  ): Option[Project] =
    if (requireProperty(propertyFilter) && !hasProperty) None
    else if (excludeProperty(propertyFilter) && hasProperty) None
    else Some(project)

  val requirePopular    = requireProperty(popular)
  val requireDead       = requireProperty(dead)
  val requireUnlikely   = requireProperty(unlikely)
  val requireRecent     = requireProperty(recent)
  val requireUpdated    = requireProperty(updated)
  val requireStale      = requireProperty(stale)
  val requireLive       = requireProperty(live)
  val requireIdea       = requireProperty(idea)
  val requireCode       = requireProperty(code)
  val requireMobile     = requireProperty(mobile)
  val requireCommercial = requireProperty(commercial)

  val excludePopular    = excludeProperty(popular)
  val excludeDead       = excludeProperty(dead)
  val excludeUnlikely   = excludeProperty(unlikely)
  val excludeRecent     = excludeProperty(recent)
  val excludeUpdated    = excludeProperty(updated)
  val excludeStale      = excludeProperty(stale)
  val excludeLive       = excludeProperty(live)
  val excludeIdea       = excludeProperty(idea)
  val excludeCode       = excludeProperty(code)
  val excludeMobile     = excludeProperty(mobile)
  val excludeCommercial = excludeProperty(commercial)

  def filterPopular(project: Project): Option[Project] = filterProperty(project, project.isPopular, popular)
  def filterDead(project: Project): Option[Project]     =
    filterProperty(project, project.isDead, dead)
  def filterUnlikely(project: Project): Option[Project] =
    filterProperty(project, project.isUnlikely || project.isUnappealing, unlikely)
  def filterUpdated(project: Project): Option[Project]  =
    filterProperty(project, project.isRecentlyUpdatedNotAdded, updated)
  def filterRecent(project: Project): Option[Project]  =
    filterProperty(project, project.isRecentlyAdded, recent)
  def filterStale(project: Project): Option[Project] = filterProperty(project, project.isStaleNotDead, stale)
  def filterLive(project: Project): Option[Project]  = filterProperty(project, project.isLive, live)
  def filterIdea(project: Project): Option[Project]  = filterProperty(project, project.isAnIdea, idea)
  def filterCode(project: Project): Option[Project]  = filterProperty(project, project.hasCodeAvailable, code)
  def filterMobile(project: Project): Option[Project]     = filterProperty(project, project.isApp, mobile)
  def filterCommercial(project: Project): Option[Project] =
    filterProperty(project, project.isCommercial, commercial)

  def filter(project: Project): Option[Project] =
    for {
      _ <- filterPopular(project)
      _ <- filterDead(project)
      _ <- filterUnlikely(project)
      _ <- filterUpdated(project)
      _ <- filterRecent(project)
      _ <- filterStale(project)
      _ <- filterLive(project)
      _ <- filterIdea(project)
      _ <- filterCode(project)
      _ <- filterMobile(project)
      _ <- filterCommercial(project)
    } yield project

  def propertyValue(propertyFilter: String): Option[String] =
    propertyFilter match {
      case "popular"    => popular
      case "dead"       => dead
      case "unlikely"   => unlikely
      case "recent"     => recent
      case "updated"    => updated
      case "stale"      => stale
      case "live"       => live
      case "idea"       => idea
      case "code"       => code
      case "mobile"     => mobile
      case "commercial" => commercial
      case _            => None
    }
}

object ProjectFilters {}
