package tools

import java.io.File
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path, Paths}

import com.typesafe.config.{Config, ConfigFactory}
import models._
import play.api.libs.json._
import play.api.{Configuration, Environment}
import scala.jdk.CollectionConverters._

object StaticSiteExport extends App {

  private val outputDirectory = args.headOption.map(Paths.get(_)).getOrElse(Paths.get("static-site/data"))

  private val knownProjectFields        = Set(
    "title",
    "encoded",
    "description",
    "urls",
    "dates",
    "versions",
    "characteristics",
    "tags",
    "tech",
    "license",
    "news",
    "comments"
  )
  private val knownDateFields           = Set("created", "updated")
  private val knownVersionFields        = Set("dev", "live")
  private val knownCharacteristicFields = Set("appeal", "complexity", "likelihood", "status")
  private val knownStatusFields         = Set("development", "release", "deploy")
  private val knownNewsFields           = Set("date", "description")
  private val knownCommentFields        = Set("date", "comment")

  // Deliberately duplicated from the rendered model's accepted values. The raw inventory must
  // detect source/model drift instead of treating model parsing as the source of truth.
  private val knownAppeals      = Set("keen", "interested", "good", "maybe", "low", "none")
  private val knownComplexities =
    Set("verydifficult", "veryhigh", "difficult", "high", "hard", "medium", "average", "easy", "low")
  private val knownLikelihoods  = Set("high", "possibly", "maybe", "unlikely", "low", "slight", "never")
  private val knownDevelopmentStatuses =
    Set("abandoned", "cancelled", "mothballed", "alpha", "beta", "completed", "notstarted")
  private val knownReleaseStatuses     = Set("mature", "released", "beta", "notreleased", "mothballed")
  private val knownDeployStatuses      = Set("live", "demo", "online", "offline")

  private case class ValidationIssue(file: String, project: Int, path: String, value: String, message: String)

  private val validationIssues = configFiles.flatMap(validateFile)

  writeJson(
    outputDirectory.resolve("raw-validation.json"),
    Json.obj(
      "schemaVersion" -> 1,
      "issueCount"    -> validationIssues.size,
      "issues"        -> validationIssues.map(issueJson)
    )
  )

  private val projectLookup    =
    new ProjectRepostitory(Configuration(ConfigFactory.load()), Environment.simple())
  private val projects         = projectLookup.findAllTheProjects.sortBy(_.link.toLowerCase)
  private val newestProjects   = projectLookup.findNewestProjects(10)
  private val updatedProjects  = projectLookup.findUpdatedProjects(7, newestProjects)
  private val popularProjects  = projects.filter(_.isPopular).sortBy(_.link.toLowerCase).take(7)
  private val randomExclusions = (newestProjects ++ updatedProjects ++ popularProjects).map(_.link).toSet
  private val noJavaScriptRandomProjects = deterministicRandomFallback(projects, randomExclusions)

  private val projectsJson = Json.obj(
    "schemaVersion" -> 1,
    "projectCount"  -> projects.size,
    "home"          -> Json.obj(
      "newLinks"                   -> newestProjects.map(_.link),
      "updatedLinks"               -> updatedProjects.map(_.link),
      "popularLinks"               -> popularProjects.map(_.link),
      "newProjects"                -> newestProjects.map(projectJson),
      "updatedProjects"            -> updatedProjects.map(projectJson),
      "popularProjects"            -> popularProjects.map(projectJson),
      "tags"                       -> projectLookup.findTags(30).map(_.name),
      "technologies"               -> projectLookup.findTechnologies(30).map(_.name),
      "latestNews"                 -> projectLookup
        .findNews(26)
        .map(news =>
          Json.obj("date" -> news.dateFormatted, "project" -> news.project, "description" -> news.description)
        ),
      "randomExcludedLinks"        -> randomExclusions.toList.sorted,
      "noJavaScriptRandomProjects" -> noJavaScriptRandomProjects.map(projectJson)
    ),
    "oracle"        -> Json.obj(
      "searchDreamfactoryLiveTitles" -> projectLookup
        .findProjectsBySearch("dreamfactory")
        .filter(_.isLive)
        .sortBy(_.title.toLowerCase)
        .map(_.title),
      "scalaLiveTitles"              -> projectLookup
        .findProjectsByTech(Technology("scala"))
        .filter(_.isLive)
        .sortBy(_.title.toLowerCase)
        .map(_.title),
      "easyComplexityTitles"         -> projectLookup
        .findProjectsByCharacteristic(ProjectCharacteristics.Easy)
        .sortBy(_.title.toLowerCase)
        .map(_.title)
    ),
    "projects"      -> projects.map(projectJson)
  )

  writeJson(outputDirectory.resolve("projects.json"), projectsJson)
  writeJson(Paths.get("static-site/static/data/projects.json"), projectsJson)
  writeRedirects(Paths.get("static-site/static/_redirects"), projects)

  private val knownValidationIssues = Set(
    ("badusernames.conf", "characteristics.appeal", "high"),
    ("gauge.conf", "characteristics.appeal", "high"),
    ("consensus.conf", "characteristics.appeal", "somewhat"),
    ("shop.conf", "characteristics.status.release", "abandoned")
  )

  require(projects.size == 72, s"Expected 72 rendered projects, found ${projects.size}")
  require(
    knownValidationIssues.subsetOf(
      validationIssues.map(issue => (issue.file, issue.path, issue.value)).toSet
    ),
    "Raw validation did not report every known model/data discrepancy"
  )

  private def configFiles: List[File] =
    Option(new File("conf/dreams.d").listFiles).toList.flatten
      .filter(file => file.isFile && file.getName.endsWith(".conf"))
      .sortBy(_.getName)

  private def validateFile(file: File): List[ValidationIssue] = {
    val config = ConfigFactory.parseFile(file).resolve()
    config.getConfigList("dreams.projects").asScala.toList.zipWithIndex.flatMap { case (project, index) =>
      validateKeys(file, index, "project", project, knownProjectFields) ++
        validateKeys(file, index, "dates", optionalConfig(project, "dates"), knownDateFields) ++
        validateKeys(file, index, "versions", optionalConfig(project, "versions"), knownVersionFields) ++
        validateCharacteristics(file, index, optionalConfig(project, "characteristics")) ++
        validateEntries(file, index, "news", optionalConfigList(project, "news"), knownNewsFields) ++
        validateEntries(file, index, "comments", optionalConfigList(project, "comments"), knownCommentFields)
    }
  }

  private def validateCharacteristics(file: File, project: Int, characteristics: Option[Config]) =
    characteristics.toList.flatMap { config =>
      validateKeys(file, project, "characteristics", config, knownCharacteristicFields) ++
        validateKeys(
          file,
          project,
          "characteristics.status",
          optionalConfig(config, "status"),
          knownStatusFields
        ) ++
        validateValue(file, project, "characteristics.appeal", config, "appeal", knownAppeals) ++
        validateValue(file, project, "characteristics.complexity", config, "complexity", knownComplexities) ++
        validateValue(file, project, "characteristics.likelihood", config, "likelihood", knownLikelihoods) ++
        optionalConfig(config, "status").toList.flatMap { status =>
          validateValue(
            file,
            project,
            "characteristics.status.development",
            status,
            "development",
            knownDevelopmentStatuses
          ) ++
            validateValue(
              file,
              project,
              "characteristics.status.release",
              status,
              "release",
              knownReleaseStatuses
            ) ++
            validateValue(
              file,
              project,
              "characteristics.status.deploy",
              status,
              "deploy",
              knownDeployStatuses
            )
        }
    }

  private def validateEntries(
      file: File,
      project: Int,
      path: String,
      entries: List[Config],
      allowed: Set[String]
  ) = entries.flatMap(entry => validateKeys(file, project, path, entry, allowed))

  private def validateKeys(
      file: File,
      project: Int,
      path: String,
      config: Option[Config],
      allowed: Set[String]
  ): List[ValidationIssue] =
    config.toList.flatMap(validateKeys(file, project, path, _, allowed))

  private def validateKeys(
      file: File,
      project: Int,
      path: String,
      config: Config,
      allowed: Set[String]
  ): List[ValidationIssue] =
    config.root().keySet().toArray.toList.map(_.toString).filterNot(allowed).map { key =>
      ValidationIssue(file.getName, project, s"$path.$key", "", "Unknown field")
    }

  private def validateValue(
      file: File,
      project: Int,
      path: String,
      config: Config,
      key: String,
      allowed: Set[String]
  ): List[ValidationIssue] =
    Option
      .when(config.hasPath(key))(config.getString(key))
      .filterNot(value => allowed.contains(value.toLowerCase))
      .map { value =>
        ValidationIssue(file.getName, project, path, value, "Unsupported value")
      }
      .toList

  private def optionalConfig(config: Config, path: String): Option[Config] =
    Option.when(config.hasPath(path))(config.getConfig(path))

  private def optionalConfigList(config: Config, path: String): List[Config] =
    Option.when(config.hasPath(path))(config.getConfigList(path).asScala.toList).getOrElse(List.empty)

  private def projectJson(project: Project): JsObject = {
    val urlEntries = (List("project", "live").flatMap(key => project.urls.get(key).map(key -> _)) ++
      project.urls.others.keys.toList.flatMap(key => project.urls.get(key).map(key -> _))).map {
      case (key, url) =>
        Json.obj("key" -> key, "url" -> url.value.toString)
    }

    Json.obj(
      "title"       -> project.title,
      "encoded"     -> project.encoded,
      "link"        -> project.link,
      "pathSegment" -> encodePathSegment(project.link),
      "aliases"     -> Seq(project.link, project.title).distinct,
      "description" -> project.description,
      "urls" -> JsObject(project.urls.values.map { case (key, url) => key -> JsString(url.value.toString) }),
      "urlEntries"   -> urlEntries,
      "dates"        -> Json.obj("created" -> project.dates.created, "updated" -> project.dates.updated),
      "versions"     -> Json.obj("dev" -> project.versions.dev, "live" -> project.versions.live),
      "tags"         -> project.tags.toList.map(_.name).sorted,
      "technologies" -> project.tech.toList.map(_.name).sorted,
      "license" -> project.license.map(license => Json.obj("name" -> license.name, "link" -> license.link)),
      "characteristics" -> Json.obj(
        "appeal"      -> project.characteristics.appeal.map(_.name),
        "complexity"  -> project.characteristics.complexity.map(_.name),
        "likelihood"  -> project.characteristics.likelihood.map(_.name),
        "development" -> project.characteristics.developmentStatus.map(_.name),
        "release"     -> project.characteristics.releaseStatus.map(_.name),
        "deploy"      -> project.characteristics.deployStatus.map(_.name)
      ),
      "news"            -> project.news.map(news =>
        Json.obj("date" -> news.date.toString, "description" -> news.description)
      ),
      "comments"        -> project.comments.map(comment =>
        Json.obj("date" -> comment.date.toString, "comment" -> comment.comment)
      ),
      "derived"         -> Json.obj(
        "live"       -> project.isLive,
        "idea"       -> project.isAnIdea,
        "popular"    -> project.isPopular,
        "code"       -> project.hasCodeAvailable,
        "mobile"     -> project.isApp,
        "commercial" -> project.isCommercial,
        "dead"       -> project.isDead,
        "stale"      -> project.isStaleNotDead,
        "updated"    -> project.isRecentlyUpdatedNotAdded,
        "recent"     -> project.isRecentlyAdded,
        "unlikely"   -> (project.isUnlikely || project.isUnappealing)
      )
    )
  }

  private def deterministicRandomFallback(
      projects: List[Project],
      excludedLinks: Set[String]
  ): List[Project] = {
    val candidates = projects.filterNot(project => excludedLinks.contains(project.link))
    val healthy    = candidates.filter(project =>
      !project.isDead && !project.isUnlikely && !project.isUnappealing && !project.isStale
    )
    val preferred  = healthy.sortBy(_.link.toLowerCase).take(7)
    val remaining  = candidates
      .filterNot(project => preferred.contains(project))
      .sortBy(_.link.toLowerCase)
      .take(10 - preferred.size)
    preferred ++ remaining
  }

  private def writeRedirects(path: Path, projects: List[Project]): Unit = {
    val redirects = projects
      .flatMap { project =>
        val canonical = projectPath(project.link)
        val aliases   = Seq(project.title, project.title.toLowerCase, project.link.toLowerCase).distinct
          .map(projectPath)
          .filterNot(_ == canonical)
        aliases.flatMap { alias =>
          List(
            s"$alias $canonical 301",
            s"$alias/help $canonical/help 301",
            s"$alias/sponsor $canonical/sponsor 301"
          )
        }
      }
      .distinct
      .sorted
    Files.createDirectories(path.getParent)
    Files.write(path, redirects.mkString("\n", "\n", "").getBytes(StandardCharsets.UTF_8))
    println(s"Wrote $path with ${redirects.size} aliases")
  }

  private def projectPath(segment: String): String = "/project/" + encodePathSegment(segment)

  private def encodePathSegment(segment: String): String =
    URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20")

  private def issueJson(issue: ValidationIssue): JsObject =
    Json.obj(
      "file"    -> issue.file,
      "project" -> issue.project,
      "path"    -> issue.path,
      "value"   -> issue.value,
      "message" -> issue.message
    )

  private def writeJson(path: Path, json: JsValue): Unit = {
    Files.createDirectories(path.getParent)
    Files.write(path, Json.prettyPrint(json).getBytes(StandardCharsets.UTF_8))
    println(s"Wrote $path")
  }
}
