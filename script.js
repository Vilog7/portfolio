/* ==========================================================================
   VIHAAN — CINEMATIC 3D PORTFOLIO
   Pure Vanilla JavaScript | Zero External Libraries | Ultra-Smooth 60fps
   ========================================================================== */

(() => {
  'use strict';

  const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const mapRange = (value, inMin, inMax, outMin, outMax) => {
    const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
    return outMin + (outMax - outMin) * t;
  };
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeInQuad = (t) => t * t;

  /* ========================================================================
     1. CINEMATIC SCROLL-CONTROLLED HERO SEQUENCE (4 STAGES)
        Zero layout thrashing: cached measurements + pure scrollY math
     ======================================================================== */
  const heroSequence = document.getElementById('home');
  const heroPhotoLayer = document.getElementById('hero-photo-layer');
  const heroWordmark = document.getElementById('hero-wordmark');
  const heroRedFlood = document.getElementById('hero-red-flood');
  const heroTransitionVeil = document.getElementById('hero-transition-veil');
  const heroScrollCue = document.getElementById('hero-scroll-cue');
  const heroChapterNum = document.getElementById('hero-chapter-num');
  const scrollProgressBar = document.getElementById('scroll-progress-bar');

  const navbar = document.getElementById('navbar');
  const processTimeline = document.getElementById('process-timeline');
  const timelineProgress = document.getElementById('timeline-progress');
  const timelineSteps = Array.from(document.querySelectorAll('.timeline-step'));

  let heroScrollable = 1;
  let maxDocScroll = 1;
  let timelineTop = 0;
  let timelineHeight = 1;
  let stepTops = [];
  let winH = window.innerHeight;

  // Auto-sleeping damped interpolation for liquid-smooth hero scrolling
  let targetHeroProgress = 0;
  let smoothHeroProgress = 0;
  let heroGlideRaf = null;
  let lastFrameTime = 0;

  function measureLayout() {
    winH = window.innerHeight;
    maxDocScroll = Math.max(document.documentElement.scrollHeight - winH, 1);
    if (heroSequence) {
      heroScrollable = Math.max(heroSequence.offsetHeight - winH, 1);
    }
    if (processTimeline) {
      const rect = processTimeline.getBoundingClientRect();
      timelineTop = rect.top + window.scrollY;
      timelineHeight = Math.max(rect.height, 1);
      stepTops = timelineSteps.map((step) => step.getBoundingClientRect().top + window.scrollY);
    }
  }

  function applyHeroStage(p) {
    if (!heroPhotoLayer || !heroWordmark) return;

    // Scroll cue fades immediately when scrolling starts
    if (heroScrollCue) {
      const cueOpacity = 1 - mapRange(p, 0.0, 0.08, 0, 1);
      heroScrollCue.style.opacity = cueOpacity.toFixed(2);
    }

    // Photograph fades smoothly from 1 -> 0 across Stage 2
    const photoFadeT = easeInOutCubic(mapRange(p, 0.03, 0.34, 0, 1));
    heroPhotoLayer.style.opacity = (1 - photoFadeT).toFixed(3);
    heroPhotoLayer.style.transform = `translate3d(0, 0, 0) scale(${(1 + photoFadeT * 0.06).toFixed(3)})`;

    // Giant Red VIHAAN Typography:
    // Smooth GPU-safe scale capped at 6.65x (zero browser VRAM spike)
    const textIn = easeInOutCubic(mapRange(p, 0.05, 0.24, 0, 1));
    const textOut = easeInOutCubic(mapRange(p, 0.72, 0.92, 0, 1));
    const textOpacity = clamp(textIn * (1 - textOut), 0, 1);

    const earlyScale = mapRange(p, 0.05, 0.34, 1.0, 1.45);
    const zoomT = mapRange(p, 0.34, 0.78, 0, 1);
    const scale = earlyScale + easeInQuad(zoomT) * 5.2;

    heroWordmark.style.opacity = textOpacity.toFixed(3);
    heroWordmark.style.transform = `translate3d(0, 0, 0) scale(${scale.toFixed(3)})`;

    // Full-screen red fill takes over cleanly at peak zoom, then fades into dark void
    if (heroRedFlood) {
      const floodIn = easeInOutCubic(mapRange(p, 0.54, 0.74, 0, 1));
      const floodOut = easeInOutCubic(mapRange(p, 0.76, 0.94, 0, 1));
      heroRedFlood.style.opacity = clamp(floodIn * (1 - floodOut), 0, 1).toFixed(3);
    }

    // Stage 4: Smooth dark atmospheric transition into the portfolio
    if (heroTransitionVeil) {
      heroTransitionVeil.style.opacity = easeInOutCubic(mapRange(p, 0.76, 0.98, 0, 1)).toFixed(3);
    }

    // Minimal Chapter HUD (01 -> 04)
    if (heroChapterNum) {
      const stage = p < 0.12 ? '01' : p < 0.42 ? '02' : p < 0.76 ? '03' : '04';
      if (heroChapterNum.textContent !== stage) {
        heroChapterNum.textContent = stage;
      }
    }
  }

  function stepHeroGlide(now) {
    const dt = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 1 / 60;
    lastFrameTime = now;

    // Frame-rate independent exponential smoothing (glides identically at 60Hz & 120Hz)
    const alpha = 1 - Math.exp(-12 * dt);
    smoothHeroProgress += (targetHeroProgress - smoothHeroProgress) * alpha;

    if (Math.abs(targetHeroProgress - smoothHeroProgress) < 0.0004) {
      smoothHeroProgress = targetHeroProgress;
      applyHeroStage(smoothHeroProgress);
      heroGlideRaf = null;
      lastFrameTime = 0;
      return;
    }

    applyHeroStage(smoothHeroProgress);
    heroGlideRaf = requestAnimationFrame(stepHeroGlide);
  }

  function updateOnScroll() {
    const sy = window.scrollY;

    // Top GPU-only reading progress bar
    if (scrollProgressBar) {
      const docProgress = clamp(sy / maxDocScroll, 0, 1);
      scrollProgressBar.style.transform = `scaleX(${docProgress.toFixed(4)})`;
    }

    // Wake up smooth hero glide only when hero progress changes
    const nextHeroProgress = clamp(sy / heroScrollable, 0, 1);
    if (Math.abs(nextHeroProgress - targetHeroProgress) > 0.0001) {
      targetHeroProgress = nextHeroProgress;
      if (!heroGlideRaf) {
        heroGlideRaf = requestAnimationFrame(stepHeroGlide);
      }
    }

    if (navbar) {
      navbar.classList.toggle('is-scrolled', sy > 40);
    }

    // Only update timeline when near timeline section (zero getBoundingClientRect calls!)
    if (processTimeline && timelineProgress && sy + winH > timelineTop - 100) {
      const triggerY = sy + winH * 0.72;
      const progress = clamp((triggerY - timelineTop) / timelineHeight, 0, 1);
      timelineProgress.style.height = `${(progress * 100).toFixed(1)}%`;

      const stepTrigger = sy + winH * 0.68;
      for (let i = 0; i < timelineSteps.length; i++) {
        timelineSteps[i].classList.toggle('is-active', stepTops[i] < stepTrigger);
      }
    }
  }

  let scrollScheduled = false;
  function requestScrollUpdate() {
    if (!scrollScheduled) {
      scrollScheduled = true;
      requestAnimationFrame(() => {
        updateOnScroll();
        scrollScheduled = false;
      });
    }
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', () => {
    measureLayout();
    requestScrollUpdate();
  }, { passive: true });

  measureLayout();
  targetHeroProgress = clamp(window.scrollY / heroScrollable, 0, 1);
  smoothHeroProgress = targetHeroProgress;
  applyHeroStage(smoothHeroProgress);
  updateOnScroll();

  /* ========================================================================
     2. LIGHTWEIGHT 3D CARD TILTING & HOVER GLOW
     ======================================================================== */
  if (!isTouchDevice) {
    const tiltCards = document.querySelectorAll('[data-tilt]');
    tiltCards.forEach((card) => {
      let frameId = null;

      card.addEventListener('pointermove', (e) => {
        if (frameId) return;
        const clientX = e.clientX;
        const clientY = e.clientY;
        frameId = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          const rotateY = ((x / rect.width) - 0.5) * 10;
          const rotateX = (0.5 - (y / rect.height)) * 10;

          card.style.setProperty('--mx', `${x.toFixed(0)}px`);
          card.style.setProperty('--my', `${y.toFixed(0)}px`);
          card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
          frameId = null;
        });
      });

      card.addEventListener('pointerleave', () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
        card.style.transform = 'none';
      });
    });
  }

  /* ========================================================================
     3. SCROLL-TRIGGERED REVEALS & ACTIVE NAVIGATION
     ======================================================================== */
  const revealEls = document.querySelectorAll('.reveal-up');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  const navSections = ['home', 'about', 'skills', 'projects', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const allNavLinks = document.querySelectorAll('[data-section]');

  function setActiveNav(sectionId) {
    allNavLinks.forEach((link) => {
      const active = link.dataset.section === sectionId;
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveNav(entry.target.id);
          }
        });
      },
      { rootMargin: '-38% 0px -52% 0px', threshold: 0 }
    );
    navSections.forEach((sec) => sectionObserver.observe(sec));
  }

  // Mobile Menu Toggle
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      mobileMenu.hidden = isOpen;
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.hidden = true;
      });
    });
  }

  /* ========================================================================
     4. PROJECT CATEGORY FILTERS & MODAL PREVIEW
     ======================================================================== */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.filter;
      filterBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      projectCards.forEach((card) => {
        const match = category === 'all' || card.dataset.category === category;
        card.classList.toggle('is-hidden', !match);
      });
      measureLayout();
    });
  });

  const projectData = {
    'ultron-ai': {
      badge: 'AI APPLICATION',
      title: 'UltronAI',
      desc: 'An AI-powered application built by Vihaan featuring a sleek dark-mode conversational interface, intelligent prompt workflows, and fast everyday task assistance.',
      tech: ['App Development', 'AI Integration', 'Dark UI/UX', 'Mobile Architecture']
    }
  };

  const projectModal = document.getElementById('project-modal');
  const modalClose = document.getElementById('modal-close');
  const modalBadge = document.getElementById('modal-badge');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalTech = document.getElementById('modal-tech');

  document.querySelectorAll('[data-open-project]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-open-project');
      const data = projectData[key];
      if (!data || !projectModal) return;

      modalBadge.textContent = data.badge;
      modalTitle.textContent = data.title;
      modalDesc.textContent = data.desc;
      modalTech.innerHTML = '';
      data.tech.forEach((t) => {
        const li = document.createElement('li');
        li.className = 'tech-tag';
        li.textContent = t;
        modalTech.appendChild(li);
      });

      if (typeof projectModal.showModal === 'function') {
        projectModal.showModal();
      } else {
        projectModal.setAttribute('open', '');
      }
    });
  });

  if (modalClose && projectModal) {
    modalClose.addEventListener('click', () => projectModal.close());
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) projectModal.close();
    });
  }

  /* ========================================================================
     5. CONTACT FORM & COPY EMAIL
     ======================================================================== */
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  const copyEmailBtn = document.getElementById('copy-email-btn');

  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('vihaan7vb@gmail.com');
        copyEmailBtn.textContent = 'Copied';
        setTimeout(() => {
          copyEmailBtn.textContent = 'Copy';
        }, 2000);
      } catch {
        copyEmailBtn.textContent = 'vihaan7vb@gmail.com';
      }
    });
  }

  if (contactForm && formStatus) {
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const messageInput = document.getElementById('contact-message');
    const errName = document.getElementById('err-name');
    const errEmail = document.getElementById('err-email');
    const errMessage = document.getElementById('err-message');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function clearFieldError(input, errEl) {
      input.removeAttribute('aria-invalid');
      if (errEl) errEl.textContent = '';
    }

    nameInput.addEventListener('input', () => clearFieldError(nameInput, errName));
    emailInput.addEventListener('input', () => clearFieldError(emailInput, errEmail));
    messageInput.addEventListener('input', () => clearFieldError(messageInput, errMessage));

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameVal = nameInput.value.trim();
      const emailVal = emailInput.value.trim();
      const messageVal = messageInput.value.trim();

      let firstInvalid = null;

      if (!nameVal) {
        nameInput.setAttribute('aria-invalid', 'true');
        errName.textContent = 'Please enter your name.';
        firstInvalid = firstInvalid || nameInput;
      } else {
        clearFieldError(nameInput, errName);
      }

      if (!emailPattern.test(emailVal)) {
        emailInput.setAttribute('aria-invalid', 'true');
        errEmail.textContent = 'Please enter a valid email address.';
        firstInvalid = firstInvalid || emailInput;
      } else {
        clearFieldError(emailInput, errEmail);
      }

      if (!messageVal) {
        messageInput.setAttribute('aria-invalid', 'true');
        errMessage.textContent = 'Please enter a brief message about your project.';
        firstInvalid = firstInvalid || messageInput;
      } else {
        clearFieldError(messageInput, errMessage);
      }

      if (firstInvalid) {
        formStatus.classList.add('is-error');
        formStatus.textContent = 'Please fix the highlighted fields above.';
        firstInvalid.focus();
        return;
      }

      formStatus.classList.remove('is-error');
      formStatus.textContent = `Message ready for Vihaan Bhattacharjee! Thanks, ${nameVal} — connect this form to your preferred backend or mail handler.`;
      contactForm.reset();
    });
  }
})();
