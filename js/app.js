/* ─────────────────────────────────────────
   DJ LitKick · app.js
   Lenis + GSAP scroll-driven canvas animation
   241 frames from ClubDJ.mp4
   ───────────────────────────────────────── */
(function () {
  "use strict";

  /* ── CONFIG ── */
  const FRAME_COUNT   = 241;
  const FRAME_EXT     = "webp";
  const FRAME_DIR     = "frames";
  const IMAGE_SCALE   = 1.0;      /* full cover — video fills entire viewport */
  const FRAME_SPEED   = 1.0;      /* video completes at 100% scroll — last frame at page end */
  const FIRST_BATCH   = 12;

  /* Mobile gets shorter scroll height (match CSS 650vh) */
  const SCROLL_HEIGHT = window.innerWidth < 768 ? 720 : 660;
  const isMobile = window.innerWidth < 768;

  /* ── DOM ── */
  const loader      = document.getElementById("loader");
  const loaderBar   = document.getElementById("loader-bar");
  const loaderPct   = document.getElementById("loader-percent");
  const heroEl      = document.getElementById("hero-standalone");
  const header      = document.getElementById("site-header");
  const canvasWrap  = document.getElementById("canvas-wrap");
  const canvas      = document.getElementById("canvas");
  const ctx         = canvas.getContext("2d");
  const darkOverlay = document.getElementById("dark-overlay");
  const marqueeWrap = document.getElementById("marquee");
  const scrollCont  = document.getElementById("scroll-container");
  const sections    = [...document.querySelectorAll(".scroll-section")];

  /* ── STATE ── */
  const frames   = new Array(FRAME_COUNT).fill(null);
  let loaded     = 0;
  let currentFrame = 0;
  let bgColor    = "#080808";
  let dpr        = Math.min(window.devicePixelRatio || 1, 2);

  /* ──────────────────────────────────────
     1 · CANVAS RESIZE
  ────────────────────────────────────── */
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
    drawFrame(currentFrame);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* ──────────────────────────────────────
     2 · DRAW FRAME (padded cover)
  ────────────────────────────────────── */
  function sampleBgColor(img) {
    try {
      const tmp  = document.createElement("canvas");
      tmp.width  = 4;
      tmp.height = 4;
      const tc   = tmp.getContext("2d");
      tc.drawImage(img, 0, 0, 4, 4);
      const px   = tc.getImageData(0, 0, 1, 1).data;
      bgColor    = `rgb(${px[0]},${px[1]},${px[2]})`;
    } catch (_) {}
  }

  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;
    const cw = canvas.width  / dpr;
    const ch = canvas.height / dpr;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ──────────────────────────────────────
     3 · FRAME PRELOADER (two-phase)
  ────────────────────────────────────── */
  function loadFrame(index, onDone) {
    const img = new Image();
    img.onload = () => {
      frames[index] = img;
      loaded++;
      if (index % 20 === 0) sampleBgColor(img);
      if (onDone) onDone(index);
    };
    img.onerror = () => { loaded++; if (onDone) onDone(index); };
    img.src = `${FRAME_DIR}/frame_${String(index + 1).padStart(4, "0")}.${FRAME_EXT}`;
  }

  function updateLoaderUI(count) {
    const pct = Math.round((count / FRAME_COUNT) * 100);
    loaderBar.style.width = pct + "%";
    loaderPct.textContent = pct + "%";
  }

  function preload() {
    /* Phase 1: first batch → fast first paint */
    let phase1Done = 0;
    for (let i = 0; i < FIRST_BATCH; i++) {
      loadFrame(i, () => {
        updateLoaderUI(loaded);
        phase1Done++;
        if (phase1Done === FIRST_BATCH) {
          drawFrame(0);
          loadRemaining();
        }
      });
    }

    /* Phase 2: rest in background while loader is visible */
    function loadRemaining() {
      let remainDone = 0;
      const total = FRAME_COUNT - FIRST_BATCH;
      for (let i = FIRST_BATCH; i < FRAME_COUNT; i++) {
        loadFrame(i, () => {
          updateLoaderUI(loaded);
          remainDone++;
          if (remainDone === total) revealPage();
        });
      }
    }
  }

  function revealPage() {
    loader.classList.add("hidden");
    header.classList.add("visible");
    if (isMobile) return;

    /* Staggered entrance for hero words */
    const words = heroEl.querySelectorAll(".word");
    gsap.from(words, {
      y: "110%", opacity: 0, duration: 1.15, stagger: 0.12,
      ease: "power4.out", delay: 0.2
    });
    gsap.from(heroEl.querySelector(".hero-label"), {
      opacity: 0, y: -12, duration: 0.85, delay: 0.4, ease: "power3.out"
    });
    gsap.from(heroEl.querySelector(".hero-tagline"), {
      y: 22, opacity: 0, duration: 1, delay: 0.65, ease: "power3.out"
    });
    gsap.from(heroEl.querySelector(".hero-genres"), {
      y: 18, opacity: 0, duration: 0.9, delay: 0.85, ease: "power3.out"
    });
    gsap.from(heroEl.querySelector(".scroll-indicator"), {
      opacity: 0, duration: 1, delay: 1.3
    });
  }

  /* ──────────────────────────────────────
     4 · LENIS SMOOTH SCROLL (mandatory)
  ────────────────────────────────────── */
  function initLenis() {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ──────────────────────────────────────
     5 · HERO TRANSITION + CIRCLE-WIPE
  ────────────────────────────────────── */
  function initHeroTransition() {
    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;

        /* Hero fades out in the first 7% of scroll */
        heroEl.style.opacity = String(Math.max(0, 1 - p * 15));

        /* Canvas reveals via expanding circle clip-path */
        const wipeP  = Math.min(1, Math.max(0, (p - 0.01) / 0.07));
        const radius = wipeP * 80;
        canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;

        /* Header glass blur activates once hero is gone */
        header.classList.toggle("scrolled", p > 0.09);
      }
    });
  }

  /* ──────────────────────────────────────
     6 · FRAME-TO-SCROLL BINDING
  ────────────────────────────────────── */
  function initFrameBinding() {
    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
        const index = Math.min(
          Math.floor(accelerated * FRAME_COUNT),
          FRAME_COUNT - 1
        );
        if (index !== currentFrame) {
          currentFrame = index;
          requestAnimationFrame(() => drawFrame(currentFrame));
        }
      }
    });
  }

  /* ──────────────────────────────────────
     7 · SECTION POSITION + ANIMATION
  ────────────────────────────────────── */
  function positionSections() {
    if (isMobile) {
      const mobileTops = [150, 270, 385, 495, 590, 675];
      sections.forEach((section, i) => {
        const centered = section.dataset.centered === "true";
        section.style.top = mobileTops[i] + "vh";
        section.style.transform = centered
          ? "translateX(-50%) translateY(-50%)"
          : "translateY(-50%)";
        section.style.willChange = "opacity";
      });
      return;
    }

    sections.forEach((section) => {
      if (section.dataset.fixed === "true") return;

      const enter   = parseFloat(section.dataset.enter) / 100;
      const leave   = parseFloat(section.dataset.leave) / 100;
      const mid     = (enter + leave) / 2;
      const centered = section.dataset.centered === "true";

      const scrollableH = SCROLL_HEIGHT - 100;
      section.style.top        = centered
        ? (mid * SCROLL_HEIGHT) + "vh"
        : (enter * scrollableH + 70) + "vh";
      section.style.willChange = "opacity, transform";
      section.style.transform  = centered
        ? "translateX(-50%) translateY(-50%)"
        : "translateY(-50%)";
    });
  }

  function buildSectionTimeline(section) {
    if (isMobile) return gsap.timeline({ paused: true });
    const type = section.dataset.animation;
    const children = [...section.querySelectorAll(
      ".section-label, .section-heading, .section-body, .section-note, .section-quote, " +
      ".genre-item, .pillar-item, .platform-list li, " +
      ".stat, .stat-top, .cta-button, .cta-ig"
    )];

    const tl = gsap.timeline({ paused: true });

    switch (type) {
      case "slide-left":
        tl.from(children, {
          x: -80, opacity: 0, stagger: 0.13, duration: 0.95, ease: "power3.out"
        });
        break;
      case "slide-right":
        tl.from(children, {
          x: 80, opacity: 0, stagger: 0.13, duration: 0.95, ease: "power3.out"
        });
        break;
      case "rotate-in":
        tl.from(children, {
          y: 40, rotation: 2.5, opacity: 0, stagger: 0.11, duration: 0.9, ease: "power3.out"
        });
        break;
      case "stagger-up":
        tl.from(children, {
          y: 55, opacity: 0, stagger: 0.16, duration: 0.85, ease: "power3.out"
        });
        break;
      case "scale-up":
        tl.from(children, {
          scale: 0.88, opacity: 0, stagger: 0.12, duration: 1.0, ease: "power2.out"
        });
        break;
      case "clip-reveal":
        tl.from(children, {
          clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.14,
          duration: 1.15, ease: "power4.inOut"
        });
        break;
      default:
        tl.from(children, {
          y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out"
        });
    }

    return tl;
  }

  function initSectionAnimations() {
    if (isMobile) {
      sections.forEach(s => { s.style.opacity = "1"; s.classList.add("visible"); });
      return;
    }
    sections.forEach((section) => {
      const enter   = parseFloat(section.dataset.enter) / 100;
      const leave   = parseFloat(section.dataset.leave) / 100;
      const persist = section.dataset.persist === "true";
      const tl      = buildSectionTimeline(section);
      let isVisible = false;

      ScrollTrigger.create({
        trigger: scrollCont,
        start: "top top",
        end: "bottom bottom",
        scrub: false,
        onUpdate: (self) => {
          const p    = self.progress;
          const fade = 0.025;

          /* Opacity fade in/out */
          let opacity = 0;
          if (p >= enter - fade && p <= enter) {
            opacity = (p - (enter - fade)) / fade;
          } else if (p > enter && (p < leave || persist)) {
            opacity = 1;
          } else if (!persist && p >= leave && p <= leave + fade) {
            opacity = 1 - (p - leave) / fade;
          }
          section.style.opacity = String(opacity);

          /* Play / reverse entrance animation */
          const active = p >= enter - 0.005 && (persist || p <= leave + 0.005);
          if (active && !isVisible) {
            isVisible = true;
            section.classList.add("visible");
            tl.play();
          } else if (!active && isVisible && !persist) {
            isVisible = false;
            section.classList.remove("visible");
            tl.reverse();
          }
        }
      });
    });
  }

  /* ──────────────────────────────────────
     8 · DARK OVERLAY (stats section)
  ────────────────────────────────────── */
  function initDarkOverlay() {
    const enter = 0.72;  /* stats data-enter="73" */
    const leave = 0.84;  /* stats data-leave="83" */
    const fade  = 0.02;

    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let opacity = 0;
        if (p >= enter - fade && p < enter) {
          opacity = (p - (enter - fade)) / fade;
        } else if (p >= enter && p < leave) {
          opacity = 0.91;
        } else if (p >= leave && p <= leave + fade) {
          opacity = 0.91 * (1 - (p - leave) / fade);
        }
        darkOverlay.style.opacity = String(opacity);
      }
    });
  }

  /* ──────────────────────────────────────
     9 · COUNTER ANIMATIONS
  ────────────────────────────────────── */
  function initCounters() {
    document.querySelectorAll(".stat-number").forEach((el) => {
      const target   = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || "0");

      gsap.fromTo(el,
        { textContent: 0 },
        {
          textContent: target,
          duration: target > 100 ? 2.6 : 2.0,
          ease: "power1.out",
          snap: { textContent: decimals === 0 ? 1 : 0.1 },
          scrollTrigger: {
            trigger: el.closest(".scroll-section"),
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  }

  /* ──────────────────────────────────────
     10 · HORIZONTAL MARQUEE
  ────────────────────────────────────── */
  function initMarquee() {
    const speed = parseFloat(marqueeWrap.dataset.scrollSpeed) || -28;
    const text  = marqueeWrap.querySelector(".marquee-text");

    const mEnter = 0.17;
    const mLeave = 0.88;
    const mFade  = 0.04;

    gsap.to(text, {
      xPercent: speed,
      ease: "none",
      scrollTrigger: {
        trigger: scrollCont,
        start: "top top",
        end: "bottom bottom",
        scrub: true
      }
    });

    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let opacity = 0;
        if (p >= mEnter - mFade && p < mEnter) {
          opacity = (p - (mEnter - mFade)) / mFade;
        } else if (p >= mEnter && p < mLeave) {
          opacity = 1;
        } else if (p >= mLeave && p <= mLeave + mFade) {
          opacity = 1 - (p - mLeave) / mFade;
        }
        marqueeWrap.style.opacity = String(opacity);
      }
    });
  }

  /* ──────────────────────────────────────
     NAV link scroll-to
  ────────────────────────────────────── */
  function initNavLinks() {
    document.querySelectorAll(".nav-link[data-target]").forEach((link) => {
      link.addEventListener("click", () => {
        const pct    = parseFloat(link.dataset.target) / 100;
        const totalH = scrollCont.offsetHeight - window.innerHeight;
        window.scrollTo({ top: pct * totalH, behavior: "smooth" });
      });
    });
  }

  /* ──────────────────────────────────────
     INIT
  ────────────────────────────────────── */
  function init() {
    gsap.registerPlugin(ScrollTrigger);

    positionSections();
    initLenis();
    initHeroTransition();
    initFrameBinding();
    initSectionAnimations();
    initDarkOverlay();
    initCounters();
    initMarquee();
    initNavLinks();

    preload();
  }

  init();
})();
