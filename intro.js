/* ============================================
   Кинематографическая вступительная анимация
   Только на index.html. Показывается один раз
   (localStorage). Canvas (небо/звёзды/солнце) +
   SVG (силуэт Эльбруса) поверх.
   Таймлайн на performance.now(), 4 фазы, ~5 c.
   ============================================ */
(function () {
  "use strict";

  var KEY = "elbrus_intro_seen";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function start() {
    // не показываем повторно и при reduced-motion
    if (reduced) return;
    try { if (localStorage.getItem(KEY)) return; } catch (e) {}

    buildOverlay();
  }

  // ---------- утилиты цвета ----------
  function hex(c) {
    c = c.replace("#", "");
    return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) {
    var a = hex(c1), b = hex(c2);
    return "rgb(" + Math.round(lerp(a[0], b[0], t)) + "," + Math.round(lerp(a[1], b[1], t)) + "," + Math.round(lerp(a[2], b[2], t)) + ")";
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function invlerp(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }

  // 5 опорных стопов градиента неба: [верх, верх-середина, пояс, у-горизонта, горизонт]
  var SKY = {
    night:   ["#0A1020", "#0C1424", "#0D1520", "#0A121F", "#060D18"],
    dawn:    ["#0A1020", "#0C1830", "#241026", "#3a1208", "#3D1505"],
    sunrise: ["#0A1020", "#1A2845", "#6B2D8A", "#C44A1A", "#E8622A"]
  };

  function skyStop(i, p) {
    // p: 0 ночь .. 0.5 рассвет .. 1 восход
    if (p <= 0.5) return mix(SKY.night[i], SKY.dawn[i], smooth(p / 0.5));
    return mix(SKY.dawn[i], SKY.sunrise[i], smooth((p - 0.5) / 0.5));
  }

  function buildOverlay() {
    var intro = document.createElement("div");
    intro.id = "intro";
    intro.className = "phase-night";
    intro.innerHTML =
      '<canvas></canvas>' +
      '<div class="intro-mtn" aria-hidden="true">' + mountainSVG() + '</div>' +
      '<button class="intro-skip" type="button">Пропустить ✕</button>' +
      '<div class="intro-ui">' +
        '<h1>Эльбрус</h1>' +
        '<div class="intro-sub">5 642 м · Высочайшая вершина Европы</div>' +
        '<button class="intro-start" type="button">Начать путь' +
          '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
      '</div>';
    document.body.appendChild(intro);
    document.body.classList.add("intro-active");

    var canvas = intro.querySelector("canvas");
    var ui = intro.querySelector(".intro-ui");
    var ctx = canvas.getContext("2d");
    var W, H, dpr, stars = [], sun, raf, t0 = null, finished = false;

    function setup() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var ow = W, oh = H;
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!stars.length) makeStars();
      else if (ow && oh) { // перераскладка при ресайзе
        for (var i = 0; i < stars.length; i++) { stars[i].x *= W / ow; stars[i].y *= H / oh; }
      }
      sun = { x: W * 0.42, baseY: H * 0.80, topY: H * 0.50, r: Math.max(46, W * 0.045) };
    }

    function makeStars() {
      var n = 200;
      for (var i = 0; i < n; i++) {
        var y = Math.random() * H * 0.7; // верхние 70%
        stars.push({
          x: Math.random() * W,
          y: y,
          r: 0.5 + Math.random() * 2,          // 1–2.5px диаметр
          base: 0.4 + Math.random() * 0.6,     // яркость 0.4–1.0
          tw: Math.random() < 0.18,            // ~35 мерцающих
          per: 2000 + Math.random() * 3000,    // 2–5 c
          ph: Math.random() * Math.PI * 2
        });
      }
    }

    function starAlpha(s, t) {
      var vpos = s.y / H; // 0 (верх) .. ~0.7 (низ полосы)
      var a;
      if (vpos > 0.25) {
        // полностью гаснут; нижние раньше верхних
        var fs = lerp(1000, 1950, invlerp(vpos, 0.7, 0.25));
        var fe = fs + 1200;
        a = s.base * (1 - smooth(invlerp(t, fs, fe)));
      } else {
        // верхние 25% — гаснут лишь частично (остаются видны утром)
        var k = smooth(invlerp(t, 2500, 3800));
        a = s.base * (1 - 0.62 * k);
      }
      if (s.tw && t < 2600) {
        a *= 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t / s.per * Math.PI * 2 + s.ph));
      }
      return clamp(a, 0, 1);
    }

    function drawSky(p) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, skyStop(0, p));
      g.addColorStop(0.45, skyStop(1, p));
      g.addColorStop(0.70, skyStop(2, p));
      g.addColorStop(0.86, skyStop(3, p));
      g.addColorStop(1, skyStop(4, p));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function drawStars(t) {
      ctx.fillStyle = "#ffffff";
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], a = starAlpha(s, t);
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawSun(t) {
      if (t < 2400) return;
      var prog = smooth(invlerp(t, 2400, 4000));
      var cx = sun.x, cy = lerp(sun.baseY, sun.topY, prog), r = sun.r;

      // лучи рассвета
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var rays = 16, rayA = 0.32 * prog;
      for (var i = 0; i < rays; i++) {
        var ang = (Math.PI * 2 / rays) * i + t * 0.00004;
        var grd = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * H, cy + Math.sin(ang) * H);
        grd.addColorStop(0, "rgba(255,179,71," + rayA + ")");
        grd.addColorStop(1, "rgba(255,179,71,0)");
        ctx.strokeStyle = grd;
        ctx.lineWidth = 2 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * H, cy + Math.sin(ang) * H);
        ctx.stroke();
      }
      ctx.restore();

      // свечение
      var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4.2);
      glow.addColorStop(0, "rgba(255,179,71," + (0.55 * prog) + ")");
      glow.addColorStop(0.4, "rgba(232,98,42," + (0.22 * prog) + ")");
      glow.addColorStop(1, "rgba(232,98,42,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - r * 4.2, cy - r * 4.2, r * 8.4, r * 8.4);

      // диск
      var disc = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
      disc.addColorStop(0, "#FFD9A0");
      disc.addColorStop(0.5, "#FFB347");
      disc.addColorStop(1, "#E8622A");
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(now) {
      if (t0 === null) t0 = now;
      var t = now - t0;
      var p = t < 1000 ? 0 : t < 2500 ? invlerp(t, 1000, 2500) * 0.5 : 0.5 + invlerp(t, 2500, 4000) * 0.5;

      drawSky(p);
      drawStars(t);
      drawSun(t);

      // переключение фазовых классов для CSS-слоёв горы
      if (t >= 2500 && intro.className.indexOf("phase-sunrise") === -1) {
        intro.className = "phase-sunrise";
      } else if (t >= 1000 && t < 2500 && intro.className.indexOf("phase-dawn") === -1 && intro.className.indexOf("phase-sunrise") === -1) {
        intro.className = "phase-dawn";
      }
      // появление текста
      if (t >= 4000 && !ui.classList.contains("show")) ui.classList.add("show");

      if (t >= 5000) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }

    function finish() {
      if (finished) return;
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      intro.classList.add("hide");
      document.body.classList.remove("intro-active");
      // запускаем slideDown навигации после интро
      var nav = document.querySelector(".nav");
      if (nav) { nav.classList.remove("nav-anim"); void nav.offsetWidth; nav.classList.add("nav-anim"); }
      setTimeout(function () { if (intro && intro.parentNode) intro.parentNode.removeChild(intro); }, 1200);
    }

    intro.querySelector(".intro-skip").addEventListener("click", finish);
    intro.querySelector(".intro-start").addEventListener("click", finish);

    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(setup, 150); });

    setup();
    raf = requestAnimationFrame(frame);
  }

  // ---------- SVG силуэта Эльбруса (twin peaks) ----------
  function mountainSVG() {
    return '' +
    '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">' +
      // базовый тёмный силуэт
      '<path d="M0 900 L0 740 L230 600 L430 665 L540 540 L610 430 L690 500 L770 455 L860 545 L1010 500 L1180 640 L1320 575 L1440 680 L1440 900 Z" fill="#080F1A"/>' +
      // лунное свечение на шапках (ночь)
      '<g class="intro-moonglow" fill="#8AAFCF">' +
        '<path d="M560 505 L610 430 L662 492 L632 504 L610 472 L586 500 Z"/>' +
        '<path d="M735 512 L770 455 L814 516 L790 506 L770 480 L752 508 Z"/>' +
      '</g>' +
      // золотистые шапки (восход)
      '<g class="intro-snowcap-gold" fill="#F5D9A8">' +
        '<path d="M560 505 L610 430 L662 492 L632 504 L610 472 L586 500 Z"/>' +
        '<path d="M735 512 L770 455 L814 516 L790 506 L770 480 L752 508 Z"/>' +
      '</g>' +
      // оранжевый rim-light на солнечной (левой) стороне пиков
      '<g class="intro-rim" fill="#E8622A" fill-opacity="0.42">' +
        '<path d="M540 540 L610 430 L620 438 L552 547 Z"/>' +
        '<path d="M690 500 L770 455 L778 463 L698 508 Z"/>' +
        '<path d="M230 600 L430 665 L430 678 L232 614 Z" fill-opacity="0.18"/>' +
      '</g>' +
    '</svg>';
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
