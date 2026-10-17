/* QA 限定：全站小日曆「近期活動」。
   首次進站（任一頁）約 3 秒後柔和浮現一次；浮現後不自動消失，同一瀏覽分頁換頁時直接顯示、不再重等或重播動畫。
   只用 sessionStorage 記兩個不含個資的值（首次進站時間、是否已浮現），關閉分頁即清除；不用 Cookie、不追蹤、不傳送任何資料。
   沒有 JavaScript 時，小日曆直接顯示（見 main.css .act-entry）。
   避讓：小日曆固定在右下角；若有求助電話、有急事、切換畫面、搜尋框、表單或按鈕在它的位置，就往上移到該元素上方；
   一般連結（官方連結、文章標題、搜尋結果等）避開連結文字實際所在的每一行，較長的連結延伸到右側時也不會被蓋住。
   上方都沒有空位時先暫時縮成 44px 圖示按鈕；仍沒有空位才退回只避開連結中央。
   捲動進行中不移動，停下約 0.12 秒後才一次調整到位，避免邊捲邊跳動。只改變 --cal-lift 與 is-compact，不改頁面版面。 */
(function () {
  'use strict';
  var root = document.documentElement;
  var DELAY = 3000;
  var KEY_START = 'yj-cal-start';
  var KEY_SHOWN = 'yj-cal-shown';
  function get(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* 無法保存時，每頁各自延遲 3 秒 */ } }

  var CRITICAL = 'input, select, textarea, button, a[href^="tel:"], a[href^="sms:"], .quick-urgent, [data-switch-screen], .search-form, .support-entry, .skip-link:focus';
  var SOFT = 'a[href], label[for], summary';
  var lift = 0;
  var queued = false;
  var settle = 0;
  var SETTLE_MS = 120;
  // 一般連結的文字實際占用的每一行（不含行尾空白，並裁到連結本身範圍內，超出被省略號截掉的文字不算）；
  // 沒有文字（例如圖示連結）時退回中央小範圍
  function textBoxes(el, whole) {
    var out = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var range = document.createRange();
    for (var n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!/\S/.test(n.nodeValue)) continue;
      range.selectNodeContents(n);
      var rs = range.getClientRects();
      for (var i = 0; i < rs.length; i++) {
        var b = { left: Math.max(rs[i].left, whole.left), right: Math.min(rs[i].right, whole.right), top: Math.max(rs[i].top, whole.top), bottom: Math.min(rs[i].bottom, whole.bottom) };
        if (b.right > b.left && b.bottom > b.top) { b.width = b.right - b.left; b.height = b.bottom - b.top; out.push(b); }
      }
    }
    return out;
  }
  function centerBox(b) { var cx = b.left + b.width / 2, cy = b.top + b.height / 2; return { left: cx - 4, right: cx + 4, top: cy - 4, bottom: cy + 4 }; }
  function fit(chip, strict) {
    var r = chip.getBoundingClientRect();
    var h = r.height;
    var top0 = window.innerHeight - (parseFloat(getComputedStyle(chip).bottom) - lift) - h;
    var header = document.querySelector('.site-header');
    var minTop = (header ? Math.max(0, header.getBoundingClientRect().bottom) : 0) + 8;
    var boxes = [];
    var els = document.querySelectorAll(CRITICAL + ', ' + SOFT);
    for (var i = 0; i < els.length; i++) {
      if (chip.contains(els[i])) continue;
      var whole = els[i].getBoundingClientRect();
      // 不在小日曆那一欄（左右 6px 內）或不在可視範圍的元素先略過
      if (!whole.width || !whole.height || whole.right <= r.left - 6 || whole.left >= r.right + 6 || whole.bottom <= minTop || whole.top >= window.innerHeight) continue;
      var soft = !els[i].matches(CRITICAL);
      var rects = soft && strict ? textBoxes(els[i], whole) : [];
      // 退回模式或沒有文字的連結：只要求中央點得到
      var center = soft && !rects.length;
      if (!rects.length) rects = els[i].getClientRects();
      for (var k = 0; k < rects.length; k++) {
        var b = rects[k];
        if (!b.width || !b.height) continue;
        if (center) b = centerBox(b);
        if (b.right > r.left - 6 && b.left < r.right + 6 && b.bottom > minTop && b.top < window.innerHeight) boxes.push(b);
      }
    }
    var top = top0;
    for (var guard = 0, moved = true; moved && guard < 40; guard++) {
      moved = false;
      for (var j = 0; j < boxes.length; j++) {
        if (boxes[j].top < top + h + 6 && boxes[j].bottom > top - 6) { top = boxes[j].top - h - 8; moved = true; }
      }
    }
    return top >= minTop ? Math.max(0, Math.round(top0 - top)) : -1;
  }
  function place() {
    queued = false;
    var chip = document.querySelector('.act-entry');
    if (!chip) return;
    // 依序嘗試：完整避開連結文字 → 縮成 44px 圖示再避開 → 只避開連結中央 → 縮小後只避開中央
    // （右下角上方沒有空位，例如密集的縣市按鈕或長串來源連結時，才會用到後面的退回方式）
    var tries = [[false, true], [true, true], [false, false], [true, false]];
    var next = -1;
    for (var t = 0; t < tries.length && next < 0; t++) {
      chip.classList.toggle('is-compact', tries[t][0]);
      next = fit(chip, tries[t][1]);
    }
    if (next < 0) { chip.classList.remove('is-compact'); next = 0; }
    lift = next;
    chip.style.setProperty('--cal-lift', lift + 'px');
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(place); } }
  // 捲動中不移動：停下後才一次調整，避免邊捲邊跳
  function scrolled() { clearTimeout(settle); settle = setTimeout(schedule, SETTLE_MS); }
  window.addEventListener('scroll', scrolled, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('input', schedule);
  document.addEventListener('click', schedule);
  document.addEventListener('DOMContentLoaded', function () {
    schedule();
    // 搜尋結果、展開收合等讓頁面高度改變時也重新檢查（本檔在 <head> 載入，body 要等 DOMContentLoaded）
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
  });
  window.addEventListener('load', schedule);

  if (get(KEY_SHOWN) === '1') { root.classList.add('cal-seen'); return; }

  var now = Date.now();
  var start = Number(get(KEY_START));
  if (!start || start > now) {
    start = Math.round(now - (window.performance && performance.now ? performance.now() : 0)); // 以本頁開始載入的時間起算
    set(KEY_START, String(start));
  }

  function reveal() {
    // 等日曆以隱藏狀態畫過一次，再加上 class，進場過渡才會播放
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      place();
      root.classList.add('cal-on');
      set(KEY_SHOWN, '1');
    }); });
  }
  setTimeout(function () {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal);
    else reveal();
  }, Math.max(0, start + DELAY - now));
})();
