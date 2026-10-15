/* 站內搜尋：只在瀏覽器中比對本站資料，不保存搜尋文字、不放進網址、不傳送給任何第三方。
   頁面上每個 [data-search] 區塊各自運作（首頁主視覺與搜尋頁）。 */
(function () {
  'use strict';

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/臺/g, '台')
      .replace(/[\s　]+/g, ' ')
      .trim();
  }

  function setup(box, index) {
    var input = box.querySelector('[data-search-input]');
    var form = box.querySelector('[data-search-form]');
    var list = box.querySelector('[data-search-results]');
    var status = box.querySelector('[data-search-status]');
    var empty = box.querySelector('[data-search-empty]');
    var limit = Number(box.getAttribute('data-search-limit')) || 50;
    // 在首頁輸入搜尋時切換成專注搜尋的畫面；清空後恢復六大分類。
    var onHome = Boolean(document.body.classList.contains('home') && box.closest('.hero'));
    box.classList.add('is-ready');

    function render() {
      var query = normalize(input.value);
      if (onHome) document.body.classList.toggle('home-searching', Boolean(query));
      list.innerHTML = '';
      if (!query) {
        status.textContent = '';
        empty.hidden = true;
        box.classList.remove('has-query');
        return;
      }
      box.classList.add('has-query');
      var terms = query.split(' ');
      var results = index.filter(function (item) {
        return terms.every(function (term) { return item._hay.indexOf(term) >= 0; });
      }).sort(function (a, b) {
        var at = normalize(a.title).indexOf(terms[0]) >= 0 ? 0 : 1;
        var bt = normalize(b.title).indexOf(terms[0]) >= 0 ? 0 : 1;
        return at - bt || a.order - b.order;
      });
      results.slice(0, limit).forEach(function (item) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = item.url;
        [['r-type', item.type], ['r-title', item.title], ['r-text', item.text]].forEach(function (part) {
          var span = document.createElement('span');
          span.className = part[0];
          span.textContent = part[1];
          a.appendChild(span);
        });
        li.appendChild(a);
        list.appendChild(li);
      });
      status.textContent = results.length
        ? '找到 ' + results.length + ' 筆結果' + (results.length > limit ? '，顯示前 ' + limit + ' 筆。' : '。')
        : '找不到相符的內容。';
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
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { input.value = ''; render(); }
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var index = window.MLM_SEARCH_INDEX || [];
    index.forEach(function (item) { item._hay = normalize([item.title, item.text, item.keywords].join(' ')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-search]'), function (box) { setup(box, index); });
  });
})();
