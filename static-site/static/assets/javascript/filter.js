document.querySelectorAll('.properties-filter-form').forEach(function (form) {
   form.addEventListener('submit', function () {
      form.querySelectorAll('.property-filter-any:checked').forEach(function (filter) {
         filter.disabled = true;
      });
   });
});

function resetFilter(form) {
   var filters = form.querySelectorAll('[name^="filter."]');

   filters.forEach(function (filter) {
      filter.disabled = true;
   });

   form.submit();
}
