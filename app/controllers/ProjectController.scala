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
      extends Controller with WithWebJarAssets with WithNewsBar with WithAnalytics with I18nSupport {

   def showProject(projectName: String) = Action {
      projectLookup.findProject(projectName).fold[Result](NotFound("404"))( p => Ok(views.html.project.project(p)) )
   }

   def showHelp(projectName: String) = Action {
      projectLookup.findProject(projectName).fold[Result](NotFound("404"))( p => Ok(views.html.project.help(p)) )
   }

   def showSponsor(projectName: String) = Action {
      projectLookup.findProject(projectName).fold[Result](NotFound("404"))( p => Ok(views.html.project.sponsor(p)) )
   }

   def findProjectsBySearch() = Action { implicit request =>
      searchForm.bindFromRequest.fold(
         formWithErrors => BadRequest("Invalid form"),
         searchTerm => {
            val projects = if(searchTerm.trim.isEmpty) projectLookup.findAllTheProjects
                           else projectLookup.findProjectsBySearch(searchTerm)
            val search = if(searchTerm.trim.isEmpty) None else Some(searchTerm)
            Ok(views.html.project.listprojects(projects=projects,searchTerm=search))
         }
      )
   }

   val searchForm = Form( single( "searchterm" -> text))

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

   def findProjectsByCharacteristic(characteristicType: String, characteristic: String) =  Action { implicit request =>
      val characteristicFound: Option[ProjectCharacteristics.Characteristic] =
        ProjectCharacteristics.characteristicPossibilities.findCharacteristic(characteristicType, characteristic)
      val projects: List[Project] = for{
          c <-characteristicFound.toList
          project <- projectLookup.findProjectsByCharacteristic(c)
        } yield project
      Ok(views.html.project.listprojects(projects=projects, possibleCharacteristic = characteristicFound))
   }

   val tagForm = Form( single( "tag" -> nonEmptyText) )

   val tagsForm = Form( tuple(
      "tags" -> nonEmptyText,
      "tag"  -> nonEmptyText
   ))

}
