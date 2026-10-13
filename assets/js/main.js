/* =====================================================================
   BJJ'S HOUSE · comportamento da página
   Não é preciso editar este arquivo: as configurações ficam em config.js
   ===================================================================== */
(function () {
  "use strict";

  var CFG = window.BJJ_CONFIG || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var PLANOS = {
    diamond: { nome: "Diamond Experience", valor: 15000 },
    gold:    { nome: "Gold Immersion", valor: 5000 },
    silver:  { nome: "Silver Immersion", valor: 4600 },
    sexta:   { nome: "Day Experience · sexta (11/12)", valor: 1200 },
    sabado:  { nome: "Day Experience · sábado (12/12)", valor: 1600 },
    domingo: { nome: "Day Experience · domingo (13/12)", valor: 1400 },
    guest:   { nome: "BJJ'S HOUSE Guest", valor: 500 }
  };

  /* ---------- rastreamento (Meta Pixel / GA4), só se configurado ---------- */
  function track(fbEvent, gaEvent, data) {
    try {
      if (window.fbq) window.fbq("track", fbEvent, data && data.fb);
      if (window.gtag) window.gtag("event", gaEvent, data && data.ga);
    } catch (e) { /* nunca quebrar a página por causa de analytics */ }
  }

  if (CFG.metaPixelId) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", CFG.metaPixelId);
    window.fbq("track", "PageView");
  }
  if (CFG.ga4Id) {
    var ga = document.createElement("script");
    ga.async = true;
    ga.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.ga4Id);
    document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CFG.ga4Id);
  }

  /* ---------- links: WhatsApp, checkout (com UTMs) ---------- */
  var waNumber = String(CFG.whatsapp || "").replace(/\D/g, "");
  function waLink(msg) {
    return waNumber ? "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(msg || CFG.mensagemWhatsapp || "") : "";
  }

  var PASS_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "src", "sck", "xcod"];
  var pageParams = new URLSearchParams(window.location.search);
  function withTracking(url) {
    try {
      var u = new URL(url);
      PASS_PARAMS.forEach(function (k) {
        var v = pageParams.get(k);
        if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
      });
      return u.toString();
    } catch (e) { return url; }
  }

  function openExternal(a, href) {
    a.href = href;
    if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
  }

  var checkout = CFG.checkout || {};
  $$("[data-buy]").forEach(function (a) {
    var k = a.getAttribute("data-buy");
    var plano = PLANOS[k] || { nome: k, valor: 0 };
    var link = checkout[k] ? withTracking(checkout[k]) :
      waLink("Olá! Quero garantir minha vaga no plano " + plano.nome + " do Camp BJJ'S HOUSE (10 a 13/12).");
    if (!link && CFG.email) {
      link = "mailto:" + CFG.email + "?subject=" + encodeURIComponent("Inscrição · " + plano.nome + " · BJJ'S HOUSE");
    }
    if (link) openExternal(a, link);
    a.addEventListener("click", function () {
      track("InitiateCheckout",  "begin_checkout", {
        fb: { content_name: plano.nome, value: plano.valor, currency: "BRL" },
        ga: { currency: "BRL", value: plano.valor, items: [{ item_id: k, item_name: plano.nome, price: plano.valor }] }
      });
    });
  });

  $$("[data-wa]").forEach(function (a) {
    var l = waLink();
    if (l) {
      openExternal(a, l);
      a.hidden = false;
      a.addEventListener("click", function () { track("Contact", "contact", { ga: { method: "whatsapp" } }); });
    } else {
      a.hidden = true;
      var box = a.closest(".faq-more");
      if (box) box.hidden = true;
    }
  });

  if (CFG.instagram) {
    var ig = $("[data-insta]");
    if (ig) {
      var handle = String(CFG.instagram).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
      openExternal(ig, "https://instagram.com/" + handle);
      ig.querySelector("span").textContent = "@" + handle;
      ig.hidden = false;
    }
  }
  if (CFG.email) {
    var em = $("[data-email]");
    if (em) { em.href = "mailto:" + CFG.email; em.querySelector("span").textContent = CFG.email; em.hidden = false; }
  }

  if (CFG.endereco) {
    var q = encodeURIComponent(CFG.endereco);
    var addr = $("[data-addr]"); if (addr) addr.textContent = CFG.endereco;
    var map = $("[data-map]"); if (map) map.src = "https://maps.google.com/maps?q=" + q + "&z=15&output=embed";
    var ml = $("[data-maplink]"); if (ml) ml.href = "https://www.google.com/maps/search/?api=1&query=" + q;
  }

  /* ---------- parcelamento e vagas ---------- */
  if (CFG.parcelamento) {
    $$("[data-parcelas]").forEach(function (el) { el.textContent = CFG.parcelamento; el.hidden = false; });
  }

  var vagas = CFG.vagasRestantes || {};
  $$("[data-vagas]").forEach(function (el) {
    var k = el.getAttribute("data-vagas");
    var n = vagas[k];
    if (typeof n !== "number" || isNaN(n)) return;
    n = Math.max(0, Math.floor(n));
    el.hidden = false;
    $(".vagas-txt", el).textContent = n === 0 ? "Esgotado" : "Restam " + n + (n === 1 ? " vaga" : " vagas");
    var total = parseInt(el.getAttribute("data-total"), 10);
    var bar = $(".bar i", el);
    if (bar && total > 0) {
      var pct = Math.min(100, Math.max(0, ((total - n) / total) * 100));
      requestAnimationFrame(function () { setTimeout(function () { bar.style.width = pct + "%"; }, 300); });
    }
    if (n === 0) {
      $$('[data-buy="' + k + '"]').forEach(function (b) {
        b.textContent = "Esgotado";
        b.classList.add("sold");
        b.removeAttribute("href");
        b.setAttribute("aria-disabled", "true");
      });
    }
  });

  /* ---------- contagem regressiva ---------- */
  var target = Date.parse(CFG.dataEvento || "2026-12-10T09:00:00-03:00");
  var cdEls = $$("[data-countdown]");
  var cdText = $("[data-countdown-text]");
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  function tick() {
    var diff = target - Date.now();
    if (isNaN(target) || diff <= 0) {
      $$("[data-countdown-wrap]").forEach(function (w) { w.hidden = true; });
      if (cdText) cdText.hidden = true;
      return false;
    }
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    cdEls.forEach(function (el) {
      $("[data-cd=d]", el).textContent = pad(d);
      $("[data-cd=h]", el).textContent = pad(h);
      $("[data-cd=m]", el).textContent = pad(m);
      $("[data-cd=s]", el).textContent = pad(sec);
    });
    if (cdText) {
      cdText.textContent = d >= 1 ? "Faltam " + d + (d === 1 ? " dia" : " dias") : "Começa em " + pad(h) + "h " + pad(m) + "min";
      cdText.hidden = false;
    }
    return true;
  }
  if (tick()) {
    var timer = setInterval(function () { if (!tick()) clearInterval(timer); }, 1000);
  }

  /* ---------- topo: fundo ao rolar + menu mobile ---------- */
  var top = $(".top");
  var onScroll = function () { top.classList.toggle("scrolled", window.scrollY > 24); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var burger = $(".burger"), menu = $("#menu");
  function setMenu(open) {
    menu.classList.toggle("open", open);
    top.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  if (burger && menu) {
    burger.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); burger.focus(); } });
  }

  /* ---------- barra de compra (mobile) + eventos de visualização ---------- */
  var mbar = $(".mbar");
  var heroVisible = true, pricesVisible = false, sentView = false;
  function updateBar() { if (mbar) mbar.classList.toggle("show", !heroVisible && !pricesVisible); }

  if ("IntersectionObserver" in window) {
    var hero = $("#inicio"), prices = $("#ingressos");
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { heroVisible = e.isIntersecting; });
      updateBar();
    }, { threshold: 0.05 }).observe(hero);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        pricesVisible = e.isIntersecting;
        if (e.isIntersecting && !sentView) {
          sentView = true;
          track("ViewContent", "view_item_list", { fb: { content_name: "Ingressos" }, ga: { item_list_name: "Ingressos" } });
        }
      });
      updateBar();
    }, { threshold: 0.1 }).observe(prices);
  }

  /* ---------- animação de entrada ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    reveals.forEach(function (el) {
      var sib = $$(":scope > .reveal", el.parentElement);
      var i = sib.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i, 4) * 90 + "ms";
    });
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- galeria ampliada ---------- */
  var lb = $(".lb");
  var tiles = $$("[data-gallery] .tile");
  if (lb && typeof lb.showModal === "function" && tiles.length) {
    var lbImg = $("img", lb), lbCap = $("figcaption", lb), idx = 0, lastTile = null;
    var show = function (i) {
      idx = (i + tiles.length) % tiles.length;
      var t = tiles[idx], im = $("img", t);
      lbImg.src = t.getAttribute("data-full");
      lbImg.alt = im.alt;
      lbCap.textContent = im.alt + " · " + (idx + 1) + "/" + tiles.length;
    };
    tiles.forEach(function (t, i) {
      t.addEventListener("click", function () { lastTile = t; show(i); lb.showModal(); });
    });
    $(".lb-close", lb).addEventListener("click", function () { lb.close(); });
    $(".lb-prev", lb).addEventListener("click", function () { show(idx - 1); });
    $(".lb-next", lb).addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener("close", function () { if (lastTile) lastTile.focus(); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  } else {
    tiles.forEach(function (t) {
      t.addEventListener("click", function () { window.open(t.getAttribute("data-full"), "_blank", "noopener"); });
    });
  }

  /* ---------- depoimentos (config.js) ---------- */
  var deps = Array.isArray(CFG.depoimentos) ? CFG.depoimentos.filter(function (d) { return d && d.texto; }) : [];
  if (deps.length) {
    var box = $("[data-testis]");
    deps.forEach(function (d) {
      var card = document.createElement("article");
      card.className = "testi";
      var stars = document.createElement("span");
      stars.className = "stars"; stars.setAttribute("aria-hidden", "true"); stars.textContent = "★★★★★";
      var q = document.createElement("blockquote");
      q.className = "serif"; q.textContent = "“" + d.texto + "”";
      var who = document.createElement("div");
      who.className = "who";
      if (d.foto) {
        var img = document.createElement("img");
        img.src = d.foto; img.alt = ""; img.width = 46; img.height = 46; img.loading = "lazy";
        who.appendChild(img);
      }
      var meta = document.createElement("div");
      var b = document.createElement("b"); b.textContent = d.nome || "";
      var sp = document.createElement("span"); sp.textContent = d.info || "";
      meta.appendChild(b); meta.appendChild(sp); who.appendChild(meta);
      card.appendChild(stars); card.appendChild(q); card.appendChild(who);
      box.appendChild(card);
    });
    $("#depoimentos").hidden = false;
  }

  /* ---------- ano no rodapé ---------- */
  var y = $("[data-year]");
  if (y) y.textContent = String(new Date().getFullYear());
})();
