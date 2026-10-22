/* =====================================================================
   BJJ'S HOUSE · comportamento da página
   Não é preciso editar este arquivo: as configurações ficam em config.js
   ===================================================================== */
(function () {
  "use strict";

  const CFG = window.BJJ_CONFIG || {};
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const RM = root.classList.contains("rm") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const vw = () => root.clientWidth;
  let needsUpdate = true;
  const vh = () => window.innerHeight;

  const PLANOS = {
    diamante:      { nome: "Plano Diamante", valor: 20000 },
    ouro:          { nome: "Plano Ouro", valor: 16000 },
    prata:         { nome: "Plano Prata", valor: 11000 },
    bronze:        { nome: "Plano Bronze", valor: 10000 },
    dayfull:       { nome: "Day Pass Full", valor: 4000 },
    dayhalf:       { nome: "Day Pass Half", valor: 2000 },
    acompanhantes: { nome: "Acompanhantes", valor: 500, ref: "no plano Acompanhantes" }
  };

  /* =================================================================
     1. INTEGRAÇÕES (rastreamento, checkout, WhatsApp, contatos)
     ================================================================= */
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
    const ga = document.createElement("script");
    ga.async = true;
    ga.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.ga4Id);
    document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CFG.ga4Id);
  }

  const waNumber = String(CFG.whatsapp || "").replace(/\D/g, "");
  const waLink = (msg) => waNumber ? "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(msg || CFG.mensagemWhatsapp || "") : "";

  const PASS_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "src", "sck", "xcod"];
  const pageParams = new URLSearchParams(window.location.search);
  function withTracking(url) {
    try {
      const u = new URL(url);
      PASS_PARAMS.forEach((k) => {
        const v = pageParams.get(k);
        if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
      });
      return u.toString();
    } catch (e) { return url; }
  }
  function openExternal(a, href) {
    a.href = href;
    if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
  }

  /* com botoesParaWhatsapp (padrão), todos os botões abrem o WhatsApp */
  const allToWa = CFG.botoesParaWhatsapp !== false && !!waNumber;

  const checkout = CFG.checkout || {};
  $$("[data-buy]").forEach((a) => {
    const k = a.getAttribute("data-buy");
    const plano = PLANOS[k] || { nome: k, valor: 0 };
    const waPlano = waLink("Olá! Quero garantir minha vaga " + (plano.ref || "no " + plano.nome) + " do Camp BJJ'S HOUSE (10 a 13/12).");
    let link = allToWa ? waPlano : (checkout[k] ? withTracking(checkout[k]) : waPlano);
    if (!link && CFG.email) {
      link = "mailto:" + CFG.email + "?subject=" + encodeURIComponent("Inscrição · " + plano.nome + " · BJJ'S HOUSE");
    }
    if (link) openExternal(a, link);
    a.addEventListener("click", () => {
      track("InitiateCheckout", "begin_checkout", {
        fb: { content_name: plano.nome, value: plano.valor, currency: "BRL" },
        ga: { currency: "BRL", value: plano.valor, items: [{ item_id: k, item_name: plano.nome, price: plano.valor }] }
      });
    });
  });

  $$("[data-wa]").forEach((a) => {
    const l = waLink();
    if (l) {
      openExternal(a, l);
      a.hidden = false;
      a.addEventListener("click", () => track("Contact", "contact", { ga: { method: "whatsapp" } }));
    } else {
      a.hidden = true;
      const box = a.closest(".faq-more");
      if (box) box.hidden = true;
    }
  });

  /* demais botões (Garantir minha vaga, Conhecer a experiência...): WhatsApp com a
     mensagem do atributo data-wa-msg; qualquer botão novo sem mensagem usa a padrão */
  if (allToWa) {
    $$('a.btn[href^="#"]:not([data-buy]):not([data-wa]):not([data-insta]):not([data-email])').forEach((a) => {
      openExternal(a, waLink(a.getAttribute("data-wa-msg") || CFG.mensagemWhatsapp));
      const label = a.textContent.trim();
      a.addEventListener("click", () => track("Contact", "contact", { fb: { content_name: label }, ga: { method: "whatsapp", cta: label } }));
    });
  }

  if (CFG.instagram) {
    const ig = $("[data-insta]");
    if (ig) {
      const handle = String(CFG.instagram).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
      openExternal(ig, "https://instagram.com/" + handle);
      ig.querySelector("span").textContent = "@" + handle;
      ig.hidden = false;
    }
  }
  if (CFG.email) {
    const em = $("[data-email]");
    if (em) { em.href = "mailto:" + CFG.email; em.querySelector("span").textContent = CFG.email; em.hidden = false; }
  }
  if (CFG.endereco) {
    const q = encodeURIComponent(CFG.endereco);
    const addr = $("[data-addr]"); if (addr) addr.textContent = CFG.endereco;
    const map = $("[data-map]"); if (map) map.src = "https://maps.google.com/maps?q=" + q + "&z=15&output=embed";
    const ml = $("[data-maplink]"); if (ml) ml.href = "https://www.google.com/maps/search/?api=1&query=" + q;
  }

  if (CFG.parcelamento) {
    $$("[data-parcelas]").forEach((el) => { el.textContent = CFG.parcelamento; el.hidden = false; });
  }

  const vagas = CFG.vagasRestantes || {};
  $$("[data-vagas]").forEach((el) => {
    const k = el.getAttribute("data-vagas");
    let n = vagas[k];
    if (typeof n !== "number" || isNaN(n)) return;
    n = Math.max(0, Math.floor(n));
    el.hidden = false;
    $(".vagas-txt", el).textContent = n === 0 ? "Esgotado" : "Restam " + n + (n === 1 ? " vaga" : " vagas");
    const total = parseInt(el.getAttribute("data-total"), 10);
    const bar = $(".bar i", el);
    if (bar && total > 0) {
      const pct = clamp(((total - n) / total) * 100, 0, 100);
      setTimeout(() => { bar.style.width = pct + "%"; }, 600);
    }
    if (n === 0) {
      $$('[data-buy="' + k + '"]').forEach((b) => {
        b.innerHTML = "<span>Esgotado</span>";
        b.classList.add("sold");
        b.removeAttribute("href");
        b.setAttribute("aria-disabled", "true");
      });
    }
  });

  /* depoimentos (config.js) */
  const deps = Array.isArray(CFG.depoimentos) ? CFG.depoimentos.filter((d) => d && d.texto) : [];
  if (deps.length) {
    const box = $("[data-testis]");
    deps.forEach((d, i) => {
      const card = document.createElement("article");
      card.className = "testi reveal";
      card.style.setProperty("--rd", Math.min(i, 4) * 100 + "ms");
      const stars = document.createElement("span");
      stars.className = "stars"; stars.setAttribute("aria-hidden", "true"); stars.textContent = "★★★★★";
      const q = document.createElement("blockquote");
      q.className = "serif"; q.textContent = "“" + d.texto + "”";
      const who = document.createElement("div");
      who.className = "who";
      if (d.foto) {
        const img = document.createElement("img");
        img.src = d.foto; img.alt = ""; img.width = 46; img.height = 46; img.loading = "lazy";
        who.appendChild(img);
      }
      const meta = document.createElement("div");
      const b = document.createElement("b"); b.textContent = d.nome || "";
      const sp = document.createElement("span"); sp.textContent = d.info || "";
      meta.appendChild(b); meta.appendChild(sp); who.appendChild(meta);
      card.appendChild(stars); card.appendChild(q); card.appendChild(who);
      box.appendChild(card);
    });
    $("#depoimentos").hidden = false;
  }

  const y0 = $("[data-year]");
  if (y0) y0.textContent = String(new Date().getFullYear());

  /* =================================================================
     2. INTRO + ENTRADA DO HERO
     ================================================================= */
  let markReady;
  const readyP = new Promise((res) => { markReady = res; });
  const intro = $(".intro");
  const setReady = () => { root.classList.add("ready"); markReady(); };

  if (intro && !root.classList.contains("no-intro")) {
    root.classList.add("lock");
    const heroImg = $(".hero-bg img");
    const imgP = new Promise((res) => {
      if (!heroImg || heroImg.complete) return res();
      heroImg.addEventListener("load", res, { once: true });
      heroImg.addEventListener("error", res, { once: true });
    });
    const fontsP = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const minP = new Promise((res) => setTimeout(res, 900));
    const maxP = new Promise((res) => setTimeout(res, 1800));
    Promise.race([Promise.all([imgP, fontsP, minP]), maxP]).then(() => {
      intro.classList.add("out");
      root.classList.remove("lock");
      requestAnimationFrame(() => { if (typeof layout === "function") layout(); });
      setTimeout(setReady, 200);
      setTimeout(() => intro.remove(), 1000);
      try { sessionStorage.setItem("bjj-intro", "1"); } catch (e) { /* modo privado */ }
    });
  } else {
    if (intro) intro.remove();
    requestAnimationFrame(() => requestAnimationFrame(setReady));
  }

  /* =================================================================
     3. TÍTULOS PALAVRA POR PALAVRA + LETRAS DO RODAPÉ
     ================================================================= */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const wi = document.createElement("span"); wi.className = "wi";
            wi.style.setProperty("--i", i++);
            wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== "BR") {
          walk(ch);
        }
      });
    };
    walk(el);
    el.classList.add("split");
  }
  if (!RM) {
    $$("[data-split]").forEach(splitWords);
    $$("[data-split-chars]").forEach((el) => {
      const txt = el.textContent;
      el.textContent = "";
      Array.from(txt).forEach((c, i) => {
        if (c === " ") { el.appendChild(document.createTextNode(" ")); return; }
        const s = document.createElement("span");
        s.className = "c"; s.style.setProperty("--i", i); s.textContent = c;
        el.appendChild(s);
      });
    });
  }

  /* =================================================================
     4. REVELAÇÕES AO ROLAR, CASCATAS E CONTADORES
     ================================================================= */
  $$(".reveal").forEach((el) => {
    if (el.style.getPropertyValue("--rd")) return;
    const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty("--rd", Math.min(i, 5) * 90 + "ms");
  });
  $$(".stagger").forEach((list) => {
    Array.from(list.children).forEach((c, i) => c.style.setProperty("--si", i));
  });

  function countUp(el) {
    const end = parseFloat(el.getAttribute("data-count"));
    if (isNaN(end) || RM) return;
    const dur = 1700, t0 = performance.now();
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = String(Math.round(end * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const counters = $$("[data-count]");
  if (!RM) counters.forEach((el) => { el.textContent = "0"; });

  const revealTargets = $$(".reveal, .stagger, .split, .foot-giant");
  if ("IntersectionObserver" in window && !RM) {
    /* elementos recortados (clip-path) são observados pelo pai: o navegador
       considera o recorte e nunca os veria como visíveis */
    const watch = new Map();
    revealTargets.forEach((el) => {
      const host = el.classList.contains("r-clip") ? el.parentElement : el;
      if (!watch.has(host)) watch.set(host, []);
      watch.get(host).push(el);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        (watch.get(e.target) || []).forEach((el) => {
          const go = () => {
            el.classList.add("in");
            if (el.classList.contains("reveal")) {
              const rd = parseFloat(el.style.getPropertyValue("--rd")) || 0;
              setTimeout(() => el.classList.add("done"), 1500 + rd);
            }
          };
          /* no hero, espera a intro terminar */
          if (el.closest(".hero")) readyP.then(go); else go();
        });
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    watch.forEach((_, host) => io.observe(host));

    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const inHero = !!e.target.closest(".hero");
        readyP.then(() => setTimeout(() => countUp(e.target), inHero ? 1300 : 350));
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in", "done"));
  }

  /* =================================================================
     5. TOPO: fundo, esconder ao descer, progresso, menu e seção ativa
     ================================================================= */
  const top = $(".top");
  const toTop = $(".to-top");
  const progressBar = $(".progress");
  const burger = $(".burger"), menu = $("#menu");
  let menuOpen = false, lastHeaderY = window.scrollY;

  function updateHeader(y) {
    top.classList.toggle("scrolled", y > 24);
    if (y > lastHeaderY + 6 && y > 560 && !menuOpen) top.classList.add("hide");
    else if (y < lastHeaderY - 6 || y < 560) top.classList.remove("hide");
    if (Math.abs(y - lastHeaderY) > 6) lastHeaderY = y;
    const max = root.scrollHeight - vh();
    const sp = max > 0 ? clamp(y / max, 0, 1) : 0;
    progressBar.style.setProperty("--sp", sp.toFixed(4));
    if (toTop) {
      toTop.style.setProperty("--sp", sp.toFixed(4));
      toTop.classList.toggle("show", y > 900);
    }
  }

  function setMenu(open) {
    menuOpen = open;
    menu.classList.toggle("open", open);
    top.classList.toggle("menu-open", open);
    top.classList.remove("hide");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  if (burger && menu) {
    burger.addEventListener("click", () => setMenu(!menuOpen));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) { setMenu(false); burger.focus(); } });
  }

  if ("IntersectionObserver" in window) {
    const links = new Map($$('.menu a[href^="#"]:not(.btn)').map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove("active"));
        const a = links.get(e.target.id);
        if (a) a.classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main > section[id], footer[id]").forEach((sec) => spy.observe(sec));
  }

  /* barra de compra no celular */
  const mbar = $(".mbar");
  let heroVisible = true, pricesVisible = false, sentView = false;
  const updateBar = () => { if (mbar) mbar.classList.toggle("show", !heroVisible && !pricesVisible); };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { es.forEach((e) => { heroVisible = e.isIntersecting; }); updateBar(); }, { threshold: 0.05 }).observe($("#inicio"));
    new IntersectionObserver((es) => {
      es.forEach((e) => {
        pricesVisible = e.isIntersecting;
        if (e.isIntersecting && !sentView) {
          sentView = true;
          track("ViewContent", "view_item_list", { fb: { content_name: "Ingressos" }, ga: { item_list_name: "Ingressos" } });
        }
      });
      updateBar();
    }, { threshold: 0.1 }).observe($("#ingressos"));
  }

  /* =================================================================
     6. CONTAGEM REGRESSIVA (com animação a cada mudança)
     ================================================================= */
  const target = Date.parse(CFG.dataEvento || "2026-12-10T09:00:00-03:00");
  const cdEls = $$("[data-countdown]");
  const cdText = $("[data-countdown-text]");
  const pad = (n) => (n < 10 ? "0" : "") + n;
  let cdStarted = false;
  function setNum(b, val) {
    if (b.textContent === val) return;
    b.textContent = val;
    if (cdStarted && !RM) { b.classList.remove("tick"); void b.offsetWidth; b.classList.add("tick"); }
  }
  function tick() {
    const diff = target - Date.now();
    if (isNaN(target) || diff <= 0) {
      $$("[data-countdown-wrap]").forEach((w) => { w.hidden = true; });
      if (cdText) cdText.hidden = true;
      return false;
    }
    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    cdEls.forEach((el) => {
      setNum($("[data-cd=d]", el), pad(d));
      setNum($("[data-cd=h]", el), pad(h));
      setNum($("[data-cd=m]", el), pad(m));
      setNum($("[data-cd=s]", el), pad(sec));
    });
    if (cdText) {
      cdText.textContent = d >= 1 ? "Faltam " + d + (d === 1 ? " dia" : " dias") : "Começa em " + pad(h) + "h " + pad(m) + "min";
      cdText.hidden = false;
    }
    cdStarted = true;
    return true;
  }
  if (tick()) {
    const timer = setInterval(() => { if (!tick()) clearInterval(timer); }, 1000);
  }

  /* =================================================================
     7. ROLAGEM SUAVE (mouse/trackpad no desktop) + LINKS INTERNOS
     ================================================================= */
  const smooth = (FINE && !RM) ? { on: false, cur: window.scrollY, to: window.scrollY, tween: null } : null;
  const maxScroll = () => root.scrollHeight - vh();
  const lightboxOpen = () => !!$("dialog[open]");

  if (smooth) {
    root.classList.add("smooth");
    window.addEventListener("wheel", (e) => {
      if (e.ctrlKey || root.classList.contains("lock") || lightboxOpen()) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      for (let el = e.target; el && el !== document.body && el.nodeType === 1; el = el.parentElement) {
        const st = getComputedStyle(el);
        if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1) return;
      }
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 40; else if (e.deltaMode === 2) d *= vh();
      if (!smooth.on) { smooth.cur = smooth.to = window.scrollY; }
      smooth.tween = null;
      smooth.to = clamp(smooth.to + d, 0, maxScroll());
      smooth.on = true;
    }, { passive: false });
    window.addEventListener("scroll", () => {
      if (smooth.on && Math.abs(window.scrollY - Math.round(smooth.cur)) > 4) { smooth.on = false; smooth.tween = null; }
      if (!smooth.on) smooth.cur = smooth.to = window.scrollY;
    }, { passive: true });
  }

  function scrollToY(y) {
    y = clamp(y, 0, maxScroll());
    if (!smooth) { window.scrollTo({ top: y, behavior: RM ? "auto" : "smooth" }); return; }
    const from = window.scrollY;
    const dist = Math.abs(y - from);
    smooth.tween = { from, to: y, t0: performance.now(), dur: clamp(500 + dist * 0.25, 700, 1700) };
    smooth.cur = from; smooth.to = y; smooth.on = true;
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const id = a.getAttribute("href").slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el && id !== "") return;
    e.preventDefault();
    const offset = (id === "casa" || id === "inicio" || id === "topo") ? 0 : 76;
    const y = el ? el.getBoundingClientRect().top + window.scrollY - offset : 0;
    scrollToY(id === "topo" ? 0 : y);
    if (el && id !== "topo") history.replaceState(null, "", "#" + id);
  });

  /* =================================================================
     8. FAIXAS EM MOVIMENTO (reagem à velocidade da rolagem)
     ================================================================= */
  const bands = $$("[data-marquee]").map((track) => ({ track, group: $(".mq-group", track), anim: null, rate: 1 }));
  function setupMarquees() {
    bands.forEach((b) => {
      $$(".mq-group.clone", b.track).forEach((c) => c.remove());
      const gw = b.group.getBoundingClientRect().width;
      if (!gw) return;
      const n = Math.ceil((vw() * 1.3) / gw) + 1;
      for (let i = 0; i < n; i++) {
        const c = b.group.cloneNode(true);
        c.classList.add("clone");
        b.track.appendChild(c);
      }
      b.track.style.setProperty("--gw", gw + "px");
      b.track.style.setProperty("--dur", (gw / 75).toFixed(2) + "s");
      b.anim = b.track.getAnimations ? b.track.getAnimations()[0] || null : null;
      if (b.anim && !b.started) { b.anim.currentTime = 36e5; b.started = true; }
    });
  }

  /* =================================================================
     9. GALERIA DA CASA (horizontal: presa no desktop, deslizante no celular)
     ================================================================= */
  const casa = $("[data-hscroll]");
  const casaTrack = $(".casa-track");
  const casaVp = $(".casa-viewport");
  const casaProg = $(".casa-progress");
  const casaIdx = $("[data-casa-idx]");
  const casaTiles = $$(".casa-track .tile");
  let casaPin = false, casaMax = 0;

  function setupCasa() {
    if (!casa) return;
    const want = !RM && window.innerWidth > 1000 && vh() > 600;
    casaPin = want;
    casa.classList.toggle("pin", want);
    casaTrack.style.transform = "";
    if (want) {
      casaMax = Math.max(0, casaTrack.scrollWidth - vw());
      casa.style.setProperty("--casa-h", Math.round(vh() + casaMax) + "px");
    } else {
      casa.style.removeProperty("--casa-h");
    }
  }
  function setCasaProgress(p) {
    casaProg.style.setProperty("--cp", p.toFixed(4));
    const idx = clamp(Math.round(p * (casaTiles.length - 1)) + 1, 1, casaTiles.length);
    const txt = pad(idx);
    if (casaIdx.textContent !== txt) casaIdx.textContent = txt;
  }
  function updateCasa() {
    if (!casa || !casaPin) return;
    const r = casa.getBoundingClientRect();
    const p = casaMax > 0 ? clamp(-r.top / casaMax, 0, 1) : 0;
    casaTrack.style.transform = "translate3d(" + (-p * casaMax).toFixed(1) + "px,0,0)";
    setCasaProgress(p);
  }
  if (casaVp) {
    casaVp.addEventListener("scroll", () => {
      if (casaPin) return;
      const max = casaVp.scrollWidth - casaVp.clientWidth;
      setCasaProgress(max > 0 ? casaVp.scrollLeft / max : 0);
    }, { passive: true });
  }
  /* carrega as fotos da galeria antes de chegarem à tela */
  if (casa && "IntersectionObserver" in window) {
    const pre = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        $$("img", casa).forEach((i) => { i.loading = "eager"; });
        pre.disconnect();
      }
    }, { rootMargin: "100% 0px" });
    pre.observe(casa);
  }

  /* =================================================================
     10. PARALLAX, LINHAS DE PROGRESSO E HERO
     ================================================================= */
  const hero = $(".hero");
  const heroBg = $(".hero-bg");
  const heroGrid = $(".hero-grid");
  const pItems = $$("[data-parallax], [data-parallax-x], [data-pimg]").map((el) => {
    const host = el.parentElement;
    return { el, host, obs: host.classList.contains("r-clip") ? host.parentElement : host };
  });
  const visibleP = new Set();
  if ("IntersectionObserver" in window && !RM) {
    const pio = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) visibleP.add(e.target); else visibleP.delete(e.target); });
      needsUpdate = true;
    }, { rootMargin: "25% 0px" });
    new Set(pItems.map((it) => it.obs)).forEach((o) => pio.observe(o));
  }
  const progressEls = $$("[data-progress]");

  function updateParallax() {
    const H = vh(), W = vw();
    pItems.forEach(({ el, host, obs }) => {
      if (!visibleP.has(obs)) return;
      const r = host.getBoundingClientRect();
      const prog = clamp((r.top + r.height / 2 - H / 2) / (H / 2 + r.height / 2), -1, 1);
      if (el.hasAttribute("data-pimg")) {
        el.style.transform = "translate3d(0," + (-prog * r.height * 0.075).toFixed(1) + "px,0)";
      } else if (el.hasAttribute("data-parallax-x")) {
        const s = parseFloat(el.getAttribute("data-parallax-x")) || 0;
        el.style.transform = "translate3d(" + (prog * s * W).toFixed(1) + "px,0,0)";
      } else {
        const s = parseFloat(el.getAttribute("data-parallax")) || 0;
        el.style.transform = "translate3d(0," + (-prog * s * H).toFixed(1) + "px,0)";
      }
    });
  }

  function updateProgress() {
    const H = vh();
    progressEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > H + 100) return;
      const p = RM ? 1 : clamp((H * 0.85 - r.top) / (r.height + H * 0.4), 0, 1);
      el.style.setProperty("--p", p.toFixed(4));
      const days = $$(".day", el);
      days.forEach((d, i) => d.classList.toggle("lit", p >= (i + 0.1) / days.length));
    });
  }

  function updateHero(y) {
    if (RM || !hero) return;
    const h = hero.offsetHeight;
    if (y > h) return;
    heroBg.style.transform = "translate3d(0," + (y * 0.32).toFixed(1) + "px,0)";
    if (window.innerWidth > 1000) {
      heroGrid.style.transform = "translate3d(0," + (y * -0.1).toFixed(1) + "px,0)";
      heroGrid.style.opacity = clamp(1 - y / (h * 0.8), 0, 1).toFixed(3);
    } else if (heroGrid.style.opacity) {
      heroGrid.style.transform = ""; heroGrid.style.opacity = "";
    }
  }

  /* =================================================================
     11. MOUSE: parallax do hero, cartão 3D, cursor, magnéticos, brilho
     ================================================================= */
  const mouse = { x: -200, y: -200, hx: 0, hy: 0, cx: 0, cy: 0, inHero: false };
  const heroCard = $("[data-hero-card]");
  const cursor = $(".cursor");
  const ring = $(".cursor-ring"), dot = $(".cursor-dot"), ringLabel = $(".cursor-ring em");
  const ringPos = { x: -200, y: -200 };

  if (FINE && !RM) {
    root.classList.add("has-cursor");
    window.addEventListener("pointermove", (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      cursor.classList.remove("off");
      if (mouse.inHero) {
        mouse.hx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.hy = (e.clientY / vh()) * 2 - 1;
      }
    }, { passive: true });
    hero.addEventListener("pointerenter", () => { mouse.inHero = true; });
    hero.addEventListener("pointerleave", () => { mouse.inHero = false; mouse.hx = 0; mouse.hy = 0; });
    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget || e.relatedTarget.tagName === "IFRAME") cursor.classList.add("off");
    });
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor], a, button, summary, label");
      const lab = t && t.getAttribute("data-cursor");
      cursor.classList.toggle("label", !!lab);
      cursor.classList.toggle("hover", !!t && !lab);
      if (lab) ringLabel.textContent = lab;
    });
    window.addEventListener("pointerdown", () => { ring.style.scale = "0.85"; });
    window.addEventListener("pointerup", () => { ring.style.scale = ""; });

    /* cartão do hero em 3D */
    if (heroCard) {
      heroCard.addEventListener("pointermove", (e) => {
        const r = heroCard.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        heroCard.style.setProperty("--ry", ((px - 0.5) * 10).toFixed(2) + "deg");
        heroCard.style.setProperty("--rx", ((0.5 - py) * 10).toFixed(2) + "deg");
        heroCard.style.setProperty("--hx", (px * 100).toFixed(1) + "%");
        heroCard.style.setProperty("--hy", (py * 100).toFixed(1) + "%");
      });
      heroCard.addEventListener("pointerleave", () => {
        heroCard.style.setProperty("--rx", "0deg");
        heroCard.style.setProperty("--ry", "0deg");
      });
    }

    /* brilho que acompanha o mouse */
    document.addEventListener("pointermove", (e) => {
      const el = e.target.closest && e.target.closest("[data-spot]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", (e.clientX - r.left).toFixed(0) + "px");
      el.style.setProperty("--y", (e.clientY - r.top).toFixed(0) + "px");
    }, { passive: true });

    /* cards com inclinação 3D */
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        if (!el.classList.contains("done")) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = "transform .15s ease-out, box-shadow .4s, border-color .4s";
        el.style.transform = "perspective(900px) rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 7).toFixed(2) + "deg) translateY(-6px)";
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform .8s cubic-bezier(.22,1,.36,1), box-shadow .4s, border-color .4s";
        el.style.transform = "";
      });
    });

    /* botões magnéticos */
    $$("[data-magnetic]").forEach((el) => {
      const inner = el.querySelector("span");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate3d(" + (dx * 0.22).toFixed(1) + "px," + (dy * 0.35).toFixed(1) + "px,0)";
        if (inner) inner.style.transform = "translate3d(" + (dx * 0.12).toFixed(1) + "px," + (dy * 0.18).toFixed(1) + "px,0)";
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
        if (inner) inner.style.transform = "";
      });
    });
  }

  function updateMouse() {
    if (!FINE || RM) return;
    /* cursor */
    ringPos.x += (mouse.x - ringPos.x) * 0.2;
    ringPos.y += (mouse.y - ringPos.y) * 0.2;
    ring.style.transform = "translate3d(" + ringPos.x.toFixed(1) + "px," + ringPos.y.toFixed(1) + "px,0)";
    dot.style.transform = "translate3d(" + mouse.x + "px," + mouse.y + "px,0)";
    /* fundo do hero acompanha o mouse */
    if (hero && (mouse.inHero || Math.abs(mouse.cx) > 0.001 || Math.abs(mouse.cy) > 0.001)) {
      mouse.cx += (mouse.hx - mouse.cx) * 0.06;
      mouse.cy += (mouse.hy - mouse.cy) * 0.06;
      hero.style.setProperty("--mx", mouse.cx.toFixed(3));
      hero.style.setProperty("--my", mouse.cy.toFixed(3));
    }
  }

  /* =================================================================
     12. PARTÍCULAS DOURADAS (hero e CTA final)
     ================================================================= */
  function particles(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    let w = 0, h = 0, running = false, raf = 0;
    const n = window.innerWidth < 760 ? 26 : 64;
    const parts = [];
    const spawn = (p, init) => {
      p.x = Math.random() * w;
      p.y = init ? Math.random() * h : h + 10;
      p.r = Math.random() * 1.7 + 0.4;
      p.vy = -(Math.random() * 0.32 + 0.1);
      p.vx = (Math.random() - 0.5) * 0.12;
      p.a = Math.random() * 0.55 + 0.25;
      p.t = Math.random() * Math.PI * 2;
      p.ts = Math.random() * 0.02 + 0.006;
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    for (let i = 0; i < n; i++) { const p = {}; spawn(p, true); parts.push(p); }
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.t += p.ts;
        p.x += p.vx + Math.sin(p.t) * 0.18;
        p.y += p.vy;
        if (p.y < -12 || p.x < -12 || p.x > w + 12) spawn(p, false);
        const al = p.a * (0.55 + 0.45 * Math.sin(p.t * 2.3));
        ctx.beginPath();
        ctx.fillStyle = "rgba(224,184,102," + (al * 0.16).toFixed(3) + ")";
        ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "rgba(240,206,130," + al.toFixed(3) + ")";
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (running) raf = requestAnimationFrame(draw);
    };
    return {
      resize,
      start() { if (!running) { running = true; raf = requestAnimationFrame(draw); } },
      stop() { running = false; cancelAnimationFrame(raf); }
    };
  }
  const fields = [];
  if (!RM && "IntersectionObserver" in window) {
    $$("[data-particles]").forEach((c) => {
      const f = particles(c);
      if (!f) return;
      fields.push(f);
      new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? f.start() : f.stop()))).observe(c);
    });
  }

  /* =================================================================
     13. LAÇO PRINCIPAL (um único requestAnimationFrame)
     ================================================================= */
  let lastY = -1, vel = 0;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function frame(now) {
    if (smooth && smooth.on) {
      if (smooth.tween) {
        const tw = smooth.tween;
        const p = clamp((now - tw.t0) / tw.dur, 0, 1);
        smooth.cur = tw.from + (tw.to - tw.from) * easeIO(p);
        if (p === 1) { smooth.on = false; smooth.tween = null; }
      } else {
        smooth.cur += (smooth.to - smooth.cur) * 0.1;
        if (Math.abs(smooth.to - smooth.cur) < 0.4) { smooth.cur = smooth.to; smooth.on = false; }
      }
      window.scrollTo(0, smooth.cur);
    }

    const y = window.scrollY;
    const dy = lastY < 0 ? 0 : y - lastY;
    vel += (dy - vel) * 0.18;
    if (y !== lastY || needsUpdate) {
      updateHeader(y);
      updateHero(y);
      if (!RM) updateParallax();
      updateProgress();
      updateCasa();
      lastY = y;
      needsUpdate = false;
    }
    updateMouse();

    if (!RM) {
      const want = (vel < -0.3 ? -1 : 1) * (1 + Math.min(Math.abs(vel) * 0.12, 5));
      bands.forEach((b) => {
        if (!b.anim) return;
        b.rate += (want - b.rate) * 0.08;
        b.anim.playbackRate = b.rate;
      });
    }
    requestAnimationFrame(frame);
  }

  /* =================================================================
     14. GALERIA AMPLIADA
     ================================================================= */
  const lb = $(".lb");
  if (lb && typeof lb.showModal === "function" && casaTiles.length) {
    const lbImg = $("img", lb), lbCap = $("figcaption", lb);
    let idx = 0, lastTile = null;
    const show = (i) => {
      idx = (i + casaTiles.length) % casaTiles.length;
      const t = casaTiles[idx], im = $("img", t);
      lbImg.src = t.getAttribute("data-full");
      lbImg.alt = im.alt;
      lbCap.textContent = im.alt + " · " + (idx + 1) + "/" + casaTiles.length;
      lbImg.classList.remove("anim"); void lbImg.offsetWidth; lbImg.classList.add("anim");
    };
    casaTiles.forEach((t, i) => t.addEventListener("click", () => {
      lastTile = t; show(i); lb.showModal(); root.classList.remove("has-cursor");
    }));
    $(".lb-close", lb).addEventListener("click", () => lb.close());
    $(".lb-prev", lb).addEventListener("click", () => show(idx - 1));
    $(".lb-next", lb).addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener("close", () => {
      if (FINE && !RM) root.classList.add("has-cursor");
      if (lastTile) lastTile.focus({ preventScroll: true });
    });
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    let x0 = null;
    lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  } else {
    casaTiles.forEach((t) => t.addEventListener("click", () => window.open(t.getAttribute("data-full"), "_blank", "noopener")));
  }

  /* =================================================================
     15. PERGUNTAS FREQUENTES (abrir/fechar com animação)
     ================================================================= */
  const EASE = "cubic-bezier(.22,1,.36,1)";
  function closeFaq(d) {
    const body = $(".faq-a", d);
    if (!body || RM || !body.animate) { d.open = false; return; }
    const a = body.animate([{ height: body.scrollHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 420, easing: EASE });
    a.onfinish = () => { d.open = false; };
  }
  function openFaq(d) {
    d.open = true;
    const body = $(".faq-a", d);
    if (!body || RM || !body.animate) return;
    body.animate([{ height: "0px", opacity: 0 }, { height: body.scrollHeight + "px", opacity: 1 }], { duration: 560, easing: EASE });
  }
  $$(".faq details").forEach((d) => {
    $("summary", d).addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) { closeFaq(d); return; }
      $$(".faq details[open]").forEach((o) => { if (o !== d) closeFaq(o); });
      openFaq(d);
    });
  });

  /* =================================================================
     16. INICIALIZAÇÃO E REDIMENSIONAMENTO
     ================================================================= */
  function layout() {
    setupCasa();
    fields.forEach((f) => f.resize());
    needsUpdate = true;
  }
  layout();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { setupMarquees(); layout(); });
  window.addEventListener("load", layout);
  let rT = 0, lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      if (window.innerWidth !== lastW) { lastW = window.innerWidth; setupMarquees(); }
      layout();
    }, 150);
  });
  requestAnimationFrame(frame);
})();
