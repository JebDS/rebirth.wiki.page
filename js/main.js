(function () {
  'use strict';

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function forceTopOnce() {
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    window.scrollTo(0, 0);
  }

  function getHeadingLevel(heading) {
    return heading.tagName === 'H3' ? 3 : 4;
  }

  function getHeadingTargets(heading) {
    const level = getHeadingLevel(heading);
    const targets = [];
    let node = heading.nextElementSibling;

    while (node) {
      if (node.tagName === 'H3') break;
      if (level === 4 && node.tagName === 'H4') break;
      if (node.classList && node.classList.contains('section-fold')) break;
      targets.push(node);
      node = node.nextElementSibling;
    }

    return targets;
  }

  function toggleHeading(heading) {
    const folded = heading.classList.toggle('is-folded');
    getHeadingTargets(heading).forEach((element) => {
      element.hidden = folded;
      element.style.removeProperty('max-height');
      element.style.removeProperty('opacity');
      element.style.removeProperty('overflow');
      element.style.removeProperty('transition');
    });
  }

  function initHeadingToggles() {
    $$('h3.subsection-toggle, h4.subsection-toggle').forEach((heading) => {
      heading.addEventListener('click', () => toggleHeading(heading));
      heading.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleHeading(heading);
      });
    });

    $$('.heading-num-link').forEach((link) => {
      link.addEventListener('click', (event) => event.stopPropagation());
    });
  }

  function initTocToggle() {
    const toc = $('#toc');
    const button = toc ? $('.toc-toggle', toc) : null;
    if (!toc || !button) return;

    button.addEventListener('click', () => {
      const collapsed = toc.classList.toggle('is-collapsed');
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      button.setAttribute('aria-label', collapsed ? '목차 펼치기' : '목차 접기');
    });
  }

  function initQuickNav() {
    const nav = $('.quick-nav');
    const toc = $('#toc');
    if (!nav || !toc) return;

    const update = () => {
      const passedToc = toc.getBoundingClientRect().bottom <= 0;
      nav.classList.toggle('is-visible', passedToc);
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    update();
  }

  function openParentDetails(target) {
    let parent = target.closest('details');
    while (parent) {
      parent.open = true;
      parent = parent.parentElement ? parent.parentElement.closest('details') : null;
    }
  }

  function initAnchorExpansion() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;

      const target = $(hash);
      if (target) openParentDetails(target);
    });
  }

  function shouldUseNoteModal() {
    const smallScreen = window.matchMedia('(max-width: 760px)').matches;
    const touchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const tabletPortrait = window.matchMedia('(max-width: 900px) and (hover: none)').matches;
    return smallScreen || touchDevice || tabletPortrait;
  }

  function initNoteModal() {
    const popover = $('#note-popover');
    const backdrop = $('#note-backdrop');
    if (!popover || !backdrop) return;

    const title = $('.pop-title', popover);
    const body = $('.pop-body', popover);
    const closeButton = $('.pop-close', popover);

    const close = () => {
      popover.classList.remove('show');
      backdrop.classList.remove('show');
      document.body.classList.remove('note-open');
    };

    const open = (ref) => {
      title.textContent = `[${ref.dataset.noteNo}] `;
      body.textContent = ref.dataset.note || '';
      popover.classList.toggle('ghost', ref.dataset.noteNo === '3');
      backdrop.classList.add('show');
      popover.classList.add('show');
      document.body.classList.add('note-open');
    };

    document.addEventListener('click', (event) => {
      const ref = event.target.closest('.note-ref');

      if (ref) {
        if (!shouldUseNoteModal()) return;
        event.preventDefault();
        event.stopPropagation();
        open(ref);
        return;
      }

      if (event.target === backdrop) close();
    });

    if (closeButton) closeButton.addEventListener('click', close);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    window.addEventListener('resize', () => {
      if (!shouldUseNoteModal()) close();
    });
  }

  function initNoteHoverCard() {
    const card = $('#note-hover-card');
    if (!card) return;

    const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const hide = () => {
      card.classList.remove('show');
      card.setAttribute('aria-hidden', 'true');
    };

    const show = (ref) => {
      if (!canHover()) return;

      const no = ref.dataset.noteNo || '';
      const note = ref.dataset.note || '';
      card.innerHTML = `<span class="hover-note-no">[${no}]</span> ${note}`;
      card.classList.toggle('ghost', no === '3');
      card.classList.add('show');
      card.setAttribute('aria-hidden', 'false');

      const refRect = ref.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      let left = refRect.left + window.scrollX;
      let top = refRect.top + window.scrollY - cardRect.height - 14;

      left = Math.max(
        12 + window.scrollX,
        Math.min(left, window.scrollX + window.innerWidth - cardRect.width - 12)
      );

      const arrowLeft = Math.max(
        18,
        Math.min(refRect.left + window.scrollX - left + 6, cardRect.width - 18)
      );

      card.style.setProperty('--note-arrow-left', `${arrowLeft}px`);

      if (top < window.scrollY + 8) {
        top = refRect.bottom + window.scrollY + 12;
        card.classList.add('below');
      } else {
        card.classList.remove('below');
      }

      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    };

    document.addEventListener('mouseover', (event) => {
      const ref = event.target.closest('.note-ref');
      if (ref) show(ref);
    });

    document.addEventListener('mouseout', (event) => {
      const ref = event.target.closest('.note-ref');
      if (!ref) return;
      const to = event.relatedTarget;
      if (to && (to === ref || ref.contains(to))) return;
      hide();
    });

    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('resize', hide);
  }

  function init() {
    initHeadingToggles();
    initTocToggle();
    initQuickNav();
    initAnchorExpansion();
    initNoteModal();
    initNoteHoverCard();
  }

  window.addEventListener('pageshow', forceTopOnce);
  window.addEventListener('load', () => setTimeout(forceTopOnce, 0));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
