package controllers

import javax.inject._
import play.api._
import play.api.mvc._
import play.api.data._
import play.api.data.Forms._
import play.api.i18n.{MessagesApi, I18nSupport}
import models._


@Singleton
class ProjectController @Inject() (val messagesApi: MessagesApi, val projectLookup: ProjectLookup, val configuration: Configuration)
      (implicit val webJarAssets: WebJarAssets)
      extends Controller with WithWebJarAssets with I18nSupport {

   def showProject(projectName: String) = Action {
      projectLookup.findProject(projectName).fold[Result](NotFound("404"))( p => Ok(views.html.project.project(p)) )
   }

   def findProjectsBySearch() = Action { implicit request =>
      searchForm.bindFromRequest.fold(
         formWithErrors => BadRequest("Invalid form"),
         searchTerm => {
            val projects = projectLookup.findProjectsBySearch(searchTerm)
            Ok(views.html.project.listprojects(projects))
         }
      )
   }

   val searchForm = Form( single( "searchterm" -> nonEmptyText))

   def findProjectsByTag() = Action { implicit request =>
      tagForm.bindFromRequest.fold(
         formWithErrors => BadRequest("Invalid form"),
         tagName => {
            val tag = Tag(tagName)
            val projects = projectLookup.findProjectsByTag(tag)
            val subTags  = projectLookup.findTagsInProjects(projects,11).filter( _.name != tag.name).take(10)
            Ok(views.html.project.listprojects(projects, tags = List(tag), subTags = subTags))
         }
      )
   }

   def findProjectsByTags() = Action { implicit request =>
      tagsForm.bindFromRequest.fold(
         formWithErrors => BadRequest("Invalid form"),
         tagsData => {
            val tag  = Tag(tagsData._2)
            val tags = tag :: (tagsData._1.split(",").map(Tag(_)).toList)
            val projects = projectLookup.findProjectsByTags(tags)
            val subTags  = projectLookup.findTagsInProjects(projects,30)
                                        .filter( t => !tags.exists( tt => t.name == tt.name) )
                                        .take(10)
            Ok(views.html.project.listprojects(projects, tags = tags, subTags = subTags))
         }
      )
   }

   val tagForm = Form( single( "tag" -> nonEmptyText) )

   val tagsForm = Form( tuple(
      "tags" -> nonEmptyText,
      "tag"  -> nonEmptyText
   ))

}
