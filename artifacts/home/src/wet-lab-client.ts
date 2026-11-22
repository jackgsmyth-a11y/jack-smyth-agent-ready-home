export const wetLabClientScript = `(() => {
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

  const statusEl = document.getElementById("wetlab-vote-status");
  document.querySelectorAll("[data-vote-pitch]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pitchId = btn.getAttribute("data-vote-pitch");
      if (!pitchId) return;
      btn.setAttribute("disabled", "true");
      try {
        const res = await fetch("/api/experiments/wet-lab/vote", {
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

  const form = document.getElementById("wetlab-question-form");
  const qInput = document.getElementById("wetlab-question");
  const byInput = document.getElementById("wetlab-submitter");
  const qStatus = document.getElementById("wetlab-question-status");
  const submitBtn = document.getElementById("wetlab-submit-btn");
  if (form && qInput && submitBtn) {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      submitBtn.setAttribute("disabled", "true");
      try {
        const res = await fetch("/api/experiments/wet-lab/suggest", {
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
