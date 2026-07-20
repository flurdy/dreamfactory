(function () {
   var container = document.getElementById('random-projects');

   if (!container) {
      return;
   }

   var random = window.__dreamFactoryRandom || Math.random;

   function shuffle(items) {
      var result = items.slice();
      for (var index = result.length - 1; index > 0; index -= 1) {
         var nextIndex = Math.floor(random() * (index + 1));
         var next = result[index];
         result[index] = result[nextIndex];
         result[nextIndex] = next;
      }
      return result;
   }

   function selectRandomProjects(catalog) {
      var excludedLinks = catalog.home.randomExcludedLinks;
      var projects = catalog.projects.filter(function (project) {
         return excludedLinks.indexOf(project.link) === -1;
      });
      var healthy = projects.filter(function (project) {
         return !project.derived.dead && !project.derived.unlikely && !project.derived.stale;
      });
      var healthySize = 7;
      var preferred = shuffle(healthy).slice(0, healthySize);
      var preferredLinks = preferred.map(function (project) { return project.link; });
      var remaining = shuffle(projects.filter(function (project) {
         return preferredLinks.indexOf(project.link) === -1;
      })).slice(0, 10 - preferred.length);
      return preferred.concat(remaining);
   }

   function escapeHtml(value) {
      return String(value).replace(/[&<>'"]/g, function (character) {
         return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
      });
   }

   function visibleTitle(value) {
      var decoder = document.createElement('textarea');
      decoder.innerHTML = value;
      return decoder.value;
   }

   var statusDefinitions = [
      ['popular', 'far fa-star', 'Popular'],
      ['dead', 'fas fa-cross', 'Mothballed'],
      ['unlikely', 'far fa-frown', 'Unlikely'],
      ['recent', 'fas fa-plus-circle', 'Recently added'],
      ['updated', 'fas fa-seedling', 'Recently updated'],
      ['stale', 'fas fa-hourglass-half', 'Stale'],
      ['live', 'fas fa-heartbeat', 'Live'],
      ['idea', 'far fa-lightbulb', 'Idea'],
      ['code', 'fas fa-code', 'Code available'],
      ['mobile', 'fas fa-mobile-alt', 'Mobile'],
      ['commercial', 'fas fa-dollar-sign', 'Commercial']
   ];

   function renderSummaryUrl(project) {
      var summary = project.summaryUrl;
      if (summary.kind === 'live') {
         return '<a class="project-summary-url" href="' + escapeHtml(summary.href) + '">' + escapeHtml(summary.text) + '</a>';
      }
      if (summary.kind === 'project') {
         return '<a class="project-summary-url link-project" href="' + escapeHtml(summary.href) + '">' + escapeHtml(summary.text) + '</a>';
      }
      if (summary.kind === 'not-live') {
         return '<span class="project-summary-url link-notlive">' + escapeHtml(summary.text) + '</span>';
      }
      return '<span class="project-summary-url" aria-hidden="true"></span>';
   }

   function renderStatuses(project) {
      var statuses = statusDefinitions.filter(function (definition) {
         return project.derived[definition[0]];
      }).map(function (definition) {
         return '<li class="project-status"><i class="' + definition[1] + '" aria-hidden="true"></i><span class="project-status-label">' + definition[2] + '</span></li>';
      });
      return statuses.length ? '<ul class="project-statuses project-statuses--compact" aria-label="Project status">' + statuses.join('') + '</ul>' : '';
   }

   function render(projects) {
      container.innerHTML = projects.map(function (project) {
         var muted = project.derived.dead || project.derived.stale || project.derived.unlikely ? ' project-summary--muted' : '';
         return '<li class="project-summary' + muted + '"><a class="project-summary-title" href="/project/' + project.pathSegment + '">' + escapeHtml(visibleTitle(project.title)) + '</a>' + renderSummaryUrl(project) + renderStatuses(project) + '</li>';
      }).join('');
      container.setAttribute('data-randomized', 'true');
   }

   fetch(container.getAttribute('data-catalog'))
      .then(function (response) { return response.json(); })
      .then(function (catalog) { render(selectRandomProjects(catalog)); })
      .catch(function () { container.setAttribute('data-randomized', 'failed'); });
}());
