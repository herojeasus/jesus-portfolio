/* Detail layer: film-language micro-interactions on top of app.js and motion.js.
   Re-mounts after every render. Respects prefers-reduced-motion and RTL. */
(() => {
  const html = document.documentElement;
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const touch = matchMedia('(hover:none)');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const vtOK = () => typeof document.startViewTransition === 'function' && !reduced();
  const FPS = 25;
  const digits = s => (lang === 'fa' ? faDigit(s) : String(s));
  const pad = n => String(n).padStart(2, '0');
  const timecode = t => { const f = Math.floor(t * FPS); return [Math.floor(f / FPS / 3600), Math.floor(f / FPS / 60) % 60, Math.floor(f / FPS) % 60, f % FPS].map(pad).join(':'); };
  const make = (tag, cls, markup = '') => { const el = document.createElement(tag); el.className = cls; el.innerHTML = markup; return el; };
  const ease = 'cubic-bezier(.77,0,.175,1)';
  let unmount = [];

  html.classList.add('fx-on');

  /* ---------- Cursor (desktop only, created once) ---------- */
  function initCursor() {
    if (!fine.matches || reduced()) return;
    const ring = make('div', 'fx-cursor', '<span class="fx-cursor-label"></span>');
    const dot = make('div', 'fx-cursor-dot');
    const label = ring.firstChild;
    document.body.append(ring, dot);
    let x = 0, y = 0, rx = 0, ry = 0, seen = false;
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      dot.style.translate = `${x}px ${y}px`;
      if (!seen) { seen = true; rx = x; ry = y; html.classList.add('fx-cursor-on'); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => html.classList.remove('fx-cursor-on'));
    document.addEventListener('mouseenter', () => { if (seen) html.classList.add('fx-cursor-on'); });
    (function loop() {
      rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
      ring.style.translate = `${rx}px ${ry}px`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', e => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const play = t.closest('.project-card,.bts-full-open,.photo-open');
      const link = !play && t.closest('a,button,[role=button],label,video');
      ring.classList.toggle('is-play', !!play);
      ring.classList.toggle('is-link', !!link);
      label.textContent = play ? (play.matches('.photo-open') ? B('VIEW', 'دیدن') : B('PLAY', 'پخش')) : '';
    });
    addEventListener('pointerdown', () => ring.classList.add('is-down'));
    addEventListener('pointerup', () => ring.classList.remove('is-down'));
  }

  /* ---------- Page-change wipe with a slate (created once) ---------- */
  const shutter = make('div', 'fx-shutter', '<i class="fx-shutter-edge"></i><div class="fx-slate"><span class="fx-slate-meta"></span><strong class="fx-slate-title"></strong><span class="fx-slate-tc"></span></div>');
  shutter.setAttribute('aria-hidden', 'true');
  document.body.append(shutter);
  const sceneOrder = ['home', 'works', 'backstage', 'about'];
  const sceneName = r => ({ home: B('HOME', 'خانه'), works: B('SELECTED WORK', 'کارهای منتخب'), backstage: B('BACKSTAGE', 'پشت‌صحنه'), about: B('ABOUT ME', 'درباره من'), thoughts: B('ABOUT ME', 'درباره من') })[r];
  function wipe(phase) {
    const rtl = lang === 'fa';
    const hidden = rtl ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
    const gone = rtl ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
    const shown = 'inset(0 0 0 0)';
    const edgeFrom = rtl ? '100%' : '0%', edgeTo = rtl ? '0%' : '100%';
    const slate = shutter.querySelector('.fx-slate');
    const opts = { duration: phase === 'in' ? 420 : 560, easing: ease, fill: 'forwards' };
    const a = shutter.animate({ clipPath: phase === 'in' ? [hidden, shown] : [shown, gone] }, opts);
    shutter.querySelector('.fx-shutter-edge').animate({ left: [edgeFrom, edgeTo], opacity: [1, 1, 0] }, opts);
    slate.animate(phase === 'in'
      ? { opacity: [0, 1], transform: ['translateY(14px)', 'none'] }
      : { opacity: [1, 0], transform: ['none', 'translateY(-10px)'] },
      { duration: phase === 'in' ? 380 : 260, delay: phase === 'in' ? 160 : 0, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' });
    return a.finished.catch(() => {});
  }
  const pause = ms => new Promise(r => setTimeout(r, ms));

  changePage = async function (nextRoute, url, push = true) {
    if (navigationBusy) return;
    if (!['home', 'works', 'about', 'thoughts', 'backstage'].includes(nextRoute)) return;
    navigationBusy = true;
    if (push) history.replaceState({ view: route, scroll: scrollY }, '', location.href);
    const animate = !reduced();
    if (animate) {
      const n = sceneOrder.indexOf(nextRoute === 'thoughts' ? 'about' : nextRoute) + 1;
      shutter.querySelector('.fx-slate-meta').textContent = B(`SCENE ${pad(n)} · TAKE 01`, `سکانس ${digits(pad(n))} · برداشت ${digits('01')}`);
      shutter.querySelector('.fx-slate-title').textContent = sceneName(nextRoute);
      shutter.querySelector('.fx-slate-tc').textContent = digits(timecode(performance.now() / 1000));
      [shutter, ...shutter.querySelectorAll('*')].forEach(el => el.getAnimations().forEach(a => a.cancel()));
      shutter.classList.add('is-active');
      await wipe('in');
      await pause(140);
    }
    route = nextRoute;
    if (push) history.pushState({ view: route, scroll: 0 }, '', url);
    render();
    window.scrollTo({ top: push ? 0 : (history.state?.scroll || 0), behavior: 'instant' });
    const main = document.querySelector('main');
    main?.setAttribute('tabindex', '-1');
    main?.focus({ preventScroll: true });
    if (animate) { await wipe('out'); shutter.classList.remove('is-active'); [shutter, ...shutter.querySelectorAll('*')].forEach(el => el.getAnimations().forEach(a => a.cancel())); }
    navigationBusy = false;
  };

  /* ---------- Theme & language: view-transition sweeps ---------- */
  document.addEventListener('click', e => {
    const t = e.target instanceof Element ? e.target : null;
    const themeBtn = t?.closest('.theme-toggle');
    const langBtn = t?.closest('[data-lang]');
    if (!themeBtn && !langBtn) return;
    if (!vtOK()) return;
    if (langBtn && langBtn.dataset.lang === lang) return;
    e.stopImmediatePropagation(); e.preventDefault();
    const y = scrollY;
    const r = (themeBtn || langBtn).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    html.classList.add('fx-vt-plain');
    const toFa = langBtn && langBtn.dataset.lang === 'fa';
    const vt = document.startViewTransition(() => {
      if (themeBtn) { theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('portfolio-theme-v2', theme); } catch (_) {} }
      else { lang = langBtn.dataset.lang; try { localStorage.setItem('portfolio-lang', lang); } catch (_) {} }
      render();
      window.scrollTo({ top: y, behavior: 'instant' });
    });
    vt.ready.then(() => {
      const radius = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
      const frames = themeBtn
        ? { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`] }
        : { clipPath: [toFa ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)', 'inset(0 0 0 0)'] };
      html.animate(frames, { duration: themeBtn ? 760 : 680, easing: ease, pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
    vt.finished.finally(() => html.classList.remove('fx-vt-plain'));
  }, true);

  /* ---------- Player: cover expands into the player and folds back ---------- */
  const baseOpen = openProject;
  openProject = function (i, source = null) {
    const frame = source?.querySelector?.('.project-image');
    if (!vtOK() || !frame) { baseOpen(i, source); afterOpen(); return; }
    stopPreview(source);
    frame.style.viewTransitionName = 'fx-cinema';
    html.classList.add('fx-vt-cinema');
    const vt = document.startViewTransition(() => {
      frame.style.viewTransitionName = '';
      baseOpen(i, source);
      cinemaAnimation?.cancel();
      const stage = document.querySelector('#project-dialog .cinema-stage');
      if (stage) stage.style.viewTransitionName = 'fx-cinema';
      prepareStagger();
    });
    vt.finished.finally(() => {
      const stage = document.querySelector('#project-dialog .cinema-stage');
      if (stage) stage.style.viewTransitionName = '';
      html.classList.remove('fx-vt-cinema');
      runStagger();
    });
  };
  function afterOpen() { prepareStagger(); runStagger(); }
  function prepareStagger() {
    if (reduced()) return;
    document.querySelectorAll('#project-dialog .dialog-copy > *, #project-dialog .credits-list > div').forEach(el => el.classList.add('fx-stagger'));
  }
  function runStagger() {
    document.querySelectorAll('#project-dialog .fx-stagger').forEach((el, k) => {
      el.animate({ opacity: [0, 1], transform: ['translateY(16px)', 'none'] }, { duration: 620, delay: 60 + Math.min(k, 14) * 45, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'both' })
        .finished.then(() => el.classList.remove('fx-stagger')).catch(() => {});
    });
  }
  const baseClose = closeCinema;
  closeCinema = function (immediate = false) {
    const dialog = document.querySelector('#project-dialog');
    const stage = dialog?.querySelector('.cinema-stage');
    const card = cinemaSource?.closest?.('.project-card');
    const frame = card?.querySelector('.project-image');
    const visible = frame && (() => { const r = frame.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })();
    if (!dialog?.open || !vtOK() || !stage || !visible) return baseClose(immediate);
    stage.style.viewTransitionName = 'fx-cinema';
    html.classList.add('fx-vt-cinema');
    const vt = document.startViewTransition(async () => {
      stage.style.viewTransitionName = '';
      await baseClose(true);
      frame.style.viewTransitionName = 'fx-cinema';
    });
    return vt.finished.finally(() => { frame.style.viewTransitionName = ''; html.classList.remove('fx-vt-cinema'); });
  };

  /* ---------- Cards: live footage, viewfinder, tilt, scanner reveal ---------- */
  const previewSrc = id => `previews/p-${pad(id)}.mp4`;
  function ensurePreview(card) {
    if (card._fxVideo) return card._fxVideo;
    const rec = projectRecords[+card.dataset.project];
    if (!rec) return null;
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto' });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.className = 'fx-preview'; v.src = previewSrc(rec.id);
    card.querySelector('.project-image').prepend(v);
    const tc = card.querySelector('.fx-tc'), bar = card.querySelector('.fx-progress');
    v.addEventListener('timeupdate', () => {
      if (tc) tc.textContent = digits(timecode(v.currentTime));
      if (bar && v.duration) bar.style.setProperty('--fx-p', (v.currentTime / v.duration).toFixed(3));
    });
    v.addEventListener('playing', () => { if (card._fxWant) card.classList.add('fx-live'); });
    v.addEventListener('error', () => { card._fxBroken = true; card.classList.remove('fx-live'); });
    card._fxVideo = v;
    return v;
  }
  function startPreview(card) {
    if (reduced() || saveData || card._fxBroken) return;
    card._fxWant = true;
    const v = ensurePreview(card);
    v?.play().catch(() => {});
  }
  function stopPreview(card) {
    if (!card) return;
    card._fxWant = false;
    card.classList.remove('fx-live');
    const v = card._fxVideo;
    if (v) setTimeout(() => { if (!card._fxWant) v.pause(); }, 450);
  }

  function mountCards(cleanup) {
    const cards = [...document.querySelectorAll('.project-card')];
    cards.forEach(card => {
      const frame = card.querySelector('.project-image');
      if (!frame || frame.querySelector('.fx-hud')) return;
      frame.insertAdjacentHTML('beforeend',
        `<span class="fx-hud" aria-hidden="true"><i class="fx-corner tl"></i><i class="fx-corner tr"></i><i class="fx-corner bl"></i><i class="fx-corner br"></i>` +
        `<span class="fx-readout"><b></b><span>REC</span><span class="fx-tc">${digits('00:00:00:00')}</span></span><span class="fx-progress"><i></i></span></span>` +
        `<span class="fx-glare" aria-hidden="true"></span><i class="fx-scan" aria-hidden="true"></i>`);
      // Reveal only once the cover has decoded, so the wipe never plays over an empty frame.
      const img = frame.querySelector('img');
      const ready = () => card.classList.add('fx-ready');
      if (!img || img.complete) ready(); else { img.addEventListener('load', ready, { once: true }); img.addEventListener('error', ready, { once: true }); setTimeout(ready, 1800); }

      if (fine.matches && !reduced()) {
        const enter = () => startPreview(card);
        const leave = () => {
          stopPreview(card);
          frame.style.rotate = '0 1 0 0deg';
          card.style.removeProperty('--fx-px'); card.style.removeProperty('--fx-py');
        };
        const move = e => {
          const r = frame.getBoundingClientRect();
          const dx = ((e.clientX - r.left) / r.width - 0.5) * 2;
          const dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
          const mag = Math.min(1, Math.hypot(dx, dy));
          frame.style.rotate = mag < 0.02 ? '0 1 0 0deg' : `${-dy} ${dx} 0 ${(mag * 4.5).toFixed(2)}deg`;
          card.style.setProperty('--fx-px', `${(-dx * 7).toFixed(1)}px`);
          card.style.setProperty('--fx-py', `${(-dy * 7).toFixed(1)}px`);
        };
        card.addEventListener('pointerenter', enter);
        card.addEventListener('pointerleave', leave);
        card.addEventListener('pointermove', move, { passive: true });
        cleanup.push(() => { card.removeEventListener('pointerenter', enter); card.removeEventListener('pointerleave', leave); card.removeEventListener('pointermove', move); });
      }
    });

    // Touch screens: the card most in view plays its footage, one at a time.
    if (touch.matches && !reduced() && !saveData && cards.length) {
      const ratios = new Map();
      let current = null;
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => ratios.set(en.target, en.intersectionRatio));
        let best = null, bestRatio = 0.6;
        ratios.forEach((ratio, card) => { if (ratio > bestRatio) { best = card; bestRatio = ratio; } });
        if (best !== current) { stopPreview(current); current = best; if (best) startPreview(best); }
      }, { threshold: [0, 0.3, 0.6, 0.8, 1] });
      cards.forEach(c => io.observe(c));
      cleanup.push(() => { io.disconnect(); stopPreview(current); });
    }
  }

  /* ---------- Hero: letter-by-letter name, pointer parallax, live timecode ---------- */
  function mountHero(cleanup) {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (!reduced()) {
      hero.querySelectorAll('.first-name,.last-name').forEach(el => {
        const text = el.textContent.trim();
        if (lang === 'fa') { el.classList.add('fx-word-in'); return; }
        el.setAttribute('aria-label', text);
        el.innerHTML = [...text].map((ch, i) => `<span class="fx-letter" aria-hidden="true" style="--i:${i}">${ch}</span>`).join('');
        el.classList.add('fx-split');
      });
    }
    const hud = make('div', 'fx-hero-hud', '<b></b><span>REC</span><time></time>');
    hud.setAttribute('aria-hidden', 'true');
    hero.append(hud);
    const tcEl = hud.querySelector('time');
    const start = performance.now();
    let visible = true;
    const tick = () => { if (visible && !document.hidden) tcEl.textContent = digits(timecode((performance.now() - start) / 1000)); };
    tick();
    const timer = setInterval(tick, 1000 / FPS);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(hero);
    cleanup.push(() => { clearInterval(timer); io.disconnect(); });
    if (fine.matches && !reduced()) {
      const move = e => {
        const dx = e.clientX / innerWidth - 0.5, dy = e.clientY / innerHeight - 0.5;
        hero.style.setProperty('--fx-hx', `${(-dx * 18).toFixed(1)}px`);
        hero.style.setProperty('--fx-hy', `${(-dy * 12).toFixed(1)}px`);
      };
      hero.addEventListener('pointermove', move, { passive: true });
      cleanup.push(() => hero.removeEventListener('pointermove', move));
    }
  }

  /* ---------- Labels decode like a timecode readout; numbers count up ---------- */
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_—·';
  function decode(el) {
    const final = el.textContent;
    if (!final.trim() || el.children.length) return;
    if (lang === 'fa') {
      el.animate({ clipPath: ['inset(0 0 0 100%)', 'inset(0 0 0 0)'], opacity: [0.3, 1] }, { duration: 700, easing: ease });
      return;
    }
    el.classList.add('fx-decoding');
    const total = 520 + final.length * 14;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / total);
      const fixed = Math.floor(p * final.length);
      el.textContent = final.slice(0, fixed) + [...final.slice(fixed)].map(ch => (ch === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0])).join('');
      if (p < 1) requestAnimationFrame(step); else { el.textContent = final; el.classList.remove('fx-decoding'); }
    };
    requestAnimationFrame(step);
  }
  function countUp(el) {
    const to = +el.dataset.count || 0;
    const t0 = performance.now(), dur = 1200;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = digits(pad(v));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function mountLabels(cleanup) {
    if (reduced()) return;
    const targets = document.querySelectorAll('.section-kicker,.slot-label,.footer-note>small,.contact-card small,.connect-block>small,.skill-number,.job>small');
    const counters = document.querySelectorAll('.fx-count[data-count]');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      en.target.classList.contains('fx-count') ? countUp(en.target) : decode(en.target);
    }), { threshold: 0.6 });
    targets.forEach(el => io.observe(el));
    counters.forEach(el => io.observe(el));
    cleanup.push(() => io.disconnect());
  }

  /* ---------- Logo marquee reacts to scroll speed and direction ---------- */
  function mountMarquee(cleanup) {
    const track = document.querySelector('.brand-track');
    const anim = track?.getAnimations?.()[0];
    if (!anim || reduced()) return;
    let lastY = scrollY, lastT = performance.now(), rate = 1, target = 1, raf = 0;
    const settle = () => {
      rate += (target - rate) * 0.12;
      target += (1 - target) * 0.06;
      anim.playbackRate = rate;
      raf = Math.abs(rate - 1) > 0.01 || Math.abs(target - 1) > 0.01 ? requestAnimationFrame(settle) : 0;
      if (!raf) anim.playbackRate = 1;
    };
    const onScroll = () => {
      const now = performance.now(), dy = scrollY - lastY, dt = Math.max(16, now - lastT);
      lastY = scrollY; lastT = now;
      const v = dy / dt;
      target = Math.sign(v || 1) * Math.min(6, 1 + Math.abs(v) * 2.2);
      if (!raf) raf = requestAnimationFrame(settle);
    };
    addEventListener('scroll', onScroll, { passive: true });
    cleanup.push(() => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); });
  }

  /* ---------- Mount after every render ---------- */
  function mount() {
    unmount.forEach(fn => fn());
    unmount = [];
    mountHero(unmount);
    mountCards(unmount);
    mountLabels(unmount);
    mountMarquee(unmount);
  }
  const baseRender = render;
  render = function () { baseRender(); mount(); };

  initCursor();
  mount();
})();
