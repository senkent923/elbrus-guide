/* ============================================
   Анимации интерфейса — все страницы
   Меню, FAQ, reveal, счётчики, последовательные
   этапы, параллакс, shimmer, прогресс-бары,
   отрисовка галочек.
   ============================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {

    /* ---- Навигация: slideDown ---- */
    var nav = document.querySelector(".nav");
    if (nav && !reduce) nav.classList.add("nav-anim");

    /* ---- Мобильное меню ---- */
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      links.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          links.classList.remove("open");
          toggle.classList.remove("open");
        });
      });
    }

    /* ---- FAQ аккордеон ---- */
    var faqItems = document.querySelectorAll(".faq-item");
    faqItems.forEach(function (item) {
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      if (!q || !a) return;
      q.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");
        faqItems.forEach(function (o) {
          o.classList.remove("open");
          var oa = o.querySelector(".faq-a"); if (oa) oa.style.maxHeight = null;
          var oq = o.querySelector(".faq-q"); if (oq) oq.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          item.classList.add("open");
          a.style.maxHeight = a.scrollHeight + "px";
          q.setAttribute("aria-expanded", "true");
        }
      });
    });

    /* ---- Счётчик 0 → N ---- */
    function animateCount(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var dur = 1500, t0 = null;
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      function fmt(n) { return Math.round(n).toLocaleString("ru-RU").replace(/,/g, " "); }
      function step(now) {
        if (!t0) t0 = now;
        var k = Math.min((now - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - k, 3);
        el.textContent = prefix + fmt(target * eased) + suffix;
        if (k < 1) requestAnimationFrame(step);
        else el.textContent = prefix + fmt(target) + suffix;
      }
      if (reduce) { el.textContent = prefix + fmt(target) + suffix; return; }
      requestAnimationFrame(step);
    }

    /* ---- Прогресс-бары ---- */
    function fillProgress(el) {
      var v = el.getAttribute("data-fill") || "0%";
      if (reduce) { el.style.transition = "none"; }
      requestAnimationFrame(function () { el.style.width = v; });
    }

    /* ---- Последовательное «загорание» этапов ---- */
    function lightStages(container) {
      var st = container.querySelectorAll(".stage");
      st.forEach(function (s, i) {
        setTimeout(function () { s.classList.add("lit"); }, reduce ? 0 : i * 220);
      });
    }

    /* ---- Универсальный IntersectionObserver ---- */
    var seen = new WeakSet();
    function onView(el, cb) {
      if (!("IntersectionObserver" in window)) { cb(); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !seen.has(e.target)) {
            seen.add(e.target);
            cb(e.target);
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.2 });
      io.observe(el);
    }

    // reveal
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (reduce) { el.classList.add("visible"); return; }
      onView(el, function (t) { t.classList.add("visible"); });
    });
    // счётчики
    document.querySelectorAll("[data-count]").forEach(function (el) {
      onView(el, function (t) { animateCount(t); });
    });
    // прогресс-бары
    document.querySelectorAll(".progress-fill").forEach(function (el) {
      onView(el, function (t) { fillProgress(t); });
    });
    // галочки снаряжения
    document.querySelectorAll(".gear-item, .gear-check").forEach(function (el) {
      if (reduce) { el.classList.add("drawn"); return; }
      onView(el, function (t) { t.classList.add("drawn"); });
    });
    // этапы маршрута — последовательно
    document.querySelectorAll(".stages").forEach(function (st) {
      onView(st, function (t) { lightStages(t); });
    });

    /* ---- Параллакс силуэта горы в хедере ---- */
    var heroArt = document.querySelector(".hero-art");
    if (heroArt && !reduce) {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY;
          heroArt.style.transform = "translateY(" + (y * 0.35) + "px)";
          ticking = false;
        });
      }, { passive: true });
    }

    /* ---- Scrollspy (для якорной навигации, если есть) ---- */
    var sections = [].slice.call(document.querySelectorAll("section[id]"));
    var navA = [].slice.call(document.querySelectorAll(".nav-links a[href^='#']"));
    if (sections.length && navA.length) {
      var spyTick = false;
      function spy() {
        var pos = window.scrollY + 120, cur = "";
        sections.forEach(function (s) { if (s.offsetTop <= pos) cur = s.id; });
        navA.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + cur); });
      }
      window.addEventListener("scroll", function () {
        if (spyTick) return; spyTick = true;
        requestAnimationFrame(function () { spy(); spyTick = false; });
      }, { passive: true });
      spy();
    }

    /* ---- Предвыбор тарифа по кнопкам цен ---- */
    var tariffSelect = document.getElementById("f-tariff");
    document.querySelectorAll("[data-tariff]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var apply = document.getElementById("apply");
        if (tariffSelect) {
          tariffSelect.value = btn.getAttribute("data-tariff");
          tariffSelect.dispatchEvent(new Event("change"));
        }
        if (apply) apply.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        var name = document.getElementById("f-name");
        if (name) setTimeout(function () { name.focus(); }, reduce ? 0 : 600);
      });
    });

    /* ---- Обработка формы заявки ---- */
    var form = document.getElementById("applyForm");
    if (form) {
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      function setInvalid(field, bad) {
        if (!field) return;
        field.parentElement.classList.toggle("invalid", bad);
      }
      // снимаем подсветку ошибки при вводе
      form.querySelectorAll("input, select, textarea").forEach(function (el) {
        el.addEventListener("input", function () { el.parentElement.classList.remove("invalid"); });
        el.addEventListener("change", function () { el.parentElement.classList.remove("invalid"); });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = document.getElementById("f-name");
        var email = document.getElementById("f-email");
        var tariff = document.getElementById("f-tariff");
        var ok = true;

        if (!name.value.trim()) { setInvalid(name, true); ok = false; }
        if (!emailRe.test(email.value.trim())) { setInvalid(email, true); ok = false; }
        if (!tariff.value) { setInvalid(tariff, true); ok = false; }

        if (!ok) {
          var firstBad = form.querySelector(".field.invalid input, .field.invalid select");
          if (firstBad) firstBad.focus();
          return;
        }

        // данные заявки
        var tg = document.getElementById("f-tg");
        var exp = document.getElementById("f-exp");
        var TO = "senkent923@gmail.com"; // почта сайта

        // формируем письмо и открываем почтовый клиент посетителя
        var subject = "Заявка на восхождение на Эльбрус — " + name.value.trim();
        var body =
          "Имя: " + name.value.trim() + "\n" +
          "Почта: " + email.value.trim() + "\n" +
          "Telegram: " + ((tg && tg.value.trim()) || "—") + "\n" +
          "Тариф: " + tariff.value + "\n" +
          "Опыт восхождений: " + ((exp && exp.value.trim()) || "не указан") + "\n";
        var mailto = "mailto:" + TO +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);

        // подставляем имя в сообщение и показываем успех
        var nameOut = form.querySelector("[data-name]");
        if (nameOut) nameOut.textContent = name.value.trim();
        form.classList.add("sent");
        var success = form.querySelector(".apply-success");
        if (success) success.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });

        // открываем письмо (не прерывает показ страницы)
        try { window.location.href = mailto; } catch (err) {}

        /* ─── Фоновая отправка без почтового клиента (по желанию) ───
           Зарегистрируй бесплатный ключ на web3forms.com для
           elbrusfornew@gmail.com и раскомментируй блок ниже:
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: "ВАШ_КЛЮЧ",
            subject: subject,
            name: name.value, email: email.value,
            telegram: tg ? tg.value : "", tariff: tariff.value,
            experience: exp ? exp.value : ""
          })
        });
        ──────────────────────────────────────────────────────────── */
      });
    }

    /* ---- Год в футере ---- */
    var y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  });
})();
