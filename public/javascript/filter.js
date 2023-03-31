$('#nautical-cargo .properties-filter label').on('mouseup', function (e) {
   var radioId = $(this).attr('for');
   var radio = $("#" + radioId);
   if (radio.is(':checked')) {
      radio.prop('checked', false);
   } else {
      radio.prop('checked', true);
   }
   $('#nautical-cargo #filter-accordion form').submit();
});

// Disable default behavior
$('#nautical-cargo .properties-filter label').click(function (e) {
   e.preventDefault();
});

function resetFilter(form) {
   $('#nautical-cargo .properties-filter input[type="radio"]').attr('checked', false);
   $('#nautical-cargo #filter-accordion form').submit();
}
