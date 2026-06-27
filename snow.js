/* ============================================
   Постоянный падающий снег — все страницы
   Canvas fixed, pointer-events:none, низкий z-index
   ============================================ */
(function () {
  "use strict";

  // Уважаем настройку «уменьшить движение»
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var canvas = document.createElement("canvas");
  canvas.id = "snow-canvas";
  canvas.setAttribute("aria-hidden", "true");
  // вставляем первым, чтобы был «под» контентом по разметке (z-index управляет слоем)
  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(canvas);
    init();
  });

  var ctx, W, H, flakes = [], raf = null;

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  }

  function flakeCount() {
    return isMobile() ? 60 : 135; // 120–150 на десктопе, 60 на мобильных
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function makeFlake() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(1, 4),                 // радиус 1–4px
      o: rand(0.4, 0.85),            // прозрачность 0.4–0.85
      vy: rand(1.2, 3),              // скорость падения 1.2–3px/кадр
      angle: rand(10, 20) * Math.PI / 180, // наклон 10–20° вправо
      drift: rand(1, 2),             // амплитуда бокового дрейфа ±1–2px
      phase: rand(0, Math.PI * 2),   // фаза синусоиды
      sway: rand(0.01, 0.03)         // частота покачивания
    };
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var target = flakeCount();
    flakes = [];
    for (var i = 0; i < target; i++) flakes.push(makeFlake());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.phase += f.sway;
      // вертикальное падение + горизонтальный снос по углу + синусоидальный дрейф
      f.y += f.vy;
      f.x += Math.sin(f.angle) * f.vy * 0.5 + Math.sin(f.phase) * f.drift * 0.4;

      // выход за нижний край — телепортация наверх с новым X
      if (f.y - f.r > H) {
        f.y = -f.r;
        f.x = Math.random() * W;
      }
      // боковые края
      if (f.x > W + 5) f.x = -5;
      else if (f.x < -5) f.x = W + 5;

      ctx.globalAlpha = f.o;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }

  function init() {
    ctx = canvas.getContext("2d");
    resize();
    if (raf) cancelAnimationFrame(raf);
    draw();
    var t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(resize, 200);
    });
    // приостанавливаем анимацию на скрытой вкладке
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
      else if (!raf) { draw(); }
    });
  }
})();
