/* -------------------------------------------------------------
   String-1 tracer engine
   Each problem page calls Tracer({...}) with its Java code, its
   inputs and a trace(values, T) function that records the steps.
   The engine builds the controls, the code panel, the string
   strips, the variable table and the playback.
   ------------------------------------------------------------- */
(function () {
  "use strict";

  // CodingBat order and problem ids (for prev / next and the CodingBat link).
  // Only the problems in the answer key are listed.
  const PROBLEMS = [
    ["helloName", "p171896"], ["makeOutWord", "p184030"], ["firstHalf", "p172267"],
    ["nonStart", "p143825"], ["theEnd", "p162477"], ["endsLy", "p103895"],
    ["middleThree", "p115863"], ["lastChars", "p138183"], ["seeColor", "p199216"],
    ["extraFront", "p172063"], ["startWord", "p141494"]
  ];

  // ---------- Syntax highlighting (Monokai) ----------
  const KW = /^(public|static|for|while|if|else|return|new)$/;
  const TY = /^(int|char|boolean|String|void)$/;
  const LIT = /^(true|false|null)$/;
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function highlightCode(line) {
    return line.replace(/[A-Za-z_]\w*|\d+|"[^"]*"|'[^']*'|[^\w"']+/g, (tok, off, str) => {
      const e = esc(tok);
      if (KW.test(tok)) return `<span class="k">${e}</span>`;
      if (TY.test(tok)) return `<span class="t">${e}</span>`;
      if (LIT.test(tok) || /^\d+$/.test(tok)) return `<span class="n">${e}</span>`;
      if (/^["']/.test(tok)) return `<span class="s">${e}</span>`;
      if (/^[A-Za-z_]/.test(tok) && /^\s*\(/.test(str.slice(off + tok.length))) return `<span class="f">${e}</span>`;
      return e;
    });
  }
  function highlight(line) {
    // Split off a // comment that is not inside a string literal.
    let inStr = null;
    for (let k = 0; k < line.length - 1; k++) {
      const ch = line[k];
      if (inStr) { if (ch === inStr) inStr = null; }
      else if (ch === '"' || ch === "'") inStr = ch;
      else if (ch === "/" && line[k + 1] === "/")
        return highlightCode(line.slice(0, k)) + `<span class="cm">${esc(line.slice(k))}</span>`;
    }
    return highlightCode(line);
  }

  // ---------- Values ----------
  function Ch(c) { this.c = c; }
  function fmt(v) {
    if (v instanceof Ch) return `'${v.c}'`;
    if (typeof v === "string") return JSON.stringify(v);
    return String(v);
  }

  // A string drawn as a row of boxes, plus the marks for one step.
  function Strip(name, text) {
    this.label = `${name} = ${JSON.stringify(text)}`;
    this.text = text; this.c = {}; this.t = {}; this.b = {}; this.g = {}; this.tags = []; this.off = 0;
  }
  Strip.prototype = {
    // add a CSS class to boxes a..b-1 (win, win2, outer, inner, hit, soft, miss, new, done)
    cls(a, b, name) { for (let k = a; k < b; k++) this.c[k] = (this.c[k] ? this.c[k] + " " : "") + name; return this; },
    at(i, name) { return this.cls(i, i + 1, name); },
    top(i, text, color) { return this._ptr(this.t, i, text, color || "outer"); },
    bot(i, text, color) { return this._ptr(this.b, i, text, color || "inner"); },
    _ptr(map, i, text, color) { map[i] = map[i] ? { text: map[i].text + " " + text, color: map[i].color } : { text, color }; return this; },
    badge(i, text, kind) { this.g[i] = { text, kind: kind || "ok" }; return this; },
    tag(text, color) { this.tags.push({ text, color: color || "" }); return this; },
    named(label) { this.label = label; return this; },
    shift(n) { this.off = n; return this; }   // indent the row by n blank boxes (to line strings up)
  };

  // ---------- Page ----------
  window.Tracer = function (cfg) {
    const $ = id => document.getElementById(id);
    const main = document.querySelector("main");
    const pi = PROBLEMS.findIndex(p => p[0] === cfg.name);
    const prevP = PROBLEMS[pi - 1], nextP = PROBLEMS[pi + 1];

    // Navigation
    const nav = document.createElement("nav");
    nav.className = "nav";
    nav.innerHTML =
      `<a class="home" href="index.html">← String-1</a>` +
      `<span class="pn">` +
      (prevP ? `<a href="${prevP[0]}.html">‹ ${prevP[0]}</a>` : "") +
      (nextP ? `<a href="${nextP[0]}.html">${nextP[0]} ›</a>` : "") +
      `</span><span class="spacer"></span>` +
      `<a href="https://codingbat.com/prob/${PROBLEMS[pi][1]}" target="_blank" rel="noopener">Solve ${cfg.name} on CodingBat ↗</a>`;
    main.prepend(nav);
    if (cfg.wide) main.classList.add("wide");

    // Controls + panels
    const inputs = cfg.inputs.map(inp => inp.kind === "bool"
      ? `<label>${esc(inp.label || inp.id)} <select id="in_${inp.id}">` +
        ["true", "false"].map(v => `<option${String(inp.value) === v ? " selected" : ""}>${v}</option>`).join("") + `</select></label>`
      : `<label>${esc(inp.label || inp.id)} <input id="in_${inp.id}" type="${inp.kind === "int" ? "number" : "text"}" ` +
      `value="${esc(inp.value)}" spellcheck="false" autocomplete="off"${inp.width ? ` style="width:${inp.width}px"` : ""}></label>`).join("");
    const presets = cfg.presets.map((p, k) => `<option value="${k}">${esc(argList(p))}</option>`).join("");
    const legend = (cfg.legend || []).map(([c, h]) => `<span style="--c: var(--${c})">${h}</span>`).join("");
    $("app").innerHTML = `
  <div class="controls">
    ${inputs}
    <select id="preset" aria-label="Examples"><option value="">Examples…</option>${presets}</select>
    <button id="reset">Load</button>
    <span class="spacer"></span>
    <button id="back" title="Step back (←)">◀ Back</button>
    <button id="play" class="primary" title="Play / pause (space)">▶ Play</button>
    <button id="step" title="Step forward (→)">Step ▶</button>
    <label>Speed <input id="speed" type="range" min="1" max="10" value="5"></label>
  </div>
  <div class="grid${cfg.wide ? " wide" : ""}">
    <section class="card">
      <h2>Code</h2>
      <pre class="code" id="code"></pre>
    </section>
    <section class="card">
      <h2>${cfg.stripsTitle || "The strings"}</h2>
      <div id="strips"></div>
      <div class="legend">${legend}</div>
      <div class="narr" id="narr"></div>
      <div class="vars${cfg.chk === false ? " one" : ""}">
        <div class="frame"><h3>${esc(cfg.name)}</h3><table id="vars"></table></div>
        ${cfg.chk === false ? "" : `<div class="frame chk idle" id="fChk"><h3>${cfg.chkTitle || "the test"}</h3><div id="chk"></div></div>`}
      </div>
      <div class="result" id="result"></div>
      <div class="progress"><div id="bar"></div></div>
      <div class="stepcount" id="stepcount"></div>
    </section>
  </div>`;

    const codeEl = $("code");
    codeEl.innerHTML = cfg.code.map(l => `<span class="ln">${highlight(l) || " "}</span>`).join("");
    const lineEls = [...codeEl.querySelectorAll(".ln")];

    function argList(vals) {
      return vals.map((v, k) => cfg.inputs[k].kind ? String(v) : JSON.stringify(v)).join(", ");
    }
    function readInputs() {
      return cfg.inputs.map(inp => {
        const raw = $("in_" + inp.id).value;
        if (inp.kind === "bool") return raw === "true";
        return inp.kind === "int" ? (raw.trim() === "" ? NaN : Number(raw)) : raw;
      });
    }

    // ---------- Trace recording ----------
    function record(vals) {
      const steps = [];
      const T = {
        vars: {}, view: null,
        c: ch => new Ch(ch),
        strip: (name, text) => new Strip(name, text),
        fmt, esc,
        q: v => esc(fmt(v)),            // formatted + escaped, for narration
        push(line, msg, o) {
          o = o || {};
          const vars = {};
          for (const k of Object.keys(T.vars)) if (T.vars[k] !== undefined) vars[k] = fmt(T.vars[k]);
          steps.push({ line, msg, vars, strips: o.strips || (T.view ? T.view() : []), chk: o.chk || null, inner: !!o.in });
        },
        ret(line, msg, value, o) {
          T.vars.returns = value;
          T.push(line, msg, o);
          steps[steps.length - 1].ret = value;
        }
      };
      for (let k = 0; k < cfg.inputs.length; k++) {
        const inp = cfg.inputs[k];
        if (inp.kind === "int" && !Number.isInteger(vals[k])) return [{ line: 0, msg: `<code>${esc(inp.id)}</code> must be a whole number.`, vars: {}, strips: [], err: true }];
      }
      const bad = cfg.validate && cfg.validate(vals);
      if (bad) return [{ line: 0, msg: bad, vars: {}, strips: [], err: true }];
      cfg.trace(vals, T);
      return steps;
    }

    // ---------- Rendering ----------
    let trace = [], pos = 0, timer = null, vals = [], blocks = [];

    function stripKey(s) {
      return s.label + "\u0000" + s.text + "\u0000" + ncols(s) + "\u0000" + (Object.keys(s.g).length > 0) + "\u0000" + s.off;
    }
    function ncols(s) {
      let n = s.text.length;
      for (const m of [s.t, s.b, s.g, s.c]) for (const k of Object.keys(m)) n = Math.max(n, +k + 1);
      return n;
    }
    function buildBlock(s) {
      const el = document.createElement("div");
      const n = ncols(s);
      const hasBadges = Object.keys(s.g).length > 0;
      el.innerHTML = `<div class="strip-label"><span></span><span class="tags"></span></div>` +
        `<div class="strip-wrap"><div class="strip${hasBadges ? " badges" : ""}"></div></div>`;
      el.querySelector(".strip-label span").textContent = s.label;
      const strip = el.querySelector(".strip");
      const cols = [];
      if (n === 0) {
        strip.innerHTML = `<div class="col"><div class="ptr"></div><div class="cell empty">empty string</div><div class="ptr"></div></div>`;
      }
      for (let k = 0; k < s.off; k++) {
        const pad = document.createElement("div");
        pad.className = "col"; pad.style.visibility = "hidden";
        pad.innerHTML = `<div class="ptr"></div><div class="cell"></div><div class="ptr"></div>`;
        strip.appendChild(pad);
      }
      for (let k = 0; k < n; k++) {
        const col = document.createElement("div");
        col.className = "col";
        const ch = s.text[k];
        col.innerHTML = `<div class="ptr"></div><div class="cell"><span class="idx">${k}</span></div><div class="ptr"></div>` +
          (hasBadges ? `<div class="badge"></div>` : "");
        if (ch !== undefined) col.children[1].append(ch === " " ? "␣" : ch);
        strip.appendChild(col);
        cols.push({ top: col.children[0], cell: col.children[1], bot: col.children[2], badge: col.children[3], ghost: ch === undefined, space: ch === " " });
      }
      return { key: stripKey(s), el, cols, tags: el.querySelector(".tags") };
    }
    function paintBlock(b, s) {
      b.tags.innerHTML = s.tags.map(t => `<span class="tag ${t.color}">${t.text}</span>`).join("");
      b.cols.forEach((c, k) => {
        c.cell.className = "cell" + (c.ghost ? " ghost" : "") + (c.space ? " space" : "") + (s.c[k] ? " " + s.c[k] : "");
        const t = s.t[k], bt = s.b[k], g = s.g[k];
        // Anchor the arrow over the box so a long label hangs off to one side.
        c.top.className = "ptr" + (t ? " " + t.color + (/.\s?▼$/.test(t.text) ? " r" : "") : "");
        c.top.textContent = t ? t.text : "";
        c.bot.className = "ptr" + (bt ? " " + bt.color + (/^▲\s?./.test(bt.text) ? " l" : "") : "");
        c.bot.textContent = bt ? bt.text : "";
        if (c.badge) { c.badge.className = "badge" + (g ? " " + g.kind : ""); c.badge.textContent = g ? g.text : ""; }
      });
    }
    // Scroll a long strip sideways so the boxes being worked on stay in view.
    function follow(b) {
      const wrap = b.el.querySelector(".strip-wrap");
      if (wrap.scrollWidth <= wrap.clientWidth) return;
      const busy = b.cols.filter(c => / (outer|inner|win2?|new)\b/.test(c.cell.className) || c.top.textContent);
      if (!busy.length) return;
      const first = busy[0].cell.parentNode, last = busy[busy.length - 1].cell.parentNode;
      const left = first.offsetLeft, right = last.offsetLeft + last.offsetWidth;   // .strip-wrap is the offsetParent
      if (left < wrap.scrollLeft) wrap.scrollLeft = left - 8;
      else if (right > wrap.scrollLeft + wrap.clientWidth) wrap.scrollLeft = right - wrap.clientWidth + 8;
    }
    function renderStrips(list) {
      const host = $("strips");
      if (blocks.length !== list.length) { host.innerHTML = ""; blocks = []; }
      list.forEach((s, k) => {
        if (!blocks[k] || blocks[k].key !== stripKey(s)) {
          const nb = buildBlock(s);
          if (blocks[k]) host.replaceChild(nb.el, blocks[k].el); else host.appendChild(nb.el);
          blocks[k] = nb;
        }
        paintBlock(blocks[k], s);
        follow(blocks[k]);
      });
    }

    function render() {
      const st = trace[pos], prev = trace[pos - 1];
      const last = pos === trace.length - 1;

      lineEls.forEach((el, n) => { el.classList.toggle("active", !st.err && n === st.line); el.classList.toggle("in", st.inner); });
      renderStrips(st.strips);

      const narr = $("narr");
      narr.innerHTML = st.msg;
      narr.className = "narr" + (st.inner ? " in" : "") + (st.err ? " err" : "");

      const vt = $("vars");
      vt.innerHTML = "";
      for (const k of Object.keys(st.vars)) {
        const tr = document.createElement("tr");
        const a = document.createElement("td"), b = document.createElement("td");
        a.textContent = k; b.textContent = st.vars[k];
        if (prev && prev.vars[k] !== st.vars[k]) b.className = "changed";
        tr.append(a, b); vt.appendChild(tr);
      }

      const ct = $("chk");
      if (ct) { ct.innerHTML = ""; $("fChk").classList.toggle("idle", !st.chk); }
      for (const [expr, val, ok] of (ct && st.chk) || []) {
        const row = document.createElement("div");
        row.className = "ck";
        row.innerHTML = `<span class="e">${expr}</span><span class="v${ok === true ? " ok" : ok === false ? " no" : ""}"></span>`;
        row.lastChild.textContent = val;
        ct.appendChild(row);
      }

      const res = $("result");
      if (last && "ret" in st) {
        const r = st.ret;
        res.className = "result on " + (typeof r === "boolean" ? String(r) : "val");
        res.textContent = `${cfg.name}(${argList(vals)}) returns ${fmt(r)}`;
      } else res.className = "result";

      $("bar").style.width = (trace.length > 1 ? pos / (trace.length - 1) * 100 : 100) + "%";
      $("stepcount").textContent = `step ${pos + 1} of ${trace.length}`;
      $("back").disabled = pos === 0;
      $("step").disabled = last;
      if (last) stop();
    }

    function delay() { return 1700 / Math.pow(1.45, +$("speed").value - 1); }
    function stop() { clearTimeout(timer); timer = null; $("play").textContent = "▶ Play"; }
    function tick() {
      if (pos < trace.length - 1) { pos++; render(); }
      if (pos < trace.length - 1) timer = setTimeout(tick, delay()); else stop();
    }
    function play() {
      if (timer) return stop();
      if (pos >= trace.length - 1) { pos = 0; render(); }
      $("play").textContent = "❚❚ Pause";
      timer = setTimeout(tick, delay());
    }

    function load() {
      stop();
      vals = readInputs();
      trace = record(vals);
      pos = 0;
      render();
    }

    $("reset").onclick = load;
    cfg.inputs.forEach(inp => $("in_" + inp.id).addEventListener("keydown", e => { if (e.key === "Enter") load(); }));
    cfg.inputs.forEach(inp => { if (inp.kind === "bool") $("in_" + inp.id).addEventListener("change", load); });
    $("preset").onchange = e => {
      if (e.target.value === "") return;
      const p = cfg.presets[+e.target.value];
      cfg.inputs.forEach((inp, k) => { $("in_" + inp.id).value = String(p[k]); });
      e.target.value = "";
      load();
    };
    $("play").onclick = play;
    $("step").onclick = () => { stop(); if (pos < trace.length - 1) { pos++; render(); } };
    $("back").onclick = () => { stop(); if (pos > 0) { pos--; render(); } };
    document.addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT" && e.target.type !== "range" && e.target.type !== "checkbox") return;
      if (e.key === "ArrowRight") $("step").click();
      else if (e.key === "ArrowLeft") $("back").click();
      else if (e.key === " ") { e.preventDefault(); play(); }
    });

    load();
    // A link like page.html#12 opens at step 12.
    const m = /^#(\d+)$/.exec(location.hash);
    if (m) { pos = Math.min(+m[1] - 1, trace.length - 1); render(); }
  };
})();
