/* QA 限定：近期活動與講座頁。依臺灣日期（UTC+8）隱藏 visibleUntil 已過的活動，不必重新部署。
   隱藏不代表活動取消；原始查核資料仍保留在 docs/ 的 QA 資料檔。 */
(function () {
  'use strict';
  var today = new Date(Date.now() + 288e5).toISOString().slice(0, 10);
  var items = document.querySelectorAll('[data-act-until]');
  var visible = 0;
  for (var i = 0; i < items.length; i++) {
    var ended = items[i].getAttribute('data-act-until') < today;
    items[i].hidden = ended;
    if (!ended) visible++;
  }
  var empty = document.getElementById('notices-empty');
  if (empty) empty.hidden = visible > 0;
})();
