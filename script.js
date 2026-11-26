/* =========================================================
   PORTFOLIO — script.js (Vanilla ES6+)
   Needs i18n.js (window.QH_AR) loaded before it.
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* safe localStorage */
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  /* ---------- Language (EN / AR) ---------- */
  const AR = window.QH_AR || { text: {}, attrs: {}, html: {}, ui: {} };
  let lang = root.lang === "ar" ? "ar" : "en";
  const origText = new WeakMap();
  const origHtml = new WeakMap();
  const origAttr = new WeakMap();

  const t = (key, fallback) => (lang === "ar" && AR.ui[key]) || fallback;
  const ui = (key, en) => (lang === "ar" ? AR.ui[key] || en : en);

  function translateAttr(el, attr, value) {
    if (!value) return;
    let ar = AR.attrs[value];
    if (!ar) {
      let m = value.match(/^Open (.+) details$/);
      if (m) ar = `${AR.ui.openDetails} ${AR.text[m[1]] || m[1]}`;
      m = value.match(/^(.+) preview$/);
      if (!ar && m) ar = `${AR.ui.preview} ${AR.text[m[1]] || m[1]}`;
      m = value.match(/^(.+) certificate$/);
      if (!ar && m) ar = `${AR.ui.certificate} ${AR.text[m[1]] || m[1]}`;
    }
    return ar;
  }

  function applyLang(next) {
    lang = next;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    store.set("qh-lang", lang);

    // text nodes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !n.parentElement.closest("script,style,pre,noscript,[data-i18n-html]") && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    let node;
    while ((node = walker.nextNode())) {
      if (!origText.has(node)) origText.set(node, node.nodeValue);
      const orig = origText.get(node);
      const key = orig.trim();
      const ar = AR.text[key];
      node.nodeValue = lang === "ar" && ar ? orig.replace(key, ar) : orig;
    }
    // html blocks
    $$("[data-i18n-html]").forEach((el) => {
      if (!origHtml.has(el)) origHtml.set(el, el.innerHTML);
      el.innerHTML = lang === "ar" ? AR.html[el.dataset.i18nHtml] || origHtml.get(el) : origHtml.get(el);
    });
    // attributes
    $$("[placeholder],[aria-label],[title],img[alt]").forEach((el) => {
      ["placeholder", "aria-label", "title", "alt"].forEach((attr) => {
        const v = el.getAttribute(attr);
        if (v === null) return;
        let map = origAttr.get(el);
        if (!map) origAttr.set(el, (map = {}));
        if (!(attr in map)) map[attr] = v;
        const ar = translateAttr(el, attr, map[attr]);
        el.setAttribute(attr, lang === "ar" && ar ? ar : map[attr]);
      });
    });
    document.title = lang === "ar" ? AR.ui.title : "Qais Hamdan — Full Stack Web Developer";
    refreshToolLabels();
    restartTyping();
    refreshOpenModal();
    $$("#contactForm .field.has-error input, #contactForm .field.has-error textarea").forEach((i) => validateField(i));
    if (!formAlert.hidden) formAlert.hidden = true;
  }

  /* ---------- Theme + accent ---------- */
  const themeBtn = $("#themeToggle");
  const paletteWrap = $("#palette");
  const paletteBtn = $("#paletteBtn");
  const langBtn = $("#langToggle");
  const themeMeta = $('meta[name="theme-color"]');
  let particleRGB = "230,57,70";

  function readAccent() {
    particleRGB = getComputedStyle(root).getPropertyValue("--accent-rgb").replace(/\s/g, "") || particleRGB;
    if (themeMeta) themeMeta.content = root.dataset.theme === "light" ? "#f5f6fa" : "#0A0A0C";
  }
  function refreshToolLabels() {
    const light = root.dataset.theme === "light";
    themeBtn.innerHTML = `<i class="fa-solid ${light ? "fa-sun" : "fa-moon"}"></i>`;
    themeBtn.setAttribute("aria-pressed", String(light));
    const label = light ? "Switch to dark theme" : "Switch to light theme";
    themeBtn.setAttribute("aria-label", lang === "ar" ? AR.attrs[label] : label);
    const lbl = lang === "ar" ? "Switch language to English" : "Switch language to Arabic";
    langBtn.setAttribute("aria-label", lbl);
    $$(".swatch", paletteWrap).forEach((s) => s.classList.toggle("is-active", s.dataset.accent === (root.dataset.accent || "red")));
  }
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    store.set("qh-theme", root.dataset.theme);
    refreshToolLabels(); readAccent();
  });
  paletteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !paletteWrap.classList.contains("is-open");
    paletteWrap.classList.toggle("is-open", open);
    paletteBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#palette")) { paletteWrap.classList.remove("is-open"); paletteBtn.setAttribute("aria-expanded", "false"); }
  });
  $$(".swatch", paletteWrap).forEach((s) => s.addEventListener("click", () => {
    root.dataset.accent = s.dataset.accent;
    store.set("qh-accent", s.dataset.accent);
    refreshToolLabels(); readAccent();
    paletteWrap.classList.remove("is-open");
  }));
  langBtn.addEventListener("click", () => applyLang(lang === "ar" ? "en" : "ar"));

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2400);
  }

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Loader ---------- */
  const loader = $("#loader");
  const hideLoader = () => loader && loader.classList.add("is-done");
  if (document.readyState === "complete") setTimeout(hideLoader, 350);
  else window.addEventListener("load", () => setTimeout(hideLoader, 450));
  setTimeout(hideLoader, 2500);

  /* ---------- Scroll: navbar, progress, timeline, hire bar ---------- */
  const navbar = $("#navbar");
  const progress = $("#progress");
  const timeline = $("#timeline");
  const hireBar = $("#hireBar");
  const heroInner = $(".hero__inner");
  const glowOne = $(".glow--one"), glowTwo = $(".glow--two");
  let ticking = false;

  /* Marquee speeds up (and eases back) while you scroll */
  let mqAnims = [], mqLastY = window.scrollY, mqVel = 0, mqRunning = false;
  function bumpMarquee(y) {
    if (!mqAnims.length) mqAnims = $$(".marquee__track").flatMap((t) => t.getAnimations());
    mqVel += (y - mqLastY) * 0.06; mqLastY = y;
    if (!mqRunning) { mqRunning = true; requestAnimationFrame(mqStep); }
  }
  function mqStep() {
    mqVel *= 0.92;
    const rate = 1 + Math.min(Math.abs(mqVel), 9);
    mqAnims.forEach((a) => (a.playbackRate = rate));
    if (Math.abs(mqVel) > 0.02) requestAnimationFrame(mqStep);
    else { mqAnims.forEach((a) => (a.playbackRate = 1)); mqRunning = false; mqVel = 0; }
  }

  /* Marquee: repeat the items enough that the strip never runs out on wide screens (loop needs 2 equal halves >= viewport) */
  const mqSource = $$(".marquee__track").map((t) => { const n = [...t.children]; return { t, unit: n.slice(0, n.length / 2).map((x) => x.cloneNode(true)) }; });
  function fillMarquees() {
    const need = Math.max(window.innerWidth, 1920) + 200;
    mqSource.forEach(({ t, unit }) => {
      t.replaceChildren(...unit.map((x) => x.cloneNode(true)));
      const unitW = t.scrollWidth || 1;
      const k = Math.max(1, Math.ceil(need / unitW));
      const half = [];
      for (let i = 0; i < k; i++) unit.forEach((x) => half.push(x.cloneNode(true)));
      t.replaceChildren(...half, ...half.map((x) => x.cloneNode(true)));
    });
    mqAnims = [];
  }
  let mqResizeT;
  window.addEventListener("resize", () => { clearTimeout(mqResizeT); mqResizeT = setTimeout(fillMarquees, 300); });
  window.addEventListener("load", fillMarquees);
  fillMarquees();

  function onScroll() {
    const y = window.scrollY;
    navbar.classList.toggle("is-scrolled", y > 12);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    if (hireBar) hireBar.classList.toggle("is-visible", y > window.innerHeight * 0.7);
    if (!reduceMotion) {
      const hp = Math.min(y / (window.innerHeight * 0.85), 1);
      if (heroInner) { heroInner.style.translate = `0 ${hp * 70}px`; heroInner.style.opacity = String(1 - hp * 0.85); }
      glowOne.style.translate = `0 ${-y * 0.15}px`; glowTwo.style.translate = `0 ${y * 0.1}px`;
      $$(".timeline__item").forEach((it) => it.classList.toggle("is-reached", $(".timeline__dot", it).getBoundingClientRect().top < window.innerHeight * 0.62));
      bumpMarquee(y);
    }
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = (window.innerHeight * 0.6 - r.top) / r.height;
      timeline.style.setProperty("--progress", Math.max(0, Math.min(1, p)).toFixed(3));
    }
    ticking = false;
  }
  onScroll();
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---------- Mobile drawer ---------- */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const backdrop = $("#navBackdrop");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-visible", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  }
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  backdrop.addEventListener("click", () => setMenu(false));
  $$(".nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia("(min-width: 900px)").addEventListener("change", (e) => e.matches && setMenu(false));

  /* ---------- Active nav link ---------- */
  const links = $$(".nav__link");
  const sections = links.map((l) => $(l.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${entry.target.id}`));
      }),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Count-up ---------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now(), dur = 1400;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Text scramble (headings decode when they appear) ---------- */
  const GLYPHS = "!<>-_/[]{}=+*^?#01";
  function scramble(el) {
    if (reduceMotion || lang === "ar") return;
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!node) return;
    if (!origText.has(node)) origText.set(node, node.nodeValue);
    const final = node.nodeValue, chars = [...final];
    const dur = Math.min(950, 320 + chars.length * 30), start = performance.now();
    el.style.minHeight = `${el.offsetHeight}px`;
    const frame = (now) => {
      const p = Math.min((now - start) / dur, 1), done = Math.floor(p * chars.length);
      node.nodeValue = p < 1 ? chars.map((c, i) => (c === " " || i < done ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("") : final;
      if (p < 1) requestAnimationFrame(frame); else el.style.minHeight = "";
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Scroll reveal ---------- */
  const reveal = (el) => {
    el.classList.add("is-visible");
    $$("[data-count]", el).forEach(countUp);
    if (el.matches(".section__head, .sub-head")) $$(".eyebrow, h2, h3", el).forEach(scramble);
    const delay = parseInt(el.style.getPropertyValue("--delay"), 10) || 0;
    setTimeout(() => el.classList.add("is-done"), 900 + delay);
  };
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries, obs) => entries.forEach((entry) => {
          if (entry.isIntersecting) { reveal(entry.target); obs.unobserve(entry.target); }
        }),
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      )
    : null;
  function watchReveal(el) {
    if (!io) return reveal(el);
    const index = [...el.parentElement.children].indexOf(el);
    el.style.setProperty("--delay", `${Math.min(index, 5) * 80}ms`);
    io.observe(el);
  }
  $$(".reveal").forEach(watchReveal);

  /* ---------- Typing effect ---------- */
  const typedEl = $("#typed");
  const rolesEn = (AR.ui && AR.ui.rolesEn) || ["Full Stack Web Developer", "ASP.NET Core Developer", "PHP & MySQL Developer", "Problem Solver"];
  let typingTimer, typingRun = 0;
  function restartTyping() {
    if (!typedEl) return;
    clearTimeout(typingTimer);
    const run = ++typingRun;
    const roles = lang === "ar" && AR.ui.roles ? AR.ui.roles : rolesEn;
    if (reduceMotion) { typedEl.textContent = roles[0]; return; }
    let r = 0, c = 0, deleting = false;
    typedEl.textContent = "";
    const tick = () => {
      if (run !== typingRun) return;
      const word = roles[r];
      c += deleting ? -1 : 1;
      typedEl.textContent = word.slice(0, c);
      let wait = deleting ? 35 : 75;
      if (!deleting && c === word.length) { deleting = true; wait = 1500; }
      else if (deleting && c === 0) { deleting = false; r = (r + 1) % roles.length; wait = 350; }
      typingTimer = setTimeout(tick, wait);
    };
    typingTimer = setTimeout(tick, 500);
  }

  /* ---------- Hero spotlight, tilt, magnetic buttons ---------- */
  const hero = $(".hero");
  const avatar = $("#avatar");
  const codeWin = $(".code-window");
  if (finePointer && !reduceMotion) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--hx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--hy", `${e.clientY - r.top}px`);
      if (avatar) {
        const a = avatar.getBoundingClientRect();
        const dx = (e.clientX - (a.left + a.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (a.top + a.height / 2)) / window.innerHeight;
        avatar.style.transform = `perspective(700px) rotateY(${dx * 14}deg) rotateX(${-dy * 14}deg)`;
      }
    });
    hero.addEventListener("pointerleave", () => { if (avatar) avatar.style.transform = ""; });
    if (codeWin) {
      const host = codeWin.parentElement;
      host.addEventListener("pointermove", (e) => {
        const r = codeWin.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        codeWin.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      });
      host.addEventListener("pointerleave", () => (codeWin.style.transform = ""));
    }
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.18}px, ${(e.clientY - (r.top + r.height / 2)) * 0.25 - 3}px)`;
      });
      btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
    });
  }

  /* ---------- Custom cursor (mouse only) ---------- */
  if (finePointer && !reduceMotion) {
    const ring = $("#cursor"), dot = $("#cursorDot");
    let x = -100, y = -100, rx = -100, ry = -100;
    root.classList.add("has-cursor");
    window.addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      ring.classList.toggle("is-hover", Boolean(e.target.closest("a, button, [role='button'], .chip, .pill, .swatch")));
    }, { passive: true });
    const follow = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    };
    follow();
  }

  /* ---------- Card cursor glow (delegated so new cards work too) ---------- */
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest && e.target.closest(".card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  /* ---------- Background particles ---------- */
  const canvas = $("#bgCanvas");
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    let w, h, dots = [], raf, running = true;
    const mouse = { x: -999, y: -999 };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 700 ? 28 : 55;
      dots = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28, r: Math.random() * 1.6 + 0.6 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283);
        ctx.fillStyle = `rgba(${particleRGB},0.7)`; ctx.fill();
        for (let j = i + 1; j < dots.length; j++) {
          const o = dots[j], dx = d.x - o.x, dy = d.y - o.y, dist = dx * dx + dy * dy;
          if (dist < 14000) {
            ctx.strokeStyle = `rgba(${particleRGB},${0.22 * (1 - dist / 14000)})`;
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y); ctx.stroke();
          }
        }
        const mx = d.x - mouse.x, my = d.y - mouse.y;
        if (mx * mx + my * my < 18000) { d.x += mx * 0.002; d.y += my * 0.002; }
      }
      if (running) raf = requestAnimationFrame(draw);
    };
    size(); draw();
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) draw(); else cancelAnimationFrame(raf);
    });
  }

  /* ---------- Project filter ---------- */
  const filterBtns = $$(".filter");
  const projects = $$(".project-card");
  const emptyState = $("#emptyState");
  function applyFilter(category) {
    let visible = 0;
    projects.forEach((card) => {
      const match = category === "all" || card.dataset.category.split(" ").includes(category);
      card.classList.toggle("is-hidden", !match);
      card.classList.remove("is-entering");
      if (match) {
        visible++;
        card.classList.add("is-visible", "is-done");
        void card.offsetWidth;
        card.classList.add("is-entering");
      }
    });
    emptyState.hidden = visible !== 0;
  }
  filterBtns.forEach((btn) => btn.addEventListener("click", () => {
    filterBtns.forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });
    applyFilter(btn.dataset.filter);
  }));

  /* ---------- Modals (project + CV) ---------- */
  let activeModal = null, lastFocus = null, closeTimer;

  function showModal(modal) {
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    activeModal = modal;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    $(".modal__panel", modal).scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
    $(".modal__close", modal).focus();
  }
  function hideModal() {
    if (!activeModal) return;
    const m = activeModal;
    if (m === projModal) {
      try { if (location.hash.startsWith("#project-")) history.replaceState(null, "", `${location.pathname}${location.search}`); } catch { /* ignore */ }
    }
    m.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    closeTimer = setTimeout(() => { m.hidden = true; }, 380);
    activeModal = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) hideModal(); }));

  /* project popup */
  const projModal = $("#projectModal");
  const modalImg = $("#modalImg"), modalTitle = $("#modalTitle"), modalBody = $("#modalBody");
  let currentCard = null;
  const visibleCards = () => projects.filter((c) => !c.classList.contains("is-hidden"));

  function fillProject(card) {
    currentCard = card;
    const img = $(".project-card__media img", card);
    modalImg.src = img.src; modalImg.alt = img.alt;
    modalTitle.innerHTML = $("h3", card).innerHTML;
    modalBody.innerHTML = $(".project-detail", card).innerHTML;
    $(".modal__panel", projModal).scrollTop = 0;
    try { history.replaceState(null, "", `${location.pathname}${location.search}#project-${card.dataset.project}`); } catch { /* file:// or sandbox */ }
  }
  function openProject(card) { fillProject(card); showModal(projModal); }
  function stepProject(dir) {
    const list = visibleCards();
    if (!list.length) return;
    const i = list.indexOf(currentCard);
    fillProject(list[(i + dir + list.length) % list.length]);
  }
  projects.forEach((card) => {
    card.addEventListener("click", () => openProject(card));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProject(card); } });
  });
  $("#copyProjectLink").addEventListener("click", async () => {
    const url = `${location.href.split("#")[0]}#project-${currentCard.dataset.project}`;
    try { await navigator.clipboard.writeText(url); showToast(ui("linkCopied", "Link copied!")); }
    catch { showToast(url); }
  });
  $("#modalPrev").addEventListener("click", () => stepProject(-1));
  $("#modalNext").addEventListener("click", () => stepProject(1));

  /* certificate gallery + popup */
  const certModal = $("#certModal");
  const certCards = $$(".cert");
  const certTabs = $$("[data-cert-filter]");
  let currentCert = null;
  const certCountEl = $("#certCount");
  if (certCountEl && certCards.length) certCountEl.dataset.count = String(certCards.length);
  const visibleCerts = () => certCards.filter((c) => !c.classList.contains("is-hidden"));
  function fillCert(card) {
    currentCert = card;
    const img = $("#certImg");
    img.src = card.dataset.full;
    img.alt = $("img", card).alt;
    $("#certTitle").textContent = $(".cert__title", card).textContent;
    $("#certSub").textContent = $$(".cert__meta > *", card).map((n) => n.textContent).join(" · ");
    $("#certPdf").href = card.dataset.pdf;
    $(".modal__panel", certModal).scrollTop = 0;
  }
  function openCert(card) { fillCert(card); showModal(certModal); }
  function stepCert(dir) {
    const list = visibleCerts();
    if (!list.length) return;
    fillCert(list[(list.indexOf(currentCert) + dir + list.length) % list.length]);
  }
  function refreshOpenModal() {
    if (activeModal === projModal && currentCard) { const y = $(".modal__panel", projModal).scrollTop; fillProject(currentCard); $(".modal__panel", projModal).scrollTop = y; }
    else if (activeModal === certModal && currentCert) fillCert(currentCert);
  }
  certCards.forEach((c) => c.addEventListener("click", () => openCert(c)));
  $("#certPrev").addEventListener("click", () => stepCert(-1));
  $("#certNext").addEventListener("click", () => stepCert(1));
  $$("[data-open-cert]").forEach((b) => b.addEventListener("click", () => {
    const card = $(`.cert[data-cert="${b.dataset.openCert}"]`);
    if (card) openCert(card);
  }));
  certTabs.forEach((btn) => btn.addEventListener("click", () => {
    certTabs.forEach((b) => { const on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    certCards.forEach((c) => {
      const match = btn.dataset.certFilter === "all" || c.dataset.group === btn.dataset.certFilter;
      c.classList.toggle("is-hidden", !match);
      c.classList.remove("is-entering");
      if (match) { c.classList.add("is-visible", "is-done"); void c.offsetWidth; c.classList.add("is-entering"); }
    });
  }));

  /* QR code for the CV: only on a real website address, loaded the first time the CV popup opens */
  let qrDone = false;
  function makeQr() {
    if (qrDone || !/^https?:$/.test(location.protocol)) return;
    qrDone = true;
    const draw = () => {
      try {
        const box = $("#cvQrCode");
        new window.QRCode(box, { text: new URL("CV_Qais_Hamdan.pdf", location.href).href, width: 150, height: 150, colorDark: "#0A0A0C", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
        $("#cvQr").hidden = false;
      } catch { /* QR is a nice-to-have */ }
    };
    if (window.QRCode) return draw();
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    sc.onload = draw; sc.onerror = () => { qrDone = false; };
    document.head.append(sc);
  }

  /* CV popup (the PDF loads only when first opened) */
  const cvModal = $("#cvModal");
  $$("[data-open-cv]").forEach((b) => b.addEventListener("click", () => {
    const obj = $(".cv-frame", cvModal);
    if (!obj.getAttribute("data") && obj.dataset.src) obj.setAttribute("data", obj.dataset.src);
    showModal(cvModal);
    makeQr();
  }));

  document.addEventListener("keydown", (e) => {
    if (!activeModal) return;
    if (e.key === "Escape") hideModal();
    if (activeModal === projModal && e.key === "ArrowRight") stepProject(lang === "ar" ? -1 : 1);
    if (activeModal === projModal && e.key === "ArrowLeft") stepProject(lang === "ar" ? 1 : -1);
    if (activeModal === certModal && e.key === "ArrowRight") stepCert(lang === "ar" ? -1 : 1);
    if (activeModal === certModal && e.key === "ArrowLeft") stepCert(lang === "ar" ? 1 : -1);
    if (e.key === "Tab") {
      const f = $$("a[href], button, object", activeModal).filter((el) => el.offsetParent !== null && el.tagName !== "OBJECT");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Copy email ---------- */
  const copyBtn = $("#copyEmail");
  copyBtn.addEventListener("click", async () => {
    const email = copyBtn.dataset.email;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(email);
      else {
        const tmp = document.createElement("textarea");
        tmp.value = email; tmp.style.position = "fixed"; tmp.style.opacity = "0";
        document.body.appendChild(tmp); tmp.select(); document.execCommand("copy"); tmp.remove();
      }
      showToast(ui("copied", "Copied!"));
    } catch {
      showToast(ui("copyFail", "Couldn't copy — please copy manually"));
    }
  });

  /* ---------- Contact form ---------- */
  const form = $("#contactForm");
  const formAlert = $("#formAlert");
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/xwlowevl";
  const rules = {
    name: (v) => (v.trim().length < 2 ? ui("vName", "Please enter your name (min. 2 characters).") : ""),
    email: (v) => (!emailRe.test(v.trim()) ? ui("vEmail", "Please enter a valid email address.") : ""),
    message: (v) => (v.trim().length < 10 ? ui("vMsg", "Message should be at least 10 characters.") : ""),
  };
  function validateField(input) {
    const error = rules[input.name](input.value);
    const field = input.closest(".field");
    field.classList.toggle("has-error", Boolean(error));
    field.classList.toggle("is-valid", !error && input.value.trim() !== "");
    $(".field__error", field).textContent = error;
    input.setAttribute("aria-invalid", String(Boolean(error)));
    return !error;
  }
  const formFields = () => $$("input, textarea", form).filter((i) => rules[i.name]);
  formFields().forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => { if (input.closest(".field").classList.contains("has-error")) validateField(input); });
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inputs = formFields();
    const allValid = inputs.map(validateField).every(Boolean);
    formAlert.hidden = false;
    if (!allValid) {
      formAlert.className = "form__alert is-error";
      formAlert.textContent = ui("formFix", "Please fix the highlighted fields and try again.");
      inputs.find((i) => i.getAttribute("aria-invalid") === "true")?.focus();
      return;
    }
    const submitBtn = $("button[type='submit']", form);
    if (submitBtn) submitBtn.disabled = true;
    try {
      if (navigator.onLine === false) throw new Error("offline");
      const data = new FormData(form);
      if (data.get("_gotcha")) throw new Error("spam");
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 15000);
      let res;
      try { res = await fetch(FORMSPREE_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" }, signal: ctrl.signal }); }
      finally { clearTimeout(to); }
      if (!res.ok) throw new Error("Formspree submission failed");
      formAlert.className = "form__alert is-success";
      formAlert.textContent = ui("formOk", "Thanks! Your message has been sent.");
      showToast(ui("sent", "Message sent ✓"));
      form.reset();
      $$(".field", form).forEach((f) => f.classList.remove("is-valid", "has-error"));
      setTimeout(() => (formAlert.hidden = true), 6000);
    } catch (err) {
      formAlert.className = "form__alert is-error";
      formAlert.textContent = err.message === "offline" ? ui("offline", "You appear to be offline. Check your connection and try again.")
        : err.name === "AbortError" ? ui("timeout", "Sending took too long. Please try again.")
        : ui("formErr", "Couldn't send your message right now. Please try again.");
      showToast(ui("sendFail", "Send failed"));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  /* ---------- Easter egg: Konami code or 5 taps on the logo ---------- */
  const confettiCv = $("#confetti");
  function confetti() {
    if (reduceMotion) { showToast(ui("egg", "🎉 You found it!")); return; }
    const ctx = confettiCv.getContext("2d");
    confettiCv.width = innerWidth; confettiCv.height = innerHeight;
    const colors = [particleRGB.split(",").length === 3 ? `rgb(${particleRGB})` : "#E63946", "#fff", "#facc15", "#22c55e", "#60a5fa"];
    const bits = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.6, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      s: Math.random() * 7 + 4, c: colors[(Math.random() * colors.length) | 0], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    }));
    let frames = 0;
    const loop = () => {
      ctx.clearRect(0, 0, confettiCv.width, confettiCv.height);
      bits.forEach((b) => {
        b.vy += 0.35; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 3, b.s, b.s / 1.6); ctx.restore();
      });
      if (++frames < 150) requestAnimationFrame(loop); else ctx.clearRect(0, 0, confettiCv.width, confettiCv.height);
    };
    loop();
    showToast(ui("egg", "🎉 You found it!"));
  }
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let ci = 0;
  document.addEventListener("keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    ci = k === code[ci] ? ci + 1 : k === code[0] ? 1 : 0;
    if (ci === code.length) { ci = 0; confetti(); }
  });
  let taps = 0, tapTimer;
  $(".logo").addEventListener("click", () => {
    taps++; clearTimeout(tapTimer); tapTimer = setTimeout(() => (taps = 0), 1200);
    if (taps >= 5) { taps = 0; confetti(); }
  });

  /* ---------- Offline support (PWA) ---------- */
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  /* ---------- 3D tilt + glare on cards ---------- */
  if (finePointer && !reduceMotion) {
    $$(".project-card, .offer__card, .bento__card").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        if (!el.classList.contains("is-done")) return;
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateY(-6px)`;
        el.style.setProperty("--gx", `${x * 100}%`); el.style.setProperty("--gy", `${y * 100}%`);
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  /* ---------- Click sparks ---------- */
  if (!reduceMotion) {
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest("input, textarea, select, .modal__panel")) return;
      const ring = document.createElement("span");
      ring.className = "spark-ring";
      ring.style.left = `${e.clientX - 7}px`; ring.style.top = `${e.clientY - 7}px`;
      document.body.append(ring);
      ring.animate([{ transform: "scale(1)", opacity: 0.9 }, { transform: "scale(5)", opacity: 0 }], { duration: 600, easing: "ease-out" }).onfinish = () => ring.remove();
      for (let i = 0; i < 10; i++) {
        const sp = document.createElement("span");
        sp.className = "spark";
        sp.style.left = `${e.clientX - 3.5}px`; sp.style.top = `${e.clientY - 3.5}px`;
        document.body.append(sp);
        const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.5, d = 28 + Math.random() * 46;
        sp.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0)`, opacity: 0 }], { duration: 500 + Math.random() * 350, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => sp.remove();
      }
    }, { passive: true });
  }

  /* ---------- "Currently learning" strip shows itself once you add items ---------- */
  const learning = $("#learning");
  if (learning && $$("li", learning).length) learning.hidden = false;

  /* ---------- Open a project straight from a shared link (#project-p1) ---------- */
  const deep = location.hash.match(/^#project-(p\d+)$/);
  if (deep) {
    const card = $(`.project-card[data-project="${deep[1]}"]`);
    if (card) setTimeout(() => { $("#projects").scrollIntoView(); openProject(card); }, 1000);
  }

  /* ---------- Init ---------- */
  readAccent();
  refreshToolLabels();
  if (lang === "ar") applyLang("ar"); else restartTyping();
})();
