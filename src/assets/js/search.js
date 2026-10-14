/* 站內搜尋：只在瀏覽器中比對本站資料，不保存搜尋文字、不放進網址、不傳送給任何第三方。 */
(function () {
  'use strict';

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/臺/g, '台')
      .replace(/[\s　]+/g, ' ')
      .trim();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var index = window.MLM_SEARCH_INDEX || [];
    var input = document.getElementById('q');
    var list = document.getElementById('search-results');
    var status = document.getElementById('search-status');
    var empty = document.getElementById('search-empty');
    var form = document.getElementById('search-form');
    if (!input || !list) return;

    document.querySelector('.search-js').hidden = false;
    index.forEach(function (item) { item._hay = normalize([item.title, item.text, item.keywords].join(' ')); });

    function render() {
      var query = normalize(input.value);
      list.innerHTML = '';
      if (!query) {
        status.textContent = '請輸入想查詢的主題、機構名稱、服務類型或縣市。';
        empty.hidden = true;
        return;
      }
      var terms = query.split(' ');
      var results = index.filter(function (item) {
        return terms.every(function (term) { return item._hay.indexOf(term) >= 0; });
      }).sort(function (a, b) {
        var at = normalize(a.title).indexOf(terms[0]) >= 0 ? 0 : 1;
        var bt = normalize(b.title).indexOf(terms[0]) >= 0 ? 0 : 1;
        return at - bt || a.order - b.order;
      }).slice(0, 50);

      results.forEach(function (item) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = item.url;
        var type = document.createElement('span');
        type.className = 'r-type';
        type.textContent = item.type;
        var title = document.createElement('span');
        title.className = 'r-title';
        title.textContent = item.title;
        var text = document.createElement('span');
        text.className = 'r-text';
        text.textContent = item.text;
        a.appendChild(type);
        a.appendChild(title);
        a.appendChild(text);
        li.appendChild(a);
        list.appendChild(li);
      });
      status.textContent = results.length ? '找到 ' + results.length + ' 筆結果。' : '找不到相符的內容。';
      empty.hidden = results.length > 0;
    }

    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(render, 120);
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      render();
    });
    render();
  });
})();
