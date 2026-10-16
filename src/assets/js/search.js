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
    var clearButton = box.querySelector('[data-search-clear]');
    var limit = Number(box.getAttribute('data-search-limit')) || 50;
    // 在首頁輸入搜尋時切換成專注搜尋的畫面；清空後恢復六大分類。
    var onHome = Boolean(document.body.classList.contains('home') && box.closest('.hero'));
    var onSearchPage = Boolean(box.closest('.page-head') && document.querySelector('#browse-title'));
    box.classList.add('is-ready');

    function render() {
      var query = normalize(input.value);
      if (clearButton) clearButton.hidden = !query;
      if (onHome) document.body.classList.toggle('home-searching', Boolean(query));
      if (onSearchPage) document.body.classList.toggle('search-page-searching', Boolean(query));
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
    function queueRender() {
      clearTimeout(timer);
      // 清空時立即恢復首頁，無須等待延遲，也不讓前次搜尋計時器覆寫狀態。
      if (!normalize(input.value)) { render(); return; }
      timer = setTimeout(render, 120);
    }
    function renderNow() {
      clearTimeout(timer);
      render();
    }
    input.addEventListener('input', queueRender);
    // iPhone Safari 的原生搜尋欄叉叉可能觸發 search / change，未必觸發 input。
    function resetIfCleared() {
      // change 也會在點搜尋結果導致輸入框失焦時觸發。
      // 只處理變成空字串的情況，避免重繪結果把使用者正在點的連結移除。
      if (!normalize(input.value)) renderNow();
    }
    input.addEventListener('search', resetIfCleared);
    input.addEventListener('change', resetIfCleared);
    input.addEventListener('click', function () {
      // 補救部分 iOS Safari 只把內建清除按鈕的值清空，卻沒有立刻派發 input。
      setTimeout(function () {
        if (!normalize(input.value) && box.classList.contains('has-query')) renderNow();
      }, 0);
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      renderNow();
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { input.value = ''; renderNow(); }
    });
    if (clearButton) clearButton.addEventListener('click', function () {
      input.value = '';
      renderNow();
      input.focus();
    });
    window.addEventListener('pageshow', renderNow);
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var index = window.MLM_SEARCH_INDEX || [];
    index.forEach(function (item) { item._hay = normalize([item.title, item.text, item.keywords].join(' ')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-search]'), function (box) { setup(box, index); });
  });
})();
