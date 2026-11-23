export const wetLabClientScript = `(() => {
  // 00A. Gemma-inspired Swarm Theatre (auto-steps unless reduced motion or paused)
  const swarmBtns = Array.from(document.querySelectorAll("[data-swarm-btn]"));
  const swarmPanes = Array.from(document.querySelectorAll("[data-swarm-pane]"));
  const playToggle = document.getElementById("swarm-play-toggle");
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let swarmIdx = 0;
  let swarmPlaying = !prefersReduced;
  let swarmTimer = null;

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
  }

  function syncPlayLabel() {
    if (playToggle) playToggle.textContent = swarmPlaying ? "Pause animation" : "Play animation";
  }

  function scheduleSwarm() {
    if (swarmTimer) clearInterval(swarmTimer);
    swarmTimer = null;
    if (swarmPlaying && swarmPanes.length > 1) {
      swarmTimer = setInterval(() => showSwarmStage(swarmIdx + 1), 5200);
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
