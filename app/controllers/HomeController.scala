package controllers

import javax.inject._
import play.api._
import play.api.mvc._
import play.api.i18n.{MessagesApi, I18nSupport}

trait WithWebJarAssets {
   implicit def webJarAssets: WebJarAssets
   implicit def request2WebJarAssets(implicit request: RequestHeader): WebJarAssets = webJarAssets
}

@Singleton
class HomeController @Inject() (val messagesApi: MessagesApi)
      (implicit val webJarAssets: WebJarAssets)
      extends Controller with WithWebJarAssets with I18nSupport {

  def index = Action {
    Ok(views.html.index())
  }

}
