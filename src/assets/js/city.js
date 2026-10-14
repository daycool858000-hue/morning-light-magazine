/* 城市資源索引：縣市選擇與服務類型篩選，全部在瀏覽器本機完成，不保存、不傳送任何選擇。 */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-finder]');
    if (!root) return;

    var countySelect = root.querySelector('#county');
    var typeSelect = root.querySelector('#service-type');
    var chips = Array.prototype.slice.call(root.querySelectorAll('.county-chip'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-res]'));
    var localList = document.getElementById('local-results');
    var nationalList = document.getElementById('national-results');
    var localEmpty = document.getElementById('local-empty');
    var nationalEmpty = document.getElementById('national-empty');
    var status = document.getElementById('finder-status');
    var localTitle = document.getElementById('local-title');

    // 將所有資源卡片依地區分到「在地」或「全國」兩區
    cards.forEach(function (card) {
      var regions = card.getAttribute('data-regions').split(' ');
      (regions.indexOf('national') >= 0 ? nationalList : localList).appendChild(card);
    });

    function update() {
      var county = countySelect.value;
      var type = typeSelect.value;
      var countyName = county ? countySelect.options[countySelect.selectedIndex].text : '';
      var localCount = 0;
      var nationalCount = 0;

      chips.forEach(function (chip) {
        chip.setAttribute('aria-pressed', chip.getAttribute('data-county') === county ? 'true' : 'false');
      });

      cards.forEach(function (card) {
        var regions = card.getAttribute('data-regions').split(' ');
        var types = card.getAttribute('data-types').split('|');
        var isNational = regions.indexOf('national') >= 0;
        var typeOk = !type || types.indexOf(type) >= 0;
        var regionOk = isNational || (county && regions.indexOf(county) >= 0);
        var show = typeOk && regionOk;
        card.hidden = !show;
        if (show) { if (isNational) nationalCount++; else localCount++; }
      });

      localTitle.textContent = county ? countyName + '的在地服務' : '在地服務';
      localEmpty.hidden = localCount > 0;
      localEmpty.querySelector('p').textContent = county
        ? countyName + '的在地服務據點正在查核中，查核完成後會陸續補上。你可以先參考下方的全國性資源。'
        : '請先在上方選擇縣市，就會顯示該縣市的在地服務。';
      nationalEmpty.hidden = nationalCount > 0;

      var parts = [];
      if (countyName) parts.push(countyName);
      if (type) parts.push(type);
      status.textContent = (parts.length ? '目前條件：' + parts.join('・') + '。' : '尚未選擇縣市。') +
        '在地 ' + localCount + ' 筆、全國性 ' + nationalCount + ' 筆。';
    }

    countySelect.addEventListener('change', update);
    typeSelect.addEventListener('change', update);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        countySelect.value = chip.getAttribute('data-county');
        update();
      });
    });

    // 從首頁縣市入口帶入的縣市（#county=xxx）。讀取後立即清除網址中的縣市。
    function applyHash() {
      var match = /county=([a-z-]+)/.exec(window.location.hash);
      if (!match) return;
      if (countySelect.querySelector('option[value="' + match[1] + '"]')) countySelect.value = match[1];
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      update();
    }
    window.addEventListener('hashchange', applyHash);
    applyHash();

    root.querySelector('.finder-js').hidden = false;
    update();
  });
})();
