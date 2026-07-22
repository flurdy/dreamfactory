(function () {
   var themeKey = 'df-theme';
   var root = document.documentElement;
   var toggle = document.querySelector('[data-theme-toggle]');
   var mobileNews = window.matchMedia('(max-width: 1000px)');
   var newsbar = document.querySelector('#nautical-deck .newsbar');

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
         toggle.setAttribute('aria-pressed', String(theme === 'dark'));
         toggle.querySelector('[data-theme-label]').textContent = themeLabel(theme);
      }
   }

   if (toggle) {
      setTheme(root.dataset.theme || 'light', false);
      toggle.addEventListener('click', function () {
         setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
      });
   }

   if (!newsbar) {
      return;
   }

   function setNewsbarState(mediaQuery) {
      newsbar.open = !mediaQuery.matches;
   }

   setNewsbarState(mobileNews);

   if (mobileNews.addEventListener) {
      mobileNews.addEventListener('change', setNewsbarState);
   } else {
      mobileNews.addListener(setNewsbarState);
   }
})();
