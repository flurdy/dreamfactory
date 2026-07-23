(function () {
   var themeKey = 'df-theme';
   var root = document.documentElement;
   var toggle = document.querySelector('[data-theme-toggle]');
   var mobileNews = window.matchMedia('(max-width: 1000px)');
   var desktopDiscovery = window.matchMedia('(min-width: 701px)');
   var newsbar = document.querySelector('#nautical-deck .newsbar--mobile');
   var homeDiscovery = document.querySelectorAll('.home-discovery');

   function themeLabel(theme) {
      return theme === 'dark' ? 'Light mode' : 'Dark mode';
   }

   function setTheme(theme, persist) {
      root.dataset.theme = theme;
      if (persist) {
         try {
            window.localStorage.setItem(themeKey, theme);
         } catch (error) {
            // Continue without persistence when storage is unavailable.
         }
      }
      if (toggle) {
         var label = themeLabel(theme);
         toggle.setAttribute('aria-pressed', String(theme === 'dark'));
         toggle.setAttribute('title', label);
         toggle.querySelector('[data-theme-label]').textContent = label;
      }
   }

   function setHomeDiscoveryState(mediaQuery) {
      homeDiscovery.forEach(function (section) {
         section.open = mediaQuery.matches;
      });
   }

   function setNewsbarState(mediaQuery) {
      if (newsbar) {
         newsbar.open = !mediaQuery.matches;
      }
   }

   if (toggle) {
      setTheme(root.dataset.theme || 'light', false);
      toggle.addEventListener('click', function () {
         setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
      });
   }

   setHomeDiscoveryState(desktopDiscovery);
   setNewsbarState(mobileNews);

   if (desktopDiscovery.addEventListener) {
      desktopDiscovery.addEventListener('change', setHomeDiscoveryState);
      mobileNews.addEventListener('change', setNewsbarState);
   } else {
      desktopDiscovery.addListener(setHomeDiscoveryState);
      mobileNews.addListener(setNewsbarState);
   }
})();
