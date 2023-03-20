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
    val projects = projectLookup.findAllTheProjects.sortBy(_.title.toLowerCase)
    Ok(views.html.project.listprojects(projects, searchTerm = None))
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

  def findProjectsByTag() = Action { implicit request: MessagesRequest[AnyContent] =>
    tagForm
      .bindFromRequest()
      .fold(
        formWithErrors => BadRequest("Invalid form"),
        tagName => {
          val tag      = Tag(tagName)
          val projects = projectLookup.findProjectsByTag(tag).sortBy(_.title.toLowerCase)
          val subTags  = projectLookup.findTagsInProjects(projects, 11).filter(_.name != tag.name).take(10)
          Ok(views.html.project.listprojects(projects, tags = List(tag), subTags = subTags))
        }
      )
  }

  def findProjectsByTech() = Action { implicit request: MessagesRequest[AnyContent] =>
    techForm
      .bindFromRequest()
      .fold(
        formWithErrors => BadRequest("Invalid form"),
        techName => {
          val tech     = Technology(techName)
          val projects = projectLookup.findProjectsByTech(tech).sortBy(_.title.toLowerCase)
          val subTech  =
            projectLookup.findTechnologiesInProjects(projects, 11).filter(_.name != tech.name).take(10)
          Ok(views.html.project.listprojects(projects, technologies = List(tech), subTech = subTech))
        }
      )
  }

  def findProjectsByTags() = Action { implicit request: MessagesRequest[AnyContent] =>
    tagsForm
      .bindFromRequest()
      .fold(
        formWithErrors => BadRequest("Invalid form"),
        tagsData => {
          val tag      = Tag(tagsData._2)
          val tags     = tag :: (tagsData._1.split(",").map(Tag(_)).toList)
          val projects = projectLookup.findProjectsByTags(tags).sortBy(_.title.toLowerCase)
          val subTags  = projectLookup
            .findTagsInProjects(projects, 30)
            .filter(t => !tags.exists(tt => t.name == tt.name))
            .take(10)
          Ok(views.html.project.listprojects(projects, tags = tags, subTags = subTags))
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
          Ok(views.html.project.listprojects(projects, technologies = technologies, subTech = subTech))
        }
      )
  }

  def findProjectsByCharacteristic(characteristicType: String, characteristic: String) = Action {
    implicit request: MessagesRequest[AnyContent] =>
      val characteristicFound: Option[ProjectCharacteristics.Characteristic] =
        ProjectCharacteristics.characteristicPossibilities.findCharacteristic(
          characteristicType,
          characteristic
        )
      val projects: List[Project]                                            = for {
        c       <- characteristicFound.toList
        project <- projectLookup.findProjectsByCharacteristic(c).sortBy(_.title.toLowerCase)
      } yield project
      Ok(views.html.project.listprojects(projects = projects, possibleCharacteristic = characteristicFound))
  }

  val tagForm = Form(single("tag" -> nonEmptyText))

  val techForm = Form(single("tech" -> nonEmptyText))

  val tagsForm = Form(
    tuple(
      "tags" -> nonEmptyText,
      "tag"  -> nonEmptyText
    )
  )

  val technologiesForm = Form(
    tuple(
      "technologies" -> nonEmptyText,
      "tech"         -> nonEmptyText
    )
  )

}
