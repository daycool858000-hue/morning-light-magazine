/* 學習與活動：依瀏覽當天日期隱藏已結束的活動。隱藏不代表活動取消。 */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-event-end]'));
    if (!items.length) return;
    var now = new Date();
    var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var visible = 0;
    items.forEach(function (item) {
      var ended = item.getAttribute('data-event-end') < today;
      item.hidden = ended;
      if (!ended) visible++;
    });
    var empty = document.getElementById('events-empty');
    if (empty) empty.hidden = visible > 0;
  });
})();
