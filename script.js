// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Video pause/play controls
document.querySelectorAll('.video-wrap').forEach((wrap) => {
  const video = wrap.querySelector('video');
  const btn = wrap.querySelector('.video-toggle');
  const iconPause = btn.querySelector('.icon-pause');
  const iconPlay = btn.querySelector('.icon-play');

  const setPlayingUI = (isPlaying) => {
    btn.setAttribute('aria-label', isPlaying ? 'Pause video' : 'Play video');
    btn.setAttribute('data-playing', String(isPlaying));
    iconPause.hidden = !isPlaying;
    iconPlay.hidden = isPlaying;
  };

  // Respect reduced motion: don't autoplay, start paused
  if (prefersReducedMotion) {
    video.autoplay = false;
    video.pause();
    setPlayingUI(false);
  }

  btn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      setPlayingUI(true);
    } else {
      video.pause();
      setPlayingUI(false);
    }
  });
});

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const revealTargets = document.querySelectorAll('.case-row, .case-media, .about-body, .impact-grid');

  revealTargets.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  revealTargets.forEach((el) => observer.observe(el));
}
