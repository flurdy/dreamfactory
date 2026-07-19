package controllers

import models.{ProjectLookup, Technology}
import models.ProjectCharacteristics.Easy
import org.scalatestplus.play._
import org.scalatestplus.play.guice.GuiceOneAppPerSuite
import play.api.test.FakeRequest
import play.api.test.Helpers._

class ProjectControllerSpec extends PlaySpec with GuiceOneAppPerSuite {

  private val projectTitlePattern = """<a class="project-summary-title" href="[^"]+">([^<]+)</a>""".r

  private def resultTitles(content: String): List[String] =
    projectTitlePattern.findAllMatchIn(content).map(_.group(1)).toList

  private def relatedChipNames(content: String, heading: String): List[String] = {
    val relatedSection =
      (s"""(?s)<section class="surface related-section">\\s*<h2>$heading</h2>(.*?)</section>""".r findFirstMatchIn content)
        .map(_.group(1))
        .getOrElse(fail(s"Missing related $heading section"))
    """<button class="chip" type="submit">([^<]+)</button>""".r
      .findAllMatchIn(relatedSection)
      .map(_.group(1))
      .toList
  }

  "ProjectController" should {
    "apply property filters to characteristic results" in {
      val lookup         = app.injector.instanceOf[ProjectLookup]
      val expectedTitles = lookup
        .findProjectsByCharacteristic(Easy)
        .filter(_.isLive)
        .sortBy(_.title.toLowerCase)
        .map(_.title)

      val result = route(
        app,
        FakeRequest(GET, "/projects/characteristic/type/complexity/characteristic/easy?filter.live=require")
      ).value

      status(result) mustBe OK
      val content = contentAsString(result)
      resultTitles(content) must contain theSameElementsInOrderAs expectedTitles
      relatedChipNames(content, "Tags") must contain theSameElementsInOrderAs lookup
        .findTagsInProjects(lookup.findProjectsByCharacteristic(Easy).filter(_.isLive), 50)
        .map(_.name)
      relatedChipNames(content, "Technologies") must contain theSameElementsInOrderAs lookup
        .findTechnologiesInProjects(lookup.findProjectsByCharacteristic(Easy).filter(_.isLive), 10)
        .map(_.name)
    }

    "name selected technologies and derive related technologies from filtered results" in {
      val lookup = app.injector.instanceOf[ProjectLookup]
      val result = route(app, FakeRequest(GET, "/projects/tech?tech=scala&filter.live=require")).value

      status(result) mustBe OK
      val content = contentAsString(result)
      content must include("Projects with technologies: scala")
      relatedChipNames(content, "Technologies") must contain theSameElementsInOrderAs lookup
        .findTechnologiesInProjects(lookup.findProjectsByTech(Technology("scala")).filter(_.isLive), 11)
        .filter(_.name != "scala")
        .take(10)
        .map(_.name)
    }
  }
}
