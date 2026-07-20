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

   function render(projects) {
      container.innerHTML = projects.map(function (project) {
         var liveUrl = project.urls.live ? '<a class="project-summary-url" href="' + escapeHtml(project.urls.live) + '">' + escapeHtml(project.urls.live) + '</a>' : '';
         return '<li class="project-summary project-result"><a class="project-summary-title" href="/project/' + project.pathSegment + '">' + escapeHtml(project.title) + '</a>' + liveUrl + '</li>';
      }).join('');
      container.setAttribute('data-randomized', 'true');
   }

   fetch(container.getAttribute('data-catalog'))
      .then(function (response) { return response.json(); })
      .then(function (catalog) { render(selectRandomProjects(catalog)); })
      .catch(function () { container.setAttribute('data-randomized', 'failed'); });
}());
