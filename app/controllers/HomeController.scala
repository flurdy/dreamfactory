package controllers

import javax.inject._
import play.api._
import play.api.mvc._
import play.api.i18n.{MessagesApi, I18nSupport}
import models._
import ProjectCharacteristics._

trait WithWebJarAssets {
   implicit def webJarAssets: WebJarAssets
   implicit def request2WebJarAssets(implicit request: RequestHeader): WebJarAssets = webJarAssets
}

trait WithNewsBar {

   def projectLookup: ProjectLookup

   implicit def latestNews: List[News] = projectLookup.findNews(22)
}

trait WithAnalytics {

   def configuration: Configuration

   implicit val analytics: Option[GoogleAnalytics] = GoogleAnalytics(configuration.getConfig("analytics.google"))
}

@Singleton
class HomeController @Inject() (val messagesApi: MessagesApi, val projectLookup: ProjectLookup, val configuration: Configuration)
      (implicit val webJarAssets: WebJarAssets)
      extends Controller with WithWebJarAssets with WithNewsBar with WithAnalytics with I18nSupport {

   def index = Action {
      val updatedProjects = projectLookup.findUpdatedProjects(6)
      val newProjects     = projectLookup.findNewestProjects(8)
      val popularProjects = projectLookup.findPopularProjects(6)
      val randomProjects  = projectLookup.findRandomProjects(8)
      val projectsFound   = projectLookup.howManyProjects
      val tags            = projectLookup.findTags(30)
      val characteristics = characteristicPossibilities
      Ok(views.html.index(projectsFound, updatedProjects, newProjects, popularProjects, randomProjects, tags, characteristics))
   }

}
