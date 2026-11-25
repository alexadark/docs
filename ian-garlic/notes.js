// Notes component shared by the Garlic Press prototype and the assistant page.
// Notes live in this browser's localStorage, one key per field, until the reader sends them.
// Nothing is posted anywhere: "Send" only opens an email in the reader's own mail app.
window.IanNotes = (() => {
  const TO = ["alex", "cutzai.com"].join("@");
  const MAX_URL = 1900; // Longer mailto links get cut by some mail apps.
  const CSS = `
.nt{display:flex;flex-direction:column;gap:6px;max-width:760px}
.nt label{font-size:14px;font-weight:600;line-height:1.4}
.nt textarea{display:block;width:100%;min-height:76px;resize:vertical;font:inherit;font-size:16px;line-height:1.55;color:var(--fg);background:var(--surface,var(--card));border:1px solid var(--line-2,var(--line));border-radius:var(--nt-r,0);padding:10px 12px}
.nt textarea::placeholder{color:var(--muted,var(--fg-2));opacity:1}
.nt .nt-ok{font-size:13px;color:var(--live,var(--green));min-height:1.3em}
.nt .nt-ok.bad,.nt-bar .bad{color:var(--stop,var(--red))}
.nt-box{border:1px solid var(--accent);border-radius:var(--nt-r,0);padding:18px;display:flex;flex-direction:column;gap:14px;max-width:760px}
.nt-box h2{margin:0;font-size:1.2rem}.nt-box p{margin:0;max-width:68ch;font-size:15px}
.nt-acts{display:flex;flex-wrap:wrap;gap:8px}
.nt-b{font:inherit;font-size:14px;font-weight:500;min-height:44px;padding:8px 14px;cursor:pointer;color:var(--fg);background:transparent;border:1px solid var(--line-2,var(--line));border-radius:var(--nt-r,0)}
.nt-b:hover{border-color:var(--accent)}.nt-b.go{background:var(--accent);border-color:var(--accent);color:var(--on-accent);font-weight:600}
.nt-msg{border-left:3px solid var(--accent);padding-left:12px}
.nt-out{width:100%;min-height:160px;font:13px/1.5 ui-monospace,Menlo,monospace;color:var(--fg);background:var(--bg);border:1px solid var(--line-2,var(--line));padding:10px}
.nt-bar{position:fixed;left:0;right:0;bottom:0;z-index:6;display:flex;gap:8px 12px;align-items:center;padding:8px 16px;background:var(--bg);border-top:1px solid var(--line-2,var(--line));font-size:14px}
.nt-bar .st{flex:1;min-width:0;line-height:1.35}.nt-bar .st b{font-weight:600}.nt-bar .st span{color:var(--muted,var(--fg-2))}
@media(max-width:560px){.nt-bar{flex-wrap:wrap;padding:8px 12px}.nt-bar .st{flex-basis:100%;font-size:13px}.nt-bar .nt-b{flex:1;padding:8px}.nt-box{padding:14px}.nt-acts .nt-b{flex:1 1 100%}}
@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
html{scroll-padding-bottom:110px}`;
  let cfg, pre, mem = {}, broken = false, savedAt = null, bar, msg;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const btn = (text, on, go) => { const b = el("button", "nt-b" + (go ? " go" : ""), text); b.type = "button"; b.addEventListener("click", on); return b; };
  const clock = d => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  function load() {
    try {
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(pre)) mem[k.slice(pre.length)] = localStorage.getItem(k); }
    } catch (_) { broken = true; }
  }
  function save(id, value) {
    if ((mem[id] || "") === value && !broken) return;
    if (value) mem[id] = value; else delete mem[id];
    try { if (value) localStorage.setItem(pre + id, value); else localStorage.removeItem(pre + id); broken = false; savedAt = new Date(); }
    catch (_) { broken = true; }
    status();
  }
  const has = id => !!(mem[id] || "").trim();
  const all = () => cfg.groups.flatMap(g => g.fields);
  const find = id => all().find(f => f.id === id);
  const written = () => Object.keys(mem).filter(has).length;
  const answered = () => (cfg.questions || []).filter(has).length;

  function status() {
    const n = written();
    const st = bar.querySelector(".st"), b = el("b"), s = el("span");
    b.textContent = n ? n + (n === 1 ? " note" : " notes") : "No notes yet";
    if (cfg.questions) b.textContent = answered() + " of " + cfg.questions.length + " answered" + (n - answered() > 0 ? ", " + (n - answered()) + (n - answered() === 1 ? " note" : " notes") : "");
    if (broken) { s.className = "bad"; s.textContent = " Not saved: this browser blocks storage. Copy or download before you leave."; }
    else s.textContent = n ? (savedAt ? " Saved in this browser at " + clock(savedAt) : " Saved in this browser") + ", not sent" : " They stay in this browser until you send them";
    st.replaceChildren(b, s);
    document.querySelectorAll("[data-nt-progress]").forEach(x => x.textContent = answered() + " of " + cfg.questions.length + " answered");
    if (cfg.jump) bar.querySelector("[data-nt-jump]").textContent = cfg.jump.label();
    document.querySelectorAll(".nt textarea").forEach(t => mark(t));
  }
  function mark(t) {
    const o = t.parentNode.querySelector(".nt-ok");
    o.className = "nt-ok" + (broken && t.value ? " bad" : "");
    o.textContent = !t.value.trim() ? "" : broken ? "Not saved in this browser" : "Saved in this browser";
  }
  const grow = t => { if (t.scrollHeight > t.clientHeight + 2) t.style.height = Math.min(t.scrollHeight + 4, 620) + "px"; };

  function field(id) {
    const f = find(id), w = el("div", "nt"), l = el("label", "", f.prompt || f.label), t = el("textarea");
    t.id = "nt-" + id; l.htmlFor = t.id; t.dataset.nt = id; t.value = mem[id] || "";
    t.placeholder = f.hint || "Type or dictate. It saves as you go.";
    const on = () => { save(id, t.value); mark(t); grow(t); };
    t.addEventListener("input", on); t.addEventListener("change", on);
    const ok = el("div", "nt-ok"); ok.setAttribute("aria-hidden", "true");
    w.append(l, t, ok); mark(t);
    requestAnimationFrame(() => grow(t));
    return w;
  }

  function text() {
    const out = [cfg.title + ": notes from Ian", new Date().toLocaleString(), ""];
    if (cfg.questions) out.push(answered() + " of " + cfg.questions.length + " questions answered", "");
    const seen = new Set();
    for (const g of cfg.groups) {
      const fs = g.fields.filter(f => { seen.add(f.id); return has(f.id); });
      if (!fs.length) continue;
      out.push("== " + g.name + " ==", "");
      for (const f of fs) { out.push("[" + f.label + "]"); if (f.text) out.push(f.text); out.push((f.text ? "Answer: " : "") + mem[f.id].trim(), ""); }
    }
    const rest = Object.keys(mem).filter(id => !seen.has(id) && has(id));
    if (rest.length) { out.push("== Other notes ==", ""); rest.forEach(id => out.push("[" + id + "]", mem[id].trim(), "")); }
    return out.join("\n");
  }
  async function copy(x) {
    try { await navigator.clipboard.writeText(x); return true; } catch (_) {}
    const t = el("textarea"); t.value = x; t.style.cssText = "position:fixed;opacity:0"; document.body.append(t); t.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (_) {}
    t.remove(); return ok;
  }
  function tell(x, withText) {
    msg.replaceChildren(el("p", "", x));
    if (withText) { const t = el("textarea", "nt-out"); t.readOnly = true; t.value = text(); t.setAttribute("aria-label", "All your notes"); msg.append(t); t.addEventListener("focus", () => t.select()); }
    msg.hidden = false; msg.scrollIntoView({ block: "center" });
  }
  const empty = () => { if (written()) return false; tell("There's nothing to send yet. Write a note first."); return true; };
  function mail(body) {
    const a = el("a"); a.href = "mailto:" + TO + "?subject=" + encodeURIComponent(cfg.title + ": my notes") + "&body=" + encodeURIComponent(body.replace(/\n/g, "\r\n"));
    const len = a.href.length; return { a, len };
  }
  async function send() {
    if (empty()) return;
    const m = mail(text());
    if (m.len <= MAX_URL) { m.a.click(); return tell("An email to Alex with your notes is opening in your mail app. Press Send there: nothing leaves this page before that. If no email opened, use Copy all and paste it into an email to " + TO + "."); }
    const ok = await copy(text());
    mail("Paste your notes here.\n\n").a.click();
    tell(ok ? "Your notes are too long for a prefilled email, so they've been copied. Paste them into the email that just opened, then press Send. If no email opened, write to " + TO + "."
      : "Your notes are too long for a prefilled email, and this browser blocked copying. Use Download and attach the file, or copy the text below into the email to " + TO + ".", !ok);
  }
  async function copyAll() { if (empty()) return; const ok = await copy(text()); tell(ok ? "All your notes are copied. Paste them into an email to " + TO + "." : "This browser blocked copying. Select the text below and copy it.", !ok); }
  function download() {
    if (empty()) return;
    const a = el("a"), u = URL.createObjectURL(new Blob([text()], { type: "text/plain;charset=utf-8" })), d = new Date();
    a.href = u; a.download = cfg.page + "-notes-" + [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-") + ".txt";
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    tell("Your notes are downloading as a text file. Attach it to an email to " + TO + ".");
  }

  // The closing box: general note, then the ways to send.
  function box() {
    const b = el("section", "nt-box"); b.id = "nt-box"; b.setAttribute("aria-label", "Your notes");
    const acts = el("div", "nt-acts"); acts.append(btn("Send my notes to Alex", send, true), btn("Copy all", copyAll), btn("Download", download));
    msg = el("div", "nt-msg"); msg.hidden = true; msg.setAttribute("role", "status");
    b.append(el("h2", "", "Your notes"), field("general"), acts, msg,
      el("p", "", "Your notes stay in this browser until you send them. Nobody else sees them, and another phone or computer starts empty. Sending opens an email to Alex in your own mail app, and you press Send."),
      el("p", "", "Long notes don't fit in a prefilled email: they get copied for you to paste, or use Copy all or Download. Send when you finish a session: a private window forgets them when it closes, and Safari can erase them after a week without a visit."));
    return b;
  }
  function init(c) {
    cfg = c; pre = "ian-notes:" + c.page + ":"; load();
    document.head.append(Object.assign(el("style"), { textContent: CSS }));
    bar = el("div", "nt-bar"); bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Notes status");
    bar.append(el("div", "st"));
    if (c.jump) { const j = btn(c.jump.label(), c.jump.go); j.dataset.ntJump = ""; bar.append(j); }
    bar.append(btn("Send to Alex", send, true));
    document.body.append(bar); document.body.style.paddingBottom = "130px";
    // A second tab on the same page keeps both in step.
    addEventListener("storage", e => {
      if (!e.key || !e.key.startsWith(pre)) return;
      const id = e.key.slice(pre.length); if (e.newValue) mem[id] = e.newValue; else delete mem[id];
      document.querySelectorAll(`[data-nt="${CSS_esc(id)}"]`).forEach(t => { if (t !== document.activeElement || document.hidden) t.value = mem[id] || ""; });
      status();
    });
    const flush = () => document.querySelectorAll("textarea[data-nt]").forEach(t => save(t.dataset.nt, t.value));
    addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    addEventListener("beforeunload", e => { if (broken && written()) e.preventDefault(); });
    status();
  }
  const CSS_esc = s => window.CSS && window.CSS.escape ? window.CSS.escape(s) : s;
  return { init, field, box, answered, refresh: () => status() };
})();
