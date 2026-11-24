// Client-side interactive layer for jacksmyth.fyi:
// 1. Three Bets living Gemma-style ASCII emblems (reduced-motion & viewport aware)
// 2. Live Humans-vs-Agents Dual-Species Pulse strip (from /api/self-opt/summary)
// 3. Live "Try My MCP" interactive console (real POST /mcp JSON-RPC calls)
// 4. Native <dialog> Command Palette (⌘K) mapped 1:1 to WebMCP/MCP tools

export const homeClientScript = String.raw`(() => {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Three Bets Living ASCII Emblems (aria-hidden="true", ~10fps, paused off-screen)
  const betEls = Array.from(document.querySelectorAll("[data-bet-ascii]"));
  if (betEls.length) {
    let frame = 0;
    let paused = prefersReduced;
    const visible = new Set();

    function drawDifferentiation(t) {
      const scan = Math.floor((t * 0.4) % 5);
      const rows = [
        "  ==== commodity copy ====",
        "  ==== vague claim    ====",
        "  [SPEC|PROOF · 89% CITED]",
        "  ==== generic hype   ====",
        "  ==== me-too feature ====",
      ];
      return rows.map((r, i) => {
        if (i === 2) return (scan === 2 ? ">>" : " >") + r.slice(2) + (scan === 2 ? " <<" : " <");
        return (scan === i ? " ·" : "  ") + r.slice(2);
      }).join("\n");
    }

    function drawMultimodality(t) {
      const W = 28, H = 5;
      const ramp = " .:+*#@";
      const lines = [];
      for (let y = 0; y < H; y++) {
        let row = "";
        for (let x = 0; x < W; x++) {
          if (x < 17) {
            const wave = Math.sin(x * 0.48 - t * 0.32) * 1.8 + 2;
            const d = Math.abs(y - wave);
            row += d < 0.55 ? "@" : d < 1.15 ? "*" : d < 1.7 ? ":" : " ";
          } else if (y === 2) {
            const head = 17 + Math.floor((t * 0.6) % 10);
            row += x === head ? ">" : x === 27 ? "★" : "-";
          } else if (y === 1 && x === 19) {
            row += "[▶ VIDEO]";
            break;
          } else if (y === 3 && x === 19) {
            row += "AI CITED";
            break;
          } else {
            row += " ";
          }
        }
        lines.push(row);
      }
      return lines.join("\n");
    }

    function drawAnticipation(t) {
      const p = Math.floor((t * 0.45) % 14);
      const track = Array(14).fill("-");
      if (p < 6) {
        track[p] = ">";
      } else if (p < 9) {
        track[6] = "✓";
      } else {
        track[6] = "✓";
        track[Math.min(13, p)] = "=";
      }
      return [
        "  [HUMAN]        [AGENT]",
        "     |  approve     |",
        "     +--" + track.slice(0, 7).join("") + "+" + track.slice(7).join("") + "> [IDEA]",
        "        gate: " + (p >= 6 ? "OK ✓" : "WAIT") + "  A$0.10",
        "   MCP: /leaderbored/mcp",
      ].join("\n");
    }

    function renderAll() {
      betEls.forEach((el) => {
        const kind = el.getAttribute("data-bet-ascii");
        if (kind === "differentiation") el.textContent = drawDifferentiation(frame);
        else if (kind === "multimodality") el.textContent = drawMultimodality(frame);
        else if (kind === "anticipation") el.textContent = drawAnticipation(frame);
      });
    }

    renderAll();

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });
      }, { threshold: 0.05 });
      betEls.forEach((el) => io.observe(el));
    } else {
      betEls.forEach((el) => visible.add(el));
    }

    if (!paused) {
      setInterval(() => {
        if (document.hidden || visible.size === 0) return;
        frame += 1;
        renderAll();
      }, 110);
    }
  }

  // 2. Live Humans-vs-Agents Dual-Species Pulse
  const pulseEl = document.getElementById("species-pulse");
  if (pulseEl) {
    fetch("/api/self-opt/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.human || !d.agents) return;
        const h = Number(d.human.totalPageViews || 0);
        const a = Number(d.agents.totalRequests || 0);
        const total = h + a;
        const setTxt = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = String(v); };
        setTxt("pulse-humans", h);
        setTxt("pulse-agents", a);
        const hBlocks = total > 0 ? Math.max(1, Math.round((h / total) * 10)) : 5;
        const aBlocks = Math.max(0, 10 - hBlocks);
        setTxt("pulse-bar", "█".repeat(hBlocks) + "░".repeat(aBlocks));
        const topBots = Object.entries(d.agents.byAgent || {})
          .sort((x, y) => Number(y[1]) - Number(x[1]))
          .slice(0, 3)
          .map(([k, v]) => k + " (" + v + ")")
          .join(" · ");
        if (topBots) setTxt("pulse-bots", topBots);
        const lcp = d.human.cwvP75 && d.human.cwvP75.lcpMs;
        if (lcp) setTxt("pulse-cwv", "p75 LCP " + lcp + "ms");
      })
      .catch(() => {});
  }

  // 3. Live "Try My MCP" Interactive Console
  const demoBtns = Array.from(document.querySelectorAll("[data-mcp-demo]"));
  const demoOut = document.getElementById("mcp-console-out");
  const demoMeta = document.getElementById("mcp-console-meta");
  const demoBadge = document.getElementById("mcp-console-badge");
  const DEMOS = {
    profile: {
      tool: "get_profile",
      args: {},
      badge: "SOURCE-BACKED · READ-ONLY",
    },
    strategy: {
      tool: "apply_strategy",
      args: { brief: "Our B2B brand ranks on Google but is invisible in AI Overviews and ChatGPT shopping answers. What should our CMO prioritise first?" },
      badge: "GENERATED SYNTHESIS · NOT JACK'S DIRECT WORDS",
    },
    youtube: {
      tool: "search",
      args: { query: "YouTube", limit: 4 },
      badge: "DETERMINISTIC SEARCH · SOURCE-BACKED",
    },
  };

  if (demoBtns.length && demoOut) {
    demoBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const key = btn.getAttribute("data-mcp-demo");
        const spec = key && DEMOS[key];
        if (!spec) return;
        demoBtns.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        if (demoMeta) demoMeta.textContent = "POST /mcp -> tools/call (" + spec.tool + ") …";
        if (demoBadge) demoBadge.textContent = "CALLING LIVE MCP…";
        demoOut.textContent = "// Sending JSON-RPC 2.0 request to /mcp ...";
        const t0 = performance.now();
        try {
          const res = await fetch("/mcp", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
            body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name: spec.tool, arguments: spec.args } }),
          });
          const raw = await res.text();
          const dataLine = raw.split("\n").find((l) => l.startsWith("data:"));
          const rpc = JSON.parse(dataLine ? dataLine.slice(5) : raw);
          const payload = rpc && rpc.result && rpc.result.content && rpc.result.content[0] ? rpc.result.content[0].text : JSON.stringify(rpc, null, 2);
          let pretty = payload;
          try { pretty = JSON.stringify(JSON.parse(payload), null, 2); } catch {}
          const ms = Math.round(performance.now() - t0);
          if (demoMeta) demoMeta.textContent = "POST /mcp -> " + spec.tool + " · HTTP " + res.status + " · " + ms + "ms";
          if (demoBadge) demoBadge.textContent = spec.badge;
          demoOut.textContent = pretty.length > 2600 ? pretty.slice(0, 2600) + "\n// … truncated for preview (call /mcp for full payload)" : pretty;
        } catch {
          if (demoBadge) demoBadge.textContent = "ERROR";
          demoOut.textContent = "// Could not reach /mcp right now. Try again.";
        }
      });
    });
  }

  // 4. Native <dialog> Command Palette (⌘K) mapped 1:1 to WebMCP/MCP tools
  const dlg = document.getElementById("cmd-palette");
  const openBtn = document.getElementById("cmd-open");
  const filterInput = document.getElementById("cmd-filter");
  const cmdItems = Array.from(document.querySelectorAll("[data-cmd-item]"));

  if (dlg && typeof dlg.showModal === "function") {
    const openPalette = () => {
      if (dlg.open) return;
      if (filterInput) { filterInput.value = ""; filterCommands(""); }
      dlg.showModal();
      if (filterInput) filterInput.focus();
    };

    const filterCommands = (q) => {
      const needle = (q || "").trim().toLowerCase();
      cmdItems.forEach((item) => {
        const text = (item.textContent || "").toLowerCase();
        if (!needle || text.includes(needle)) item.removeAttribute("hidden");
        else item.setAttribute("hidden", "");
      });
    };

    if (openBtn) openBtn.addEventListener("click", openPalette);
    if (filterInput) filterInput.addEventListener("input", () => filterCommands(filterInput.value));

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dlg.open) dlg.close();
        else openPalette();
      }
    });

    // Handle action items inside palette
    cmdItems.forEach((item) => {
      item.addEventListener("click", () => {
        const action = item.getAttribute("data-cmd-action");
        if (action === "toggle-lens") {
          const isAgent = document.body.getAttribute("data-lens") === "agent";
          const targetBtn = document.querySelector('[data-lens-btn="' + (isAgent ? "human" : "agent") + '"]');
          if (targetBtn) targetBtn.click();
          dlg.close();
        } else if (action === "copy-mcp") {
          if (navigator.clipboard) navigator.clipboard.writeText(location.origin + "/mcp").catch(() => {});
          dlg.close();
        } else if (item.tagName === "A") {
          dlg.close();
        }
      });
    });

    dlg.addEventListener("close", () => {
      dlg.returnValue = "";
    });

    // Mandatory light-dismiss fallback for browsers without <dialog closedby="any"> (Safari)
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const outside = (e) => {
        const r = dlg.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      dlg.addEventListener("pointerdown", (e) => { pressedOutside = outside(e); });
      dlg.addEventListener("pointerup", (e) => { if (pressedOutside && outside(e)) dlg.close(); });
    }
  }
  // 5. Inline experiment previews on homepage (Facts with Flair & Leaderbored)
  function wireSegTabs(tabAttr, panelAttr) {
    const tabs = Array.from(document.querySelectorAll("[" + tabAttr + "]"));
    const panels = Array.from(document.querySelectorAll("[" + panelAttr + "]"));
    if (!tabs.length || !panels.length) return;
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute(tabAttr);
        tabs.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        panels.forEach((p) => {
          if (p.getAttribute(panelAttr) === id) p.removeAttribute("hidden");
          else p.setAttribute("hidden", "");
        });
      });
    });
  }
  wireSegTabs("data-flair-tab", "data-flair-panel");
  wireSegTabs("data-lb-tab", "data-lb-panel");
})();
`;
