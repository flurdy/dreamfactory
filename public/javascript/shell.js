(function () {
   var mobileNews = window.matchMedia('(max-width: 1000px)');
   var newsbar = document.querySelector('#nautical-deck .newsbar');

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
