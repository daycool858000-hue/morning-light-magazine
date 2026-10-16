/* QA 限定：全站小日曆「近期活動」。
   首次進站（任一頁）約 3 秒後柔和浮現一次；浮現後不自動消失，同一瀏覽分頁換頁時直接顯示、不再重等或重播動畫。
   只用 sessionStorage 記兩個不含個資的值（首次進站時間、是否已浮現），關閉分頁即清除；不用 Cookie、不追蹤、不傳送任何資料。
   沒有 JavaScript 時，小日曆直接顯示（見 main.css .act-entry）。
   避讓：小日曆固定在右下角；若捲動時有求助電話、有急事、切換畫面、搜尋框、表單或按鈕經過它的位置，就往上移到該元素上方，
   一般連結則只避開它的中央；上方都沒有空位時暫時縮成 44px 圖示按鈕。只改變 --cal-lift 與 is-compact，不改頁面版面。 */
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
  function fit(chip) {
    var r = chip.getBoundingClientRect();
    var h = r.height;
    var top0 = window.innerHeight - (parseFloat(getComputedStyle(chip).bottom) - lift) - h;
    var header = document.querySelector('.site-header');
    var minTop = (header ? Math.max(0, header.getBoundingClientRect().bottom) : 0) + 8;
    var boxes = [];
    var els = document.querySelectorAll(CRITICAL + ', ' + SOFT);
    for (var i = 0; i < els.length; i++) {
      if (chip.contains(els[i])) continue;
      var rects = els[i].getClientRects();
      var soft = !els[i].matches(CRITICAL);
      for (var k = 0; k < rects.length; k++) {
        var b = rects[k];
        if (!b.width || !b.height) continue;
        // 一般連結只要求中央點得到：只避開中央附近的小範圍
        if (soft) { var cx = b.left + b.width / 2, cy = b.top + b.height / 2; b = { left: cx - 4, right: cx + 4, top: cy - 4, bottom: cy + 4 }; }
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
    chip.classList.remove('is-compact');
    var next = fit(chip);
    if (next < 0) {
      // 右下角上方沒有空位（例如密集的縣市按鈕）：暫時縮成只有日曆圖示的 44px 小按鈕再試一次
      chip.classList.add('is-compact');
      next = fit(chip);
      if (next < 0) { chip.classList.remove('is-compact'); next = 0; }
    }
    lift = next;
    chip.style.setProperty('--cal-lift', lift + 'px');
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(place); } }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('input', schedule);
  document.addEventListener('click', schedule);
  document.addEventListener('DOMContentLoaded', schedule);
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
