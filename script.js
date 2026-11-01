// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------
   Scroll reveals
   Only elements that start below the fold get hidden, so nothing
   already on screen ever blinks. Grouped items stagger.
   ------------------------------------------------------------ */
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const singles = [
    '.about-text .section-tag', '.about-text h2', '.about-body', '.about-cta',
    '.work-intro .section-tag', '.work-intro h2', '.work-section-divider',
    '.case-row', '.case-body > .case-media', '.case-study > .case-media:not(.case-hero + .case-media)',
    '.brand-plate', '.cs-next-wrap .section-inner',
    '.contact .section-tag', '.contact h2', '.contact-lede', '.contact-links', '.contact-social'
  ];
  const groups = [
    '.work-compact-row > .work-compact-card',
    '.work-featured-row > .work-featured',
    '.impact-grid > li',
    '.case-media.two-up > img',
    '.case-media.stacked > img'
  ];

  const isBelowFold = (el) => el.getBoundingClientRect().top > window.innerHeight * 0.92;
  const targets = new Set();

  document.querySelectorAll(singles.join(',')).forEach((el) => targets.add(el));
  groups.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      // a stacked/two-up container is already revealed as a whole — skip its children
      if (el.closest('.case-media') && targets.has(el.closest('.case-media'))) return;
      el.style.setProperty('--reveal-delay', `${(i % 4) * 0.09}s`);
      targets.add(el);
    });
  });

  const aboutPhoto = document.querySelector('.about-photo');
  if (aboutPhoto) targets.add(aboutPhoto);

  // A fully clip-path'd element never registers as intersecting, so the
  // photo wipe is triggered by watching its (unclipped) parent instead.
  const proxyFor = new Map();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = proxyFor.get(entry.target) || entry.target;
      el.classList.add('is-visible');
      observer.unobserve(entry.target);
      if (el === aboutPhoto) return; // nothing to hand back; keeps the image settle smooth
      // hand transform back to hover states once the reveal is done
      el.addEventListener('transitionend', function done(e) {
        if (e.target !== el) return;
        el.classList.remove('reveal', 'reveal-media', 'is-visible');
        el.style.removeProperty('--reveal-delay');
        el.removeEventListener('transitionend', done);
      });
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  targets.forEach((el) => {
    if (!isBelowFold(el)) return;
    el.classList.add('reveal');
    if (el.matches('.case-media, .case-media > img, .brand-plate')) el.classList.add('reveal-media');
    if (el === aboutPhoto) {
      proxyFor.set(el.parentElement, el);
      observer.observe(el.parentElement);
    } else {
      observer.observe(el);
    }
  });
}

/* ------------------------------------------------------------
   Header: scrolled state + reading progress on case studies
   ------------------------------------------------------------ */
const header = document.querySelector('.site-header');
const isCaseStudy = !!document.querySelector('.case-study, .brand-work');
let progressBar = null;

if (isCaseStudy) {
  progressBar = document.createElement('div');
  progressBar.className = 'read-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progressBar);
}

let ticking = false;
const onScroll = () => {
  const y = window.scrollY;
  if (header) header.classList.toggle('is-scrolled', y > 24);
  if (progressBar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
  }
  ticking = false;
};
window.addEventListener('scroll', () => {
  if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
}, { passive: true });
onScroll();

/* ------------------------------------------------------------
   Active section in nav (homepage only)
   ------------------------------------------------------------ */
const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
if (navLinks.length && 'IntersectionObserver' in window) {
  // section element -> nav id ("work" spans the intro + the card grid)
  const sections = new Map([
    [document.getElementById('about'), 'about'],
    [document.getElementById('work'), 'work'],
    [document.querySelector('.work-index'), 'work'],
    [document.getElementById('contact'), 'contact']
  ]);
  sections.delete(null);
  const visiblePx = new Map(); // element -> visible height in px

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => visiblePx.set(e.target, e.isIntersecting ? e.intersectionRect.height : 0));
    const totals = {};
    visiblePx.forEach((px, el) => { const id = sections.get(el); totals[id] = (totals[id] || 0) + px; });
    // nothing is "active" while the hero fills the screen
    const hero = document.querySelector('.hero');
    const heroPx = hero ? Math.max(0, Math.min(hero.getBoundingClientRect().bottom, window.innerHeight)) : 0;
    let best = null; let bestPx = heroPx;
    Object.entries(totals).forEach(([id, px]) => { if (px > bestPx) { best = id; bestPx = px; } });
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${best}`));
  }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });

  sections.forEach((_, el) => spy.observe(el));
}

/* ------------------------------------------------------------
   Card spotlight (follows the cursor on hover)
   ------------------------------------------------------------ */
if (canHover && !prefersReducedMotion) {
  document.querySelectorAll('.work-compact-card, .work-featured').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

/* ------------------------------------------------------------
   Videos: only play while on screen (saves battery + bandwidth).
   Reduced-motion users get a paused video with controls instead.
   ------------------------------------------------------------ */
const videos = document.querySelectorAll('video[autoplay]');
if (prefersReducedMotion) {
  videos.forEach((v) => { v.removeAttribute('autoplay'); v.pause(); v.controls = true; });
} else if ('IntersectionObserver' in window) {
  const vObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); }
      else v.pause();
    });
  }, { threshold: 0.15 });
  videos.forEach((v) => vObs.observe(v));
}

/* ------------------------------------------------------------
   Lightbox for case study + brand images
   ------------------------------------------------------------ */
const zoomables = document.querySelectorAll('.case-media img, .brand-plate img');
let lastFocus = null;

const closeLightbox = (box) => {
  if (!box || box.classList.contains('is-closing')) return;
  box.classList.add('is-closing');
  const remove = () => {
    box.remove();
    document.body.classList.remove('lightbox-open');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };
  if (prefersReducedMotion) remove();
  else box.addEventListener('animationend', remove, { once: true });
};

const openLightbox = (img) => {
  lastFocus = document.activeElement;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', img.alt || 'Enlarged image');

  const ratio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
  const wide = ratio > 2.4;
  if (wide) box.classList.add('is-wide');

  const big = document.createElement('img');
  big.src = img.currentSrc || img.src;
  big.alt = img.alt;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'lightbox-close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '&times;';

  box.append(big, close);
  if (wide) {
    const hint = document.createElement('p');
    hint.className = 'lightbox-hint';
    hint.textContent = 'Scroll sideways to follow the flow';
    box.appendChild(hint);
  }

  box.addEventListener('click', (e) => {
    // let people drag/scroll wide diagrams without closing
    if (wide && e.target === big) return;
    closeLightbox(box);
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); close.focus(); }
  });

  document.body.appendChild(box);
  document.body.classList.add('lightbox-open');
  close.focus({ preventScroll: true });
};

zoomables.forEach((img) => {
  img.classList.add('zoomable');
  img.setAttribute('tabindex', '0');
  img.setAttribute('role', 'button');
  img.setAttribute('aria-label', `Enlarge image: ${img.alt}`);
  img.addEventListener('click', () => openLightbox(img));
  img.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(img); }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox(document.querySelector('.lightbox'));
});

/* ------------------------------------------------------------
   Mobile nav toggle
   ------------------------------------------------------------ */
const navToggle = document.querySelector('.nav-toggle');
const mobileNav = document.getElementById('mobile-nav');

if (navToggle && mobileNav) {
  const closeMenu = () => {
    mobileNav.hidden = true;
    navToggle.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    mobileNav.hidden = false;
    navToggle.setAttribute('aria-expanded', 'true');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', (e) => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    if (isOpen && !mobileNav.contains(e.target) && !navToggle.contains(e.target)) {
      closeMenu();
    }
  });

  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
    if (e.matches) closeMenu();
  });
}
