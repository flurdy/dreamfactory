(function () {
   var results = document.getElementById('catalog-results');
   var count = document.getElementById('catalog-count');

   if (!results || !count) {
      return;
   }

   var query = new URLSearchParams(window.location.search);
   var path = window.location.pathname.replace(/\/+$/, '') || '/';
   var filterNames = ['popular', 'dead', 'unlikely', 'recent', 'updated', 'stale', 'live', 'idea', 'code', 'mobile', 'commercial'];

   function renderContext() {
      var heading = document.getElementById('catalog-heading');
      var search = document.getElementById('catalog-search');
      var searchTerm = query.get('searchterm');
      if (searchTerm) {
         search.value = searchTerm;
      }
      if (path === '/projects/search' && searchTerm) {
         heading.textContent = 'Projects containing “' + searchTerm + '”';
      } else if (path === '/projects/tech' && query.get('tech')) {
         heading.textContent = 'Projects with technology: ' + query.get('tech');
      } else if (path === '/projects/tag' && query.get('tag')) {
         heading.textContent = 'Projects with tag: ' + query.get('tag');
      } else if (path.indexOf('/projects/characteristic/') === 0) {
         var segments = path.split('/');
         heading.textContent = 'Projects with ' + segments[4] + ': ' + segments[6];
      }
   }

   function matchesPropertyFilters(project) {
      return filterNames.every(function (name) {
         var value = query.get('filter.' + name);
         if (!value) {
            return true;
         }
         var property = project.derived[name];
         return value === 'require' ? property : value !== 'exclude' || !property;
      });
   }

   function matchesRoute(project) {
      var searchTerm = query.get('searchterm');
      if (path === '/projects/search' && searchTerm) {
         return project.title.toLowerCase().indexOf(searchTerm) !== -1 || (project.description || '').toLowerCase().indexOf(searchTerm) !== -1;
      }
      if (path === '/projects/tag') {
         return !query.get('tag') || project.tags.indexOf(query.get('tag').toLowerCase()) !== -1;
      }
      if (path === '/projects/tech') {
         return !query.get('tech') || project.technologies.indexOf(query.get('tech').toLowerCase()) !== -1;
      }
      if (path.indexOf('/projects/characteristic/') === 0) {
         var segments = path.split('/');
         var characteristicType = segments[4];
         var characteristicValue = segments[6];
         var field = {
            appeal: 'appeal',
            complexity: 'complexity',
            likelihood: 'likelihood',
            'status.development': 'development',
            'status.release': 'release',
            'status.deploy': 'deploy'
         }[characteristicType];
         return !field || project.characteristics[field] === characteristicValue;
      }
      return true;
   }

   function escapeHtml(value) {
      return String(value).replace(/[&<>'"]/g, function (character) {
         return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
      });
   }

   function render(projects) {
      results.innerHTML = projects.map(function (project) {
         return '<li class="project-summary project-result"><a class="project-summary-title" href="/project/' + project.pathSegment + '">' + escapeHtml(project.title) + '</a></li>';
      }).join('');
      count.textContent = projects.length + (projects.length === 1 ? ' project' : ' projects');
      if (window.location.search) {
         document.getElementById('catalog-results-heading').focus();
      }
   }

   renderContext();

   fetch('/data/projects.json')
      .then(function (response) { return response.json(); })
      .then(function (catalog) {
         render(catalog.projects.filter(function (project) {
            return matchesRoute(project) && matchesPropertyFilters(project);
         }).sort(function (left, right) { return left.title.localeCompare(right.title); }));
      })
      .catch(function () {
         count.textContent = 'Unable to load the project catalog.';
      });
}());
