package controllers

import javax.inject._
import play.api._
import play.api.mvc._
import play.api.i18n.{MessagesApi, I18nSupport}
import models._

trait WithWebJarAssets {
   implicit def webJarAssets: WebJarAssets
   implicit def request2WebJarAssets(implicit request: RequestHeader): WebJarAssets = webJarAssets
}

@Singleton
class HomeController @Inject() (val messagesApi: MessagesApi, val projectLookup: ProjectLookup)
      (implicit val webJarAssets: WebJarAssets)
      extends Controller with WithWebJarAssets with I18nSupport {

   def index = Action {
      val updatedProjects = projectLookup.findUpdatedProjects(3)
      val newProjects     = projectLookup.findNewestProjects(3)
      val popularProjects = projectLookup.findPopularProjects(3)
      val randomProjects  = projectLookup.findRandomProjects(3)
      val projectsFound   = projectLookup.howManyProjects
      Ok(views.html.index(projectsFound, updatedProjects, newProjects, popularProjects, randomProjects))
   }

}
