# Dream Factory - Agent Extension Guide

This guide helps AI agents and developers understand and extend the Dream Factory application - a project idea management system built with Scala and Play Framework.

## 🏗️ Application Overview

Dream Factory is a web application for cataloging and organizing project ideas, from initial concept to release. It's currently running live at [code.flurdy.com](https://code.flurdy.com).

### Tech Stack

- **Backend**: Scala 2.13, Play Framework
- **Frontend**: Bootstrap 3, jQuery, HTML/CSS
- **Configuration**: HOCON format
- **Build Tool**: SBT
- **Deployment**: Docker support

## 📁 Project Structure

```text
dreamfactory/
├── app/
│   ├── controllers/          # HTTP request handlers
│   ├── models/               # Data models and business logic
│   └── views/                # HTML templates (Scala templates)
├── conf/
│   ├── application.conf      # Main app configuration
│   ├── routes               # URL routing
│   └── dreams.d/            # Individual project configurations
├── public/                  # Static assets (CSS, JS, images)
└── project/                 # SBT build configuration
```

## 🧩 Core Components

### 1. Data Models (`app/models/`)

#### Project (`Project.scala`)

The main entity representing a project idea:

```scala
case class Project(
  title: String,
  encoded: Option[String],         // URL-safe slug
  description: Option[String],
  urls: Urls,                     // Live/project URLs
  dates: ProjectDates,            // Created/updated dates
  versions: Versions,             // Development/live versions
  news: List[News],               // Project updates
  comments: List[Comment],        // Additional notes
  tags: Set[Tag],                 // Categorization tags
  tech: Set[Technology],          // Technology stack
  license: Option[License],       // Software license
  characteristics: ProjectCharacteristics  // Project metadata
)
```

#### ProjectCharacteristics (`ProjectCharacteristics.scala`)

Defines project metadata with enums:

```scala
case class ProjectCharacteristics(
  appeal: Option[Appeal],           // keen, interested, maybe, low
  complexity: Option[Complexity],   // low, medium, high
  likelihood: Option[Likelihood],   // high, maybe, possibly, unlikely, low
  developmentStatus: Option[DevelopmentStatus],  // alpha, beta, completed, abandoned, etc.
  releaseStatus: Option[ReleaseStatus],         // released, mature, notreleased, mothballed
  deployStatus: Option[DeployStatus]            // live, online, offline
)
```

### 2. Controllers (`app/controllers/`)

#### ProjectController (`ProjectController.scala`)

- **`showProject(projectName)`** - Display individual project details
- **`findAllProjects()`** - List all projects with filtering
- **`findProjectsByCharacteristic(type, value)`** - Filter by characteristics
- **`findProjectsByTag(tag)`** - Filter by tags
- **`findProjectsByTech(tech)`** - Filter by technology

#### HomeController (`HomeController.scala`)

- **`index()`** - Main dashboard with project categories

### 3. Configuration System (`conf/dreams.d/`)

Projects are defined in HOCON files with this structure:

```hocon
dreams {
    projects = [
        {
            title = "Project Name"
            encoded = "project-slug"
            description = "Project description..."
            dates = {
                created = "2021-06"
                updated = "2021-06"
            }
            characteristics = {
                appeal = interested
                complexity = low
                likelihood = maybe
                status {
                    development = alpha
                    release = notreleased
                    deploy = offline
                }
            }
            tags = ["tag1", "tag2", "idea"]
            tech = ["scala", "javascript", "docker"]
            urls = {
                live = "https://example.com"
                project = "https://github.com/user/repo"
            }
            news = [
                {
                    date = "2021-06-08"
                    description = "Project milestone"
                }
            ]
        }
    ]
}
```

## 🎯 Common Extension Patterns

### Adding New Projects

1. **Create new configuration file**: `conf/dreams.d/newproject.conf`
2. **Follow the HOCON structure** above
3. **Use valid enum values** for characteristics (see lists below)
4. **Restart application** to load new configuration

### Adding New Characteristics

1. **Extend enums** in `ProjectCharacteristics.scala`:

   ```scala
   sealed abstract class NewCharacteristic(val name: String) extends Characteristic
   case object NewValue extends NewCharacteristic("newvalue")
   ```

2. **Update case class**:

   ```scala
   case class ProjectCharacteristics(
     // ... existing fields ...
     newCharacteristic: Option[NewCharacteristic]
   )
   ```

3. **Add message keys** in `conf/messages`:

   ```properties
   project.characteristics.newcharacteristic=New Characteristic
   project.characteristics.newcharacteristic.newvalue=New Value
   ```

### Adding New Views

1. **Create template** in `app/views/project/` (Scala templates)
2. **Add controller method** in `ProjectController`
3. **Update routes** in `conf/routes`

## 📊 Valid Enum Values

### Appeal

- `keen`, `interested`, `maybe`, `somewhat`, `low`, `high`

### Complexity

- `low`, `medium`, `high`

### Likelihood

- `high`, `maybe`, `possibly`, `unlikely`, `low`

### Development Status

- `alpha`, `beta`, `completed`, `abandoned`, `notstarted`, `mothballed`

### Release Status

- `released`, `mature`, `notreleased`, `mothballed`

### Deploy Status

- `live`, `online`, `offline`

### Common Tags

- `idea`, `popular`, `commercial`, `mobile`, `API`, `service`, etc.

### Technology Examples

- **Languages**: `scala`, `javascript`, `rust`, `go`, `java`, `kotlin`, `haskell`
- **Frameworks**: `play`, `spring`, `akka`, `NestJS`, `HTMX`, `react`
- **Infrastructure**: `docker`, `kubernetes`, `heroku`, `postgres`, `mongodb`

## 🔧 Development Workflow

### Local Development

```bash
# Start application
sbt run

# Access at http://localhost:9000

# Auto-reload on changes (Play Framework feature)
# No restart needed for view/controller changes
# Restart needed for model changes or new config files
```

### Docker Development

```bash
# Build image
docker build -t dreamfactory .

# Run container
docker run -ti --rm -p 9000:9000 dreamfactory
```

## 🎨 Customization Points

### Branding

- **Main layout**: `app/views/main.scala.html`
- **Navigation**: `app/views/bridge.scala.html`
- **Footer**: `app/views/bow.scala.html`
- **Styles**: `public/stylesheets/`

### Messages & Labels

- **Internationalization**: `conf/messages`
- **All UI text** can be customized here

### Filtering & Search

- **Project filtering**: `ProjectController.filterProject()`
- **Characteristics filtering**: Built-in support
- **Custom filters**: Extend `ProjectFilters` case class

## 🔍 Key Files for Agents

When extending the application, focus on these files:

1. **`app/models/Project.scala`** - Main data model
2. **`app/models/ProjectCharacteristics.scala`** - Metadata enums
3. **`app/models/ProjectLookup.scala`** - Configuration loading
4. **`app/controllers/ProjectController.scala`** - Request handling
5. **`conf/dreams.d/*.conf`** - Project data
6. **`conf/routes`** - URL routing
7. **`conf/messages`** - UI text

## 🚀 Extension Ideas

- **REST API**: Add JSON endpoints for project data
- **Import/Export**: Bulk project management
- **Search**: Full-text search across projects
- **Analytics**: Project statistics and trends
- **Collaboration**: Multi-user support
- **Integration**: GitHub/GitLab project sync
- **Mobile**: Responsive design improvements
- **Database**: Replace file-based config with database

## 📝 Notes for AI Agents

- **Configuration changes** require application restart
- **View/controller changes** hot-reload automatically
- **Use consistent naming** for encoded project slugs
- **Follow HOCON syntax** exactly in config files
- **Enum values are case-sensitive**
- **File-based approach** makes bulk operations via scripts feasible
- **Bootstrap 3 classes** for styling consistency

This application is designed to be extended and customized. The clear separation between configuration (HOCON files) and code (Scala/Play) makes it easy to add new projects or modify existing ones programmatically.
