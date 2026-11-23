export const wetLabClientScript = `(() => {
  // 00A. Gemma-inspired Living ASCII Symbol Engine + Swarm Theatre
  const swarmBtns = Array.from(document.querySelectorAll("[data-swarm-btn]"));
  const swarmPanes = Array.from(document.querySelectorAll("[data-swarm-pane]"));
  const playToggle = document.getElementById("swarm-play-toggle");
  const asciiEl = document.getElementById("swarm-ascii-grid");
  const asciiCap = document.getElementById("swarm-ascii-caption");
  const asciiFps = document.getElementById("swarm-ascii-fps");
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let swarmIdx = 0;
  let swarmPlaying = !prefersReduced;
  let swarmTimer = null;
  let asciiFrame = 0;
  let asciiRaf = null;
  let lastAsciiTs = 0;

  const ASCII_CAPTIONS = [
    "PHASE 01 // SCOUT SWEEP · tokenising CMO search signals -> brief.json",
    "PHASE 02 // CONSIDER · 3 isolated agent clusters modelling A$100 sample math",
    "PHASE 03 // ARGUE · live cross-examination packets colliding at Judge reticle",
    "PHASE 04 // PITCH & JUDGE · converging logits -> GOOGLE ADS 435-353-5484 [A$100 CAP]",
  ];

  function renderAsciiFrame(stage, t) {
    if (!asciiEl) return;
    const W = 68, H = 17;
    const ramp = " .:+*%#@";
    const grid = Array.from({ length: H }, () => Array(W).fill(" "));
    const put = (x, y, ch) => {
      const ix = Math.round(x), iy = Math.round(y);
      if (ix >= 0 && ix < W && iy >= 0 && iy < H) grid[iy][ix] = ch;
    };
    const putStr = (x, y, s) => {
      for (let i = 0; i < s.length; i++) put(x + i, y, s[i]);
    };

    // Subtle architectural crosshairs (Gemma-style dashed axes)
    const cx = 30, cy = 8;
    for (let x = 2; x < W - 2; x += 2) put(x, cy, "-");
    for (let y = 0; y < H; y++) put(cx, y, "|");

    if (stage === 0) {
      // 01 SEARCH: Sweeping ASCII radar arc + converging search signal rings
      const angle = t * 0.14;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dx = (x - cx) * 0.52, dy = y - cy;
          const r = Math.hypot(dx, dy);
          if (r > 1.2 && r < 11.5) {
            const a = Math.atan2(dy, dx);
            let diff = ((a - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            const ring = Math.abs((r - (t * 0.22) % 11)) < 0.7 ? 0.55 : 0;
            const sweep = diff < 1.1 ? (1 - diff / 1.1) * 0.85 : 0;
            const val = Math.min(1, sweep + ring * (1 - r / 13));
            if (val > 0.14) put(x, y, ramp[Math.min(ramp.length - 1, Math.floor(val * ramp.length))]);
          }
        }
      }
      putStr(cx - 2, cy, "<@>");
      putStr(46, 3, "·ai·overviews");
      putStr(44, 6, "·89%·skip·vendor");
      putStr(45, 10, "·micro·budget");
      putStr(46, 13, "-> brief.json");
    } else if (stage === 1) {
      // 02 CONSIDER: Three distinct orbital agent clusters weighing A$100 sample math
      const centers = [
        { x: 14, y: 8, sym: "Δ", lbl: "DIFF [81]" },
        { x: 34, y: 8, sym: "▶", lbl: "MULTI [78]" },
        { x: 54, y: 8, sym: "⚡", lbl: "ANTIC [74]" },
      ];
      centers.forEach((c, idx) => {
        for (let y = 1; y < H - 1; y++) {
          for (let x = Math.max(0, c.x - 9); x < Math.min(W, c.x + 10); x++) {
            const dx = (x - c.x) * 0.55, dy = y - c.y;
            const r = Math.hypot(dx, dy);
            const wave = Math.sin(r * 1.4 - t * 0.25 + idx * 2.1) * 0.5 + 0.5;
            if (r > 1.1 && r < 5.6 && wave > 0.42) {
              const v = (wave - 0.42) / 0.58 * (1 - r / 6.2);
              if (v > 0.1) put(x, y, ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))]);
            }
          }
        }
        putStr(c.x - 1, c.y, "[" + c.sym + "]");
        putStr(c.x - 4, 15, c.lbl);
      });
    } else if (stage === 2) {
      // 03 ARGUE: Packets firing between the 3 teams & colliding at central Judge reticle
      const nodes = [{ x: 10, y: 3, n: "DIFF" }, { x: 10, y: 13, n: "MULTI" }, { x: 54, y: 8, n: "ANTIC" }];
      for (let i = 0; i < nodes.length; i++) {
        const nd = nodes[i];
        putStr(nd.x - 2, nd.y, "[" + nd.n + "]");
        for (let k = 0; k < 3; k++) {
          const p = ((t * 0.055 + k * 0.33 + i * 0.17) % 1);
          const px = nd.x + (cx - nd.x) * p;
          const py = nd.y + (cy - nd.y) * p;
          const ch = p > 0.78 ? "@" : p > 0.5 ? "#" : p > 0.25 ? "*" : "+";
          put(px, py, ch);
          put(px - Math.sign(cx - nd.x), py, ":");
        }
      }
      // Central collision spark burst
      const pulse = Math.sin(t * 0.35) * 1.6 + 3.2;
      for (let y = 3; y <= 13; y++) {
        for (let x = cx - 8; x <= cx + 8; x++) {
          const r = Math.hypot((x - cx) * 0.55, y - cy);
          if (Math.abs(r - pulse) < 0.85) put(x, y, r < 2.5 ? "#" : "*");
        }
      }
      putStr(cx - 4, cy, "|JUDGE|");
      putStr(cx - 5, 1, "+4 var / -2 noise");
      putStr(cx - 5, 15, "verdict -> DIFF");
    } else {
      // 04 PITCH & JUDGE: Gemma-style converging focal star-lens & live Ads output beam
      const fx = 28;
      for (let y = 0; y < H; y++) {
        const dy = y - cy;
        // Parabolic lens arc on the right of focus
        const arcX = Math.round(fx + 10 - (dy * dy) * 0.13);
        if (arcX > fx && arcX < W - 2) {
          put(arcX, y, dy < -1 ? "\\\\" : dy > 1 ? "/" : "|");
          if (Math.abs(dy) > 2) put(arcX - 1, y, dy < 0 ? "\\\\" : "/");
        }
        // Converging chevron star-density from left into focal point
        for (let x = 2; x <= fx + 5; x++) {
          const dx = fx - x;
          const chevron = Math.abs(Math.abs(dy) - dx * 0.38);
          const wave = Math.sin(dx * 0.45 - t * 0.28) * 0.35 + 0.65;
          if (dx >= -4 && chevron < 2.6) {
            const dist = Math.hypot(dx * 0.42, dy);
            const density = Math.max(0, (1 - chevron / 2.6) * (1 - dist / 14) * wave);
            if (density > 0.12) {
              put(x, y, ramp[Math.min(ramp.length - 1, Math.floor(density * ramp.length))]);
            }
          }
        }
      }
      // Output beam shooting right from focal lens -> Google Ads
      const beamHead = fx + 11 + Math.floor((t * 0.9) % 24);
      for (let x = fx + 11; x < W - 2; x++) {
        put(x, cy, x === beamHead ? ">" : x === beamHead - 1 ? "=" : "-");
      }
      putStr(fx - 2, cy, "#@|@#");
      putStr(42, 4, "DIFF  81/100  ★ FUNDED");
      putStr(42, 6, "MULTI 78/100");
      putStr(42, 10, "ANTIC 74/100");
      putStr(42, 13, "ADS 435-353-5484 [A$100]");
    }

    asciiEl.textContent = grid.map((row) => row.join("")).join("\\n");
  }

  function tickAscii(ts) {
    if (!swarmPlaying) { asciiRaf = null; return; }
    if (ts - lastAsciiTs >= 66) { // ~15fps smooth & ultra-lightweight
      lastAsciiTs = ts;
      asciiFrame += 1;
      renderAsciiFrame(swarmIdx, asciiFrame);
    }
    asciiRaf = requestAnimationFrame(tickAscii);
  }

  function showSwarmStage(idx) {
    swarmIdx = ((idx % swarmPanes.length) + swarmPanes.length) % swarmPanes.length;
    swarmBtns.forEach((btn) => {
      const active = Number(btn.getAttribute("data-swarm-btn")) === swarmIdx;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    swarmPanes.forEach((pane) => {
      const active = Number(pane.getAttribute("data-swarm-pane")) === swarmIdx;
      if (active) pane.removeAttribute("hidden");
      else pane.setAttribute("hidden", "");
    });
    if (asciiCap) asciiCap.textContent = ASCII_CAPTIONS[swarmIdx] || ASCII_CAPTIONS[0];
    renderAsciiFrame(swarmIdx, asciiFrame);
  }

  function syncPlayLabel() {
    if (playToggle) playToggle.textContent = swarmPlaying ? "Pause animation" : "Play animation";
    if (asciiFps) asciiFps.textContent = swarmPlaying ? "LIVE ASCII · 15fps" : "PAUSED · STATIC FRAME";
  }

  function scheduleSwarm() {
    if (swarmTimer) clearInterval(swarmTimer);
    swarmTimer = null;
    if (swarmPlaying && swarmPanes.length > 1) {
      swarmTimer = setInterval(() => showSwarmStage(swarmIdx + 1), 6000);
      if (!asciiRaf) asciiRaf = requestAnimationFrame(tickAscii);
    } else if (asciiRaf) {
      cancelAnimationFrame(asciiRaf);
      asciiRaf = null;
    }
    syncPlayLabel();
  }

  if (swarmBtns.length && swarmPanes.length) {
    swarmBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        swarmPlaying = false;
        showSwarmStage(Number(btn.getAttribute("data-swarm-btn")) || 0);
        scheduleSwarm();
      });
    });
    if (playToggle) {
      playToggle.addEventListener("click", () => {
        swarmPlaying = !swarmPlaying;
        scheduleSwarm();
      });
    }
    showSwarmStage(0);
    scheduleSwarm();
  }

  // 00B. Live zero-cost campaign tracker refresh
  const refreshBtn = document.getElementById("fl-refresh-live");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.setAttribute("disabled", "true");
      try {
        const res = await fetch("/api/experiments/field-lab/live", { cache: "no-store" });
        if (!res.ok) throw new Error("Refresh failed");
        const t = await res.json();
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
        const fmtPct = (v) => (v === null || v === undefined ? "—" : v + "%");
        setTxt("fl-spend", "A$" + Number(t.spendAud || 0).toFixed(2));
        setTxt("fl-remaining", "A$" + Number(t.spendRemainingAud || 0).toFixed(2));
        const meter = document.getElementById("fl-spend-meter");
        if (meter) meter.setAttribute("value", String(t.spendAud || 0));
        setTxt("fl-va-imp", t.variants.variantA.impressions);
        setTxt("fl-va-clicks", t.variants.variantA.clicks + " (" + fmtPct(t.variants.variantA.ctrPct) + ")");
        setTxt("fl-va-views", t.variants.variantA.landingViews);
        setTxt("fl-va-scroll", t.variants.variantA.scroll50 + " (" + fmtPct(t.variants.variantA.scroll50RatePct) + ")");
        setTxt("fl-vb-imp", t.variants.variantB.impressions);
        setTxt("fl-vb-clicks", t.variants.variantB.clicks + " (" + fmtPct(t.variants.variantB.ctrPct) + ")");
        setTxt("fl-vb-views", t.variants.variantB.landingViews);
        setTxt("fl-vb-scroll", t.variants.variantB.scroll50 + " (" + fmtPct(t.variants.variantB.scroll50RatePct) + ")");
        setTxt("fl-bayes-verdict", t.bayesianScrollAudit.verdict);
      } catch {
        // Keep last rendered values on transient error
      } finally {
        refreshBtn.removeAttribute("disabled");
      }
    });
  }

  // Interactive Glass-Box 5-stage schematic tabs
  const tabs = document.querySelectorAll("[data-gb-tab]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-gb-tab");
      tabs.forEach((t) => t.setAttribute("aria-selected", t === tab ? "true" : "false"));
      document.querySelectorAll(".gb-panel").forEach((p) => {
        if (p.id === targetId) p.removeAttribute("hidden");
        else p.setAttribute("hidden", "");
      });
    });
  });

  // Stage 05 Bayesian sample-size comparator
  const bayesBtns = document.querySelectorAll("[data-bayes-mode]");
  const bayesOut = document.getElementById("gb-bayes-readout");
  bayesBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-bayes-mode");
      bayesBtns.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      if (!bayesOut) return;
      if (mode === "lower") {
        bayesOut.innerHTML = "<strong>Down-Funnel B2B Lead CPA (A$100 AUD — Automatically Rejected)</strong><p class='quiet'>At A$15–A$35 CPC, A$100 buys only 3–6 clicks and 0–1 leads. Bayesian posterior stays ~50/50 (pure noise). The Judge Agent rejects these pitches before spend is wasted.</p>";
      } else {
        bayesOut.innerHTML = "<strong>Upper-Funnel YouTube Shorts / Demand Gen (A$100 AUD — Approved)</strong><p class='quiet'>~4,000–7,500 impressions · 80–180 engagements · Beta-Binomial posterior can reliably detect a +20% relative hook lift with ≥75% directional confidence. Result is published transparently as directional evidence, never overclaimed.</p>";
      }
    });
  });

  const statusEl = document.getElementById("fieldlab-vote-status");
  document.querySelectorAll("[data-vote-pitch]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pitchId = btn.getAttribute("data-vote-pitch");
      if (!pitchId) return;
      btn.setAttribute("disabled", "true");
      try {
        const res = await fetch("/api/experiments/field-lab/vote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pitchId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Vote failed.");
        const counter = document.querySelector('[data-vote-count="' + pitchId + '"]');
        if (counter) counter.textContent = String(data.votes);
        btn.textContent = "Voted ✓";
        if (statusEl) {
          statusEl.className = "notice";
          statusEl.textContent = "Vote recorded for " + pitchId + " (" + data.votes + " total).";
        }
      } catch (err) {
        btn.removeAttribute("disabled");
        if (statusEl) {
          statusEl.className = "notice error";
          statusEl.textContent = err && err.message ? err.message : "Could not record vote.";
        }
      }
    });
  });

  const form = document.getElementById("fieldlab-question-form");
  const qInput = document.getElementById("fieldlab-question");
  const byInput = document.getElementById("fieldlab-submitter");
  const qStatus = document.getElementById("fieldlab-question-status");
  const submitBtn = document.getElementById("fieldlab-submit-btn");
  if (form && qInput && submitBtn) {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      submitBtn.setAttribute("disabled", "true");
      try {
        const res = await fetch("/api/experiments/field-lab/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: qInput.value,
            submittedBy: byInput ? byInput.value : "",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Submission failed.");
        qInput.value = "";
        if (byInput) byInput.value = "";
        if (qStatus) {
          qStatus.className = "notice";
          qStatus.textContent = "Submitted to next month's Scout Agent queue (" + data.submission.id + ").";
        }
      } catch (err) {
        if (qStatus) {
          qStatus.className = "notice error";
          qStatus.textContent = err && err.message ? err.message : "Could not submit question.";
        }
      } finally {
        submitBtn.removeAttribute("disabled");
      }
    });
  }
})();
`;
