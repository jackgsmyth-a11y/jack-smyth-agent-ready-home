// Client-side zero-PII interaction & Core Web Vitals telemetry.
// Implements the modern-web-guidance `full-session-analytics` and `batch-analytics-events`
// patterns using `fetchLater()` with `activateAfter` batching and the recommended
// `visibilitychange` + `keepalive`/`sendBeacon` polyfill fallback.

export const telemetryScript = `(() => {
  // Minimal fetchLater() polyfill for browsers without native support (Firefox/Safari).
  globalThis.fetchLater ??= function fetchLater(url, init = {}) {
    let timeoutHandle;
    let activated = false;
    function sendNow() {
      if (!(init.signal && init.signal.aborted)) {
        if ('keepalive' in Request.prototype || init.method !== 'POST' || init.headers) {
          fetch(url, Object.assign({}, init, { keepalive: true })).catch(() => {});
          activated = true;
        } else {
          activated = navigator.sendBeacon(url, init.body);
        }
      }
      destroy();
    }
    function destroy() {
      document.removeEventListener('visibilitychange', sendNow);
      clearTimeout(timeoutHandle);
    }
    if (document.visibilityState === 'hidden') {
      queueMicrotask(sendNow);
    } else {
      document.addEventListener('visibilitychange', sendNow);
      if (typeof init.activateAfter === 'number' && init.activateAfter >= 0) {
        timeoutHandle = setTimeout(sendNow, init.activateAfter);
      }
    }
    if (init.signal) init.signal.addEventListener('abort', destroy);
    return { get activated() { return activated; } };
  };

  const ENDPOINT = '/api/telemetry';
  const BATCH_WINDOW_MS = 10000;
  const MAX_QUEUE_SIZE = 40;
  const queue = [];
  let pendingResult = null;
  let pendingController = null;

  function enqueue(type, detail) {
    if (pendingResult?.activated || queue.length >= MAX_QUEUE_SIZE) {
      pendingController = null;
      pendingResult = null;
      queue.length = 0;
    }
    queue.push({
      type,
      path: location.pathname,
      ts: Date.now(),
      ...(detail ? { detail } : {}),
    });
    if (pendingController) pendingController.abort();
    pendingController = new AbortController();
    try {
      pendingResult = globalThis.fetchLater(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: queue }),
        signal: pendingController.signal,
        activateAfter: BATCH_WINDOW_MS,
      });
    } catch {
      // Ignore quota errors gracefully.
    }
  }

  // 1. Page view (referrer host only, zero PII)
  let refHost = '';
  try { if (document.referrer) refHost = new URL(document.referrer).hostname; } catch {}
  enqueue('page_view', refHost ? { refHost } : undefined);

  // 2. Lens switch (Human | Agent X-Ray)
  document.querySelectorAll('[data-lens-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      enqueue('lens_switch', { mode: btn.getAttribute('data-lens-btn') || 'human' });
    });
  });

  // 3. Key link & CTA clicks (experiments, outbound, MCP copy)
  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target.closest('a, button') : null;
    if (!target) return;
    if (target.hasAttribute('data-copy')) {
      enqueue('mcp_copy', { label: target.getAttribute('data-copy') || 'mcp' });
      return;
    }
    if (target.tagName === 'A') {
      const href = target.getAttribute('href') || '';
      if (href.startsWith('/experiments/')) {
        enqueue('experiment_click', { to: href.split('?')[0] });
      } else if (href.startsWith('https://')) {
        try { enqueue('outbound_click', { host: new URL(href).hostname }); } catch {}
      }
    }
  }, { passive: true });

  // 4. Scroll depth milestones (25 / 50 / 75 / 100%)
  const seenDepths = new Set();
  let scrollTick = false;
  window.addEventListener('scroll', () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      scrollTick = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m && !seenDepths.has(m)) {
          seenDepths.add(m);
          enqueue('scroll_depth', { pct: m });
        }
      }
    });
  }, { passive: true });

  // 5. Core Web Vitals (LCP, CLS, INP, TTFB) via PerformanceObserver
  if ('PerformanceObserver' in window) {
    try {
      let lcp = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) lcp = Math.round(last.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      let cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });

      let inp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > inp) inp = Math.round(entry.duration);
        }
      }).observe({ type: 'event', durationThreshold: 40, buffered: true });

      window.addEventListener('load', () => {
        setTimeout(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          const ttfb = nav ? Math.round(nav.responseStart) : 0;
          enqueue('cwv', {
            lcpMs: lcp,
            cls: Number(cls.toFixed(4)),
            inpMs: inp,
            ttfbMs: ttfb,
          });
        }, 1500);
      }, { once: true });
    } catch {
      // Unsupported entry types in older browsers.
    }
  }
})();
`;
