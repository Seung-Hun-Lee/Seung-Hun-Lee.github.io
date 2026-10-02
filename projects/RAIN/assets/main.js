/* Muted, viewport-scoped playback with explicit controls when autoplay is denied. */
(() => {
  'use strict';
  const videos = [...document.querySelectorAll('video[data-autoplay], #hero-video')];
  const playbackButton = document.querySelector('#gallery-playback');
  const galleryLimit = document.querySelector('#gallery-limit');
  let playbackLimit = galleryLimit ? Number(galleryLimit.value) : 9;
  let scrollTimer = 0;
  const states = new Map();
  // Video demonstrations autoplay by explicit project-page design. The motion
  // preference controls decorative effects, not whether these videos may play.
  let enabled = true;
  const visibleBlocked = () => [...states.values()].some(s=>s.blocked && s.ratio>=.2);
  function updateButton() {
    if (!playbackButton) return;
    const playing = enabled && !visibleBlocked();
    playbackButton.textContent = playing ? 'Pause videos' : 'Play videos';
    playbackButton.setAttribute('aria-pressed', String(playing));
  }

  function load(video) {
    if (video.dataset.src && !video.getAttribute('src')) {
      video.src = video.dataset.src;
      video.load();
    }
  }
  function pause(video) {
    const s = states.get(video);
    s.intent = false;
    // A retained source must not restart native autoplay after leaving view.
    video.autoplay = false;
    if (!video.paused) { s.managedPauses++; video.pause(); }
  }
  function release(video) {
    const s = states.get(video);
    if (s.intent || s.ratio>0 || !video.getAttribute('src')) return;
    s.resumeTime = video.currentTime || s.resumeTime;
    pause(video);
    video.removeAttribute('src');
    video.load(); // Release offscreen gallery decoders, not just their clocks.
    video.dataset.playback = 'idle';
  }
  function prioritize(video) {
    const s=states.get(video);
    if (s.gallery) for (const other of states.values()) if (other.gallery) other.manual=false;
    s.manual=true;
  }
  function play(video, manual = false) {
    const s = states.get(video);
    if (manual) { s.userPaused = false; prioritize(video); s.blocked = false; s.abortRetries = 0; }
    s.intent = true;
    video.autoplay = true;
    if (s.pending || !video.paused) return;
    video.muted = true;
    load(video);
    s.pending = true;
    let retry = false;
    video.dataset.playback = 'loading';
    video.play().then(() => {
      s.blocked = false;
      s.abortRetries = 0;
      s.button.hidden = true;
      delete video.dataset.playbackError;
      video.dataset.playback = 'playing';
      if (!s.intent || document.hidden) pause(video);
      updateButton();
    }).catch(error => {
      if (error.name === 'AbortError') {
        if (!s.intent || document.hidden) return;
        // Re-entering the viewport can overtake a cancelled play promise.
        // Recover after it settles instead of waiting for another scroll.
        if (s.abortRetries<2) { s.abortRetries++; retry=true; return; }
      }
      s.blocked = true;
      video.dataset.playback = 'blocked';
      video.dataset.playbackError = error.name;
      s.button.textContent = error.name === 'NotAllowedError' ? '▶ Play video' : '↻ Retry video';
      s.button.hidden = false;
      s.button.title = error.name === 'NotAllowedError' ? 'Your browser requires a click to start playback.' : error.message;
      updateButton();
    }).finally(() => {
      s.pending = false;
      if (retry && s.intent && !s.blocked) queueMicrotask(()=>{
        if (s.intent && !document.hidden) play(video);
      });
    });
  }
  function refresh() {
    // A sliver at the viewport edge should not start a new decoder. Once a
    // gallery clip starts, retain it to 35% visibility to avoid edge flicker.
    const eligible = [...states].filter(([v,s]) => s.ratio >= (s.gallery && !s.manual ? (s.intent ? .35 : .6) : .2) &&
      !v.closest('[hidden]') && !document.hidden && (enabled || s.manual) && !s.userPaused && !s.blocked)
      .sort((a,b) => Number(b[1].manual)-Number(a[1].manual) || b[1].ratio-a[1].ratio);
    const candidates = eligible.slice(0,playbackLimit).map(([v]) => v);
    const queued = new Set(eligible.slice(playbackLimit).map(([v]) => v));
    for (const video of videos) {
      const s = states.get(video);
      s.queued = queued.has(video);
      if (candidates.includes(video) && (!s.gallery || !scrollTimer || !video.paused || s.pending || s.manual)) play(video);
      else pause(video);
      if (queued.has(video)) {
        video.dataset.playback = 'queued';
        s.button.textContent = '▶ Play this video';
        s.button.title = 'Prioritize this video within the simultaneous-playback limit.';
      }
      s.button.hidden = !video.paused || (enabled && !s.blocked && !s.userPaused && !queued.has(video));
    }
    updateButton();
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) states.get(entry.target.firstElementChild).ratio = entry.intersectionRatio;
    refresh();
    for (const entry of entries) {
      const video=entry.target.firstElementChild,s=states.get(video);
      if (s.gallery && !s.near) release(video);
    }
  }, {threshold: [0,.01,.2,.35,.6,.8,1]});
  // Keep one nearby row warm, but do not accumulate all 60 media players as
  // the visitor scrolls. MP4 downloads stay restricted to visible videos.
  const residency = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video=entry.target.firstElementChild,s=states.get(video);s.near=entry.isIntersecting;
      if (!s.near) release(video);
    }
  }, {rootMargin:'250px 0px'});

  for (const video of videos) {
    video.autoplay = true;
    video.playsInline = true;
    video.muted = video.defaultMuted = true;
    video.playbackRate = 1;
    const wrapper = document.createElement('div');
    wrapper.className = 'video-player';
    video.before(wrapper); wrapper.append(video);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'video-play-overlay'; button.textContent = '▶ Play video';
    button.hidden = enabled;
    button.setAttribute('aria-label', 'Play: '+(video.getAttribute('aria-label') || 'video'));
    wrapper.append(button);
    const s = {ratio:0, pending:false, intent:false, managedPauses:0, userPaused:false, blocked:false, manual:false, lastGesture:-Infinity, button,
      gallery:!!video.closest('.gallery-card'),near:false,resumeTime:0,abortRetries:0,queued:false};
    states.set(video,s);
    if (s.gallery) {
      // Avoid updating nine native control panels during passive viewing.
      // Activate controls on interaction,
      // retaining native seeking, keyboard access, and touch playback controls.
      video.controls = false;
      video.tabIndex = 0;
      video.addEventListener('pointerenter',()=>{video.controls=true;});
      video.addEventListener('pointerleave',()=>{if(document.activeElement!==video)video.controls=false;});
      video.addEventListener('blur',()=>{if(!video.matches(':hover'))video.controls=false;});
    }
    button.addEventListener('click', () => {
      if (video.error) video.load();
      play(video,true);
      refresh();
    });
    video.addEventListener('pause', () => {
      if (s.managedPauses) s.managedPauses--;
      else if (!s.pending && !video.seeking && video.readyState > 0 && s.ratio >= .2 && performance.now()-s.lastGesture<1500) {
        s.userPaused = true; s.intent = false; s.button.hidden = false;
      }
      video.dataset.playback = s.queued ? 'queued' : 'paused';
    });
    video.addEventListener('play', () => {
      s.userPaused = false; s.button.hidden = true;
      if (!s.intent && !s.pending) { prioritize(video); s.intent = true; refresh(); }
    });
    video.addEventListener('playing', () => {
      s.blocked = false; s.button.hidden = true;
      s.abortRetries = 0;
      delete video.dataset.playbackError;
      video.dataset.playback = 'playing'; updateButton();
    });
    video.addEventListener('waiting', () => { video.dataset.playback = 'buffering'; });
    video.addEventListener('loadedmetadata', () => {
      if (s.resumeTime>0 && Number.isFinite(video.duration)) {
        video.currentTime=Math.min(s.resumeTime,Math.max(0,video.duration-.05));
        s.resumeTime=0;
      }
    });
    video.addEventListener('canplay', () => { if (s.intent && !s.pending && !s.blocked) play(video); });
    video.addEventListener('error', () => {
      video.dataset.playback = 'error';
      video.dataset.playbackError = video.error?.message || 'Media load error';
      s.button.textContent = '↻ Retry video'; s.button.hidden = false;
    });
    video.addEventListener('pointerdown', () => { s.lastGesture=performance.now(); if(s.gallery)video.controls=true; load(video); });
    video.addEventListener('keydown', () => { s.lastGesture=performance.now(); if(s.gallery)video.controls=true; });
    video.addEventListener('focus', () => { if(s.gallery)video.controls=true; load(video); });
    // Observe the fixed player box, independently of native-control visibility.
    observer.observe(wrapper);
    if (s.gallery) residency.observe(wrapper);
  }
  playbackButton?.addEventListener('click', () => {
    enabled = visibleBlocked() || !enabled;
    for (const s of states.values()) { s.manual = false; if (enabled) { s.userPaused = false; s.blocked = false; } }
    refresh();
  });
  galleryLimit?.addEventListener('change', () => {
    playbackLimit = Number(galleryLimit.value);
    refresh();
  });
  if (galleryLimit) window.addEventListener('scroll', () => {
    // Avoid decoding clips that are merely passing through during a fast
    // scroll. Existing visible playback continues; new starts wait 120 ms.
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { scrollTimer=0; refresh(); },120);
  }, {passive:true});
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow',refresh);
  // A blocked browser may grant playback following a real click anywhere on
  // the page. Retry only those denied clips, never deliberately paused ones.
  document.addEventListener('pointerup', event => {
    if (event.target.closest('button,video')) return;
    for (const [video,s] of states) if (s.blocked && s.ratio >= .2 && enabled && !s.userPaused) play(video,true);
  });

  const cards = [...document.querySelectorAll('.gallery-card')];
  if (cards.length) {
    let selected = 'All';
    const search = document.querySelector('#gallery-search');
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const filter = () => {
      const query = search.value.trim().toLowerCase();
      let count = 0;
      for (const card of cards) {
        const show = (selected === 'All' || selected === card.dataset.suite) && card.dataset.search.includes(query);
        card.hidden = !show;
        if (show) count++; else pause(card.querySelector('video'));
      }
      document.querySelectorAll('.gallery-suite').forEach(section => {
        section.hidden = ![...section.querySelectorAll('.gallery-card')].some(card => !card.hidden);
      });
      document.querySelector('#gallery-count').textContent = 'Showing '+count+' '+(count===1?'task':'tasks')+(selected==='All'?'':' · '+selected);
      document.querySelector('.empty-results').hidden = count !== 0;
      buttons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.filter===selected)));
      refresh();
    };
    buttons.forEach(button => button.addEventListener('click', () => { selected=button.dataset.filter; filter(); }));
    search.addEventListener('input',filter);
    const hash = decodeURIComponent(location.hash.slice(1));
    if (['Adapt','Compose','Decompose'].includes(hash)) { selected=hash; filter(); }
  }
  refresh();
})();
