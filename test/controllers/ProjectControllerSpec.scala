package controllers

import java.net.URLEncoder
import models.{ProjectLookup, Technology}
import models.ProjectCharacteristics.Easy
import org.scalatestplus.play._
import org.scalatestplus.play.guice.GuiceOneAppPerSuite
import play.api.inject.guice.GuiceApplicationBuilder
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

  private def discoverySection(content: String, heading: String): String =
    (s"""(?s)<details class="surface discovery-section" open>\\s*<summary>$heading</summary>(.*?)</details>""".r findFirstMatchIn content)
      .map(_.group(1))
      .getOrElse(fail(s"Missing $heading discovery section"))

  private def formsIn(content: String): List[String] =
    """(?s)<form\b.*?</form>""".r.findAllIn(content).toList

  "ProjectLookup" should {
    "use stable route ordering in the opt-in homepage visual fixture" in {
      val fixtureApp = new GuiceApplicationBuilder()
        .configure("dreamfactory.visual-fixture.deterministic-homepage" -> true)
        .build()
      running(fixtureApp) {
        val lookup  = fixtureApp.injector.instanceOf[ProjectLookup]
        val popular = lookup.findPopularProjects(7)
        val random  = lookup.findRandomProjects(10, popular.toSet)

        popular.map(_.link) mustBe popular.map(_.link).sortBy(link => (link.toLowerCase, link))
        random.take(7).map(_.link) mustBe random.take(7).map(_.link).sortBy(link => (link.toLowerCase, link))
        random.drop(7).map(_.link) mustBe random.drop(7).map(_.link).sortBy(link => (link.toLowerCase, link))
      }
    }
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

    "show unfiltered results before property filters" in {
      val result = route(app, FakeRequest(GET, "/projects/")).value

      status(result) mustBe OK
      val content         = contentAsString(result)
      content must not include "<summary>Quick filters</summary>"
      val technologyForms = formsIn(discoverySection(content, "Technologies"))
      technologyForms must not be empty
      technologyForms.foreach { form =>
        form must include("action=\"/projects/tech\"")
        form must include("name=\"tech\"")
      }
      discoverySection(content, "Characteristics") must include(
        "href=\"/projects/characteristic/type/"
      )
      val searchIndex     = content.indexOf("list-search")
      val resultsIndex    = content.indexOf("results-section")
      val filterIndex     = content.indexOf("filter-section")
      searchIndex must be >= 0
      resultsIndex must be >= 0
      filterIndex must be >= 0
      searchIndex must be < resultsIndex
      resultsIndex must be < filterIndex
    }

    "preserve technology context in property filters" in {
      val result = route(app, FakeRequest(GET, "/projects/tech?tech=scala&filter.live=require")).value

      status(result) mustBe OK
      val propertyFilterForm = formsIn(contentAsString(result))
        .find(_.contains("properties-filter-form"))
        .getOrElse(fail("Missing properties filter form"))
      propertyFilterForm must include("action=\"/projects/tech\"")
      propertyFilterForm must include("name=\"tech\" value=\"scala\"")
      propertyFilterForm must include("name=\"filter.live\" value=\"require\"")
    }

    "combine searches with property filters" in {
      val lookup             = app.injector.instanceOf[ProjectLookup]
      val searchTerm         = lookup.findAllTheProjects
        .flatMap(_.title.toLowerCase.split("\\W+"))
        .filter(_.length >= 3)
        .distinct
        .find { term =>
          val matches = lookup.findProjectsBySearch(term)
          matches.exists(_.isLive) && matches.exists(p => !p.isLive)
        }
        .getOrElse(fail("Expected a search term shared by live and non-live projects"))
      val searchMatches      = lookup.findProjectsBySearch(searchTerm)
      val expectedTitles     = searchMatches
        .filter(_.isLive)
        .sortBy(_.title.toLowerCase)
        .map(_.title)
      val encodedSearchTerm  = URLEncoder.encode(searchTerm, "UTF-8")
      val result             = route(
        app,
        FakeRequest(GET, s"/projects/search?searchterm=$encodedSearchTerm&filter.live=require")
      ).value

      expectedTitles must not be empty
      expectedTitles.size must be < searchMatches.size
      status(result) mustBe OK
      val content            = contentAsString(result)
      resultTitles(content) must contain theSameElementsInOrderAs expectedTitles
      val propertyFilterForm = formsIn(content)
        .find(_.contains("properties-filter-form"))
        .getOrElse(fail("Missing properties filter form"))
      propertyFilterForm must include("action=\"/projects/search\"")
      propertyFilterForm must include(s"name=\"searchterm\" value=\"$searchTerm\"")
      propertyFilterForm must include("name=\"filter.live\" value=\"require\"")
    }
  }
}
