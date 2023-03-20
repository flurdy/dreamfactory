package controllers

import javax.inject._
import play.api._
import play.api.mvc._
import play.api.i18n.{MessagesApi, I18nSupport}
import org.webjars.play.WebJarsUtil
import scala.language.implicitConversions
import models._
import ProjectCharacteristics._

// trait WithWebJarAssets {
//   implicit def webJarAssets: WebJarAssets
//   implicit def request2WebJarAssets(implicit request: RequestHeader): WebJarAssets = webJarAssets
// }

trait WithNewsBar {

  def projectLookup: ProjectLookup

  implicit def latestNews: List[News] = projectLookup.findNews(26)
}

trait WithAnalytics {

  def configuration: Configuration

  implicit val analytics: Option[GoogleAnalytics] = GoogleAnalytics(
    configuration.getOptional[Configuration]("analytics.google")
  )
}

@Singleton
class HomeController @Inject() (
    //  val messagesApi: MessagesApi,
    val projectLookup: ProjectLookup,
    val configuration: Configuration,
    components: MessagesControllerComponents
)(implicit val webJarsUtil: WebJarsUtil)
    extends MessagesAbstractController(components)
    with WithNewsBar
    with WithAnalytics
    with I18nSupport {

  private val topRowEntries    = 7
  private val secondRowEntries = 10

  def index = Action { implicit request: MessagesRequest[AnyContent] =>
    val newProjects     = projectLookup.findNewestProjects(secondRowEntries)
    val updatedProjects = projectLookup.findUpdatedProjects(topRowEntries, newProjects)
    val popularProjects = projectLookup.findPopularProjects(topRowEntries)
    val randomProjects  = projectLookup.findRandomProjects(
      secondRowEntries,
      updatedProjects.toSet ++ newProjects ++ popularProjects
    )
    val projectsFound   = projectLookup.howManyProjects
    val tags            = projectLookup.findTags(30)
    val tech            = projectLookup.findTechnologies(30)
    val characteristics = characteristicPossibilities
    Ok(
      views.html.index(
        projectsFound,
        updatedProjects,
        newProjects,
        popularProjects,
        randomProjects,
        tags,
        tech,
        characteristics
      )
    )
  }

}
