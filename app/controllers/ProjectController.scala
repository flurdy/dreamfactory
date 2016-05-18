package controllers

import javax.inject._
import play.api._
import play.api.mvc._
import play.api.i18n.{MessagesApi, I18nSupport}
import models._


@Singleton
class ProjectController @Inject() (val messagesApi: MessagesApi, val projectLookup: ProjectLookup, val configuration: Configuration)
      (implicit val webJarAssets: WebJarAssets)
      extends Controller with WithWebJarAssets with I18nSupport {

   def showProject(projectName: String) = Action {
      projectLookup.findProject(projectName).fold[Result](NotFound("404"))( p => Ok(views.html.project.project(p)) )
   }

}
