/* 晨光生活誌 — 全站共用腳本（不使用任何外部套件、不保存任何資料） */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  // 切換畫面：在原分頁以 replace 前往指定網址，讓「上一頁」盡量不會回到本站。
  // 無法執行 JavaScript 時，按鈕本身就是一般連結，仍可前往同一網址。
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('[data-switch-screen]');
    if (!link) return;
    event.preventDefault();
    window.location.replace(link.getAttribute('href'));
  });

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  });
})();
