package controllers

import javax.inject._
import play.api._
import play.api.mvc._
import play.api.data._
import play.api.data.Forms._
import play.api.i18n.{MessagesApi, I18nSupport}
import org.webjars.play.WebJarsUtil
import models._

@Singleton
class ProjectController @Inject() (
    val projectLookup: ProjectLookup,
    val configuration: Configuration,
    components: MessagesControllerComponents
)(implicit val webJarsUtil: WebJarsUtil)
    extends MessagesAbstractController(components)
    with Logging
    with WithNewsBar
    with WithAnalytics
    with I18nSupport {

  def showProject(projectName: String) = Action { implicit request: MessagesRequest[AnyContent] =>
    projectLookup
      .findProject(projectName)
      .fold[Result](NotFound("404"))(p => Ok(views.html.project.details(p)))
  }

  def showHelp(projectName: String) = Action { implicit request: MessagesRequest[AnyContent] =>
    projectLookup.findProject(projectName).fold[Result](NotFound("404"))(p => Ok(views.html.project.help(p)))
  }

  def showSponsor(projectName: String) = Action { implicit request: MessagesRequest[AnyContent] =>
    projectLookup
      .findProject(projectName)
      .fold[Result](NotFound("404"))(p => Ok(views.html.project.sponsor(p)))
  }

  def findAllProjects() = Action { implicit request =>
    filtersForm
      .bindFromRequest()
      .fold(
        formWithErrors => BadRequest("Invalid form"),
        filters => {
          val projects         = projectLookup.findAllTheProjects.sortBy(_.title.toLowerCase)
          val filteredProjects = filterProjects(projects, filters)
          val subTags          = projectLookup.findTagsInProjects(filteredProjects, 50)
          Ok(
            views.html.project.listprojects(
              filteredProjects,
              searchTerm = None,
              subTags = subTags,
              filterProperties = filters
            )
          )
        }
      )
  }

  def findProjectsBySearch() = Action { implicit request: MessagesRequest[AnyContent] =>
    searchForm
      .bindFromRequest()
      .fold(
        formWithErrors => BadRequest("Invalid form"),
        searchTerm => {
          val projects =
            if (searchTerm.trim.isEmpty) projectLookup.findAllTheProjects.sortBy(_.title.toLowerCase)
            else projectLookup.findProjectsBySearch(searchTerm).sortBy(_.title.toLowerCase)
          val search   = if (searchTerm.trim.isEmpty) None else Some(searchTerm)
          Ok(views.html.project.listprojects(projects = projects, searchTerm = search))
        }
      )
  }

  val searchForm = Form(single("searchterm" -> text))

  private def filterProject(project: Project, filters: Option[ProjectFilters]) =
    filters match {
      case Some(f) => f.filter(project)
      case None    => Some(project)
    }

  private def filterProjects(projects: List[Project], filters: Option[ProjectFilters]) =
    projects.filter(p => filterProject(p, filters).isDefined)

  def findProjectsByTag() = Action { implicit request: MessagesRequest[AnyContent] =>
    tagForm
      .bindFromRequest()
      .fold(
        formWithErrors => BadRequest("Invalid form"),
        tagName => {
          val tag      = Tag(tagName._1)
          val projects = projectLookup.findProjectsByTag(tag).sortBy(_.title.toLowerCase)
          val filteredProjects = filterProjects(projects, tagName._2)
          val subTags  = projectLookup.findTagsInProjects(filteredProjects, 50).filter(_.name != tag.name)
          Ok(
            views.html.project
              .listprojects(
                filteredProjects,
                tags = List(tag),
                subTags = subTags,
                filterProperties = tagName._2
              )
          )
        }
      )
  }

  def findProjectsByTech() = Action { implicit request: MessagesRequest[AnyContent] =>
    techForm
      .bindFromRequest()
      .fold(
        formWithErrors => BadRequest("Invalid form"),
        techName => {
          val tech             = Technology(techName._1)
          val projects         = projectLookup.findProjectsByTech(tech).sortBy(_.title.toLowerCase)
          val subTech          =
            projectLookup.findTechnologiesInProjects(projects, 11).filter(_.name != tech.name).take(10)
          val filteredProjects = filterProjects(projects, techName._2)
          Ok(
            views.html.project.listprojects(
              filteredProjects,
              technologies = List(tech),
              subTech = subTech,
              filterProperties = techName._2
            )
          )
        }
      )
  }

  def findProjectsByTags() = Action { implicit request: MessagesRequest[AnyContent] =>
    tagsForm
      .bindFromRequest()
      .fold(
        formWithErrors => {
          logger.warn(s"Invalid form: ${formWithErrors.errors}")
          BadRequest("Invalid form")
        },
        tagsData => {
          val tag              = Tag(tagsData._2)
          val tags             = tag :: (tagsData._1.split(",").map(Tag(_)).toList)
          val projects         = projectLookup.findProjectsByTags(tags).sortBy(_.title.toLowerCase)
          val filteredProjects = filterProjects(projects, tagsData._3)
          val subTags          = projectLookup
            .findTagsInProjects(filteredProjects, 50)
            .filter(t => !tags.exists(tt => t.name == tt.name))
          Ok(
            views.html.project
              .listprojects(filteredProjects, tags = tags, subTags = subTags, filterProperties = tagsData._3)
          )
        }
      )
  }

  def findProjectsByTechnologies() = Action { implicit request: MessagesRequest[AnyContent] =>
    technologiesForm
      .bindFromRequest()
      .fold(
        formWithErrors => BadRequest("Invalid form"),
        techData => {
          val tech         = Technology(techData._2)
          val technologies = tech :: (techData._1.split(",").map(Technology(_)).toList)
          val projects = projectLookup.findProjectsByTechnologies(technologies).sortBy(_.title.toLowerCase)
          val subTech  = projectLookup
            .findTechnologiesInProjects(projects, 30)
            .filter(t => !technologies.exists(tt => t.name == tt.name))
            .take(10)
          val filteredProjects = filterProjects(projects, techData._3)
          Ok(
            views.html.project.listprojects(
              filteredProjects,
              technologies = technologies,
              subTech = subTech,
              filterProperties = techData._3
            )
          )
        }
      )
  }

  def findProjectsByCharacteristic(characteristicType: String, characteristic: String) = Action {
    implicit request: MessagesRequest[AnyContent] =>
      filtersForm
        .bindFromRequest()
        .fold(
          formWithErrors => BadRequest("Invalid form"),
          filters => {
            val characteristicFound: Option[ProjectCharacteristics.Characteristic] =
              ProjectCharacteristics.characteristicPossibilities.findCharacteristic(
                characteristicType,
                characteristic
              )
            val projects: List[Project]                                            = for {
              c       <- characteristicFound.toList
              project <- projectLookup.findProjectsByCharacteristic(c).sortBy(_.title.toLowerCase)
              filteredProjects = filterProject(project, filters)
            } yield project
            Ok(
              views.html.project
                .listprojects(
                  projects = projects,
                  possibleCharacteristic = characteristicFound,
                  filterProperties = filters
                )
            )
          }
        )
  }

  val filterMapping =
    mapping(
      "popular"    -> optional(text),
      "dead"       -> optional(text),
      "unlikely"   -> optional(text),
      "recent"     -> optional(text),
      "updated"    -> optional(text),
      "stale"      -> optional(text),
      "live"       -> optional(text),
      "idea"       -> optional(text),
      "code"       -> optional(text),
      "mobile"     -> optional(text),
      "commercial" -> optional(text)
    )(ProjectFilters.apply)(ProjectFilters.unapply)

  val tagForm = Form(
    tuple(
      "tag"    -> nonEmptyText,
      "filter" -> optional(filterMapping)
    )
  )

  val techForm = Form(
    tuple(
      "tech"   -> nonEmptyText,
      "filter" -> optional(filterMapping)
    )
  )

  val tagsForm = Form(
    tuple(
      "tags"   -> nonEmptyText,
      "tag"    -> nonEmptyText,
      "filter" -> optional(filterMapping)
    )
  )

  val technologiesForm = Form(
    tuple(
      "technologies" -> nonEmptyText,
      "tech"         -> nonEmptyText,
      "filter"       -> optional(filterMapping)
    )
  )

  val filtersForm = Form(single("filter" -> optional(filterMapping)))

}
