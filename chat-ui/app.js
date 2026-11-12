/*
 * JASVO AI chat UI (front end only).
 *
 * Nothing here talks to a server. `requestReply()` is the single seam where the
 * real backend call goes later (authenticated request to the JASVO AI gateway).
 * No API keys, memory logic or payments live in this file by design.
 */
(function () {
  "use strict";

  var DAILY_LIMIT = 10;
  var STORE_KEY = "jasvo.ui.v1";

  var MODES = [
    { id: "chat", label: "Chat", hint: "Chat mode", ph: "Message JASVO…" },
    { id: "tutor", label: "Tutor", hint: "Tutor mode", ph: "What do you want to understand?" },
    { id: "study", label: "Study", hint: "Study mode", ph: "Paste notes, or ask for flashcards…" },
    { id: "practice", label: "Practice", hint: "Practice mode", ph: "Ask for exercises or paste your answer…" },
    { id: "exam", label: "Exam", hint: "Exam mode", ph: "Which subject, and how long?" },
  ];

  var SUGGESTIONS = [
    "Explain photosynthesis like I'm in Form 2",
    "Nisaidie kuandika email ya kazi",
    "Quiz me on KCSE Chemistry",
    "Why is my Python loop not working?",
  ];

  var ICONS = {
    plus: '<path d="M5 12h14M12 5v14"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    redo: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  };

  function icon(name) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      ICONS[name] +
      "</svg>"
    );
  }

  /* ---------- state ---------- */
  var state = { chats: [], activeId: null, mode: "chat", theme: null, usage: { day: "", count: 0 } };
  var pendingFiles = [];
  var live = null; // { timer, chatId, msg, body }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.chats)) state = Object.assign(state, s);
      }
    } catch (e) {}
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  /* The daily allowance resets at midnight East Africa Time (UTC+3). */
  function eatDay() {
    return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  }
  function used() {
    return state.usage.day === eatDay() ? state.usage.count : 0;
  }
  function left() {
    return Math.max(0, DAILY_LIMIT - used());
  }
  function consumeCredit() {
    var d = eatDay();
    if (state.usage.day !== d) state.usage = { day: d, count: 0 };
    state.usage.count += 1;
  }

  /* ---------- helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var els = {};
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function activeChat() {
    for (var i = 0; i < state.chats.length; i++) if (state.chats[i].id === state.activeId) return state.chats[i];
    return null;
  }
  function currentMode() {
    var c = activeChat();
    var id = c ? c.mode : state.mode;
    return MODES.filter(function (m) { return m.id === id; })[0] || MODES[0];
  }

  /* Small, safe markdown: fenced code, lists, bold, inline code. Everything is escaped first. */
  function inline(s) {
    return esc(s)
      .split(/(`[^`]+`)/)
      .map(function (part) {
        if (/^`[^`]+`$/.test(part)) return "<code>" + part.slice(1, -1) + "</code>";
        return part
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?![*\w])/g, "$1<em>$2</em>");
      })
      .join("");
  }
  function blocks(text) {
    var out = [], para = [], list = null;
    function flushPara() { if (para.length) { out.push("<p>" + para.join("<br>") + "</p>"); para = []; } }
    function flushList() { if (list) { out.push("<" + list.tag + ">" + list.items.join("") + "</" + list.tag + ">"); list = null; } }
    text.split("\n").forEach(function (line) {
      var ul = /^\s*[-*]\s+(.*)$/.exec(line), ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (ul || ol) {
        flushPara();
        var tag = ul ? "ul" : "ol";
        if (!list || list.tag !== tag) { flushList(); list = { tag: tag, items: [] }; }
        list.items.push("<li>" + inline((ul || ol)[1]) + "</li>");
      } else if (!line.trim()) {
        flushPara(); flushList();
      } else {
        flushList(); para.push(inline(line));
      }
    });
    flushPara(); flushList();
    return out.join("");
  }
  function md(text) {
    return text
      .split("```")
      .map(function (part, i) {
        if (i % 2 === 0) return blocks(part);
        var nl = part.indexOf("\n");
        var code = nl >= 0 ? part.slice(nl + 1) : part;
        return "<pre><code>" + esc(code.replace(/\n$/, "")) + "</code></pre>";
      })
      .join("");
  }

  /* ---------- mock reply (replace with the real gateway call) ---------- */
  var SW = /\b(habari|sasa|niaje|mambo|poa|nataka|naomba|tafadhali|asante|vipi|msee|kwani|aje|nisaidie|kuandika|shida|sawa|kidogo|nimeshindwa)\b/i;

  function requestReply(text, mode, cb) {
    var sw = SW.test(text);
    var reply;
    if (/code|python|javascript|bug|loop|function/i.test(text)) {
      reply = sw
        ? "Sawa, tuangalie hii pamoja. Tatizo la kawaida ni **index** kuanza kwa 0.\n\n```python\nfor i in range(len(items)):\n    print(i, items[i])\n```\n\nNikionyesha code yako kamili, nitakuambia mstari halisi wenye shida."
        : "Happy to help. A common cause is an off-by-one error, since indexes start at 0.\n\n```python\nfor i in range(len(items)):\n    print(i, items[i])\n```\n\nPaste your full code and I'll point to the exact line.";
    } else if (mode === "tutor") {
      reply = sw
        ? "Tuanze hatua kwa hatua:\n\n1. Kwanza, ni nini unachojua tayari kuhusu mada hii?\n2. Nitaeleza wazo kuu kwa mfano rahisi.\n3. Kisha nitakuuliza swali dogo kuangalia kama umeelewa.\n\nUko Form gani?"
        : "Let's take it step by step:\n\n1. Tell me what you already know about this topic.\n2. I'll explain the core idea with a simple example.\n3. Then I'll ask a quick question to check it landed.\n\nWhat level are you studying at?";
    } else if (mode === "study") {
      reply = "I can turn your notes into:\n\n- a short summary\n- flashcards\n- revision questions\n\nPaste the notes or upload a file, and tell me which one you want first.";
    } else if (mode === "practice") {
      reply = "Let's practise. Tell me the topic and your level, and I'll give you three exercises, one at a time, with feedback on each answer.";
    } else if (mode === "exam") {
      reply = "Exam mode: pick a subject, the number of questions and a time limit (for example, 10 questions in 20 minutes). I'll mark it at the end and show where you lost marks.";
    } else if (sw) {
      reply = "Poa! Niko hapa. Niambie unataka nini hasa, na tutaifanya step by step. Unaweza kuandika kwa Kiswahili, English au Sheng, nitafuata mtindo wako.";
    } else {
      reply = "Hey! I'm here and ready. Tell me what you're working on, and we'll figure it out together. You can switch between English, Kiswahili and Sheng any time.";
    }
    cb(reply);
  }

  /* ---------- rendering ---------- */
  function renderIcons() {
    $("closeSidebar").innerHTML = icon("x");
    $("openSidebar").innerHTML = icon("menu");
    $("newChatIcon").innerHTML = icon("plus");
    $("searchIcon").innerHTML = icon("search");
    $("attachBtn").innerHTML = icon("clip");
  }

  function renderTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    $("themeToggle").innerHTML = icon(state.theme === "dark" ? "sun" : "moon");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", state.theme === "dark" ? "#0a0a0a" : "#fcfcfd");
  }

  function dayLabel(ts) {
    var d = new Date(ts + 3 * 3600 * 1000).toISOString().slice(0, 10);
    var today = eatDay();
    var yest = new Date(Date.now() + 3 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
    return d === today ? "Today" : d === yest ? "Yesterday" : "Earlier";
  }

  function renderSidebar() {
    var q = els.search.value.trim().toLowerCase();
    var chats = state.chats
      .filter(function (c) { return !q || c.title.toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return b.ts - a.ts; });
    var html = "", last = "";
    chats.forEach(function (c) {
      var g = dayLabel(c.ts);
      if (g !== last) { html += '<div class="group-label">' + g + "</div>"; last = g; }
      html +=
        '<div class="chat-row' + (c.id === state.activeId ? " active" : "") + '" data-id="' + c.id + '">' +
        '<button class="chat-title" data-open="' + c.id + '" style="border:0;background:none;text-align:left;padding:0;cursor:pointer">' + esc(c.title) + "</button>" +
        '<button class="chat-del" data-del="' + c.id + '" aria-label="Delete chat">' + icon("trash") + "</button></div>";
    });
    els.chatList.innerHTML = html || '<div class="empty-list">' + (q ? "No chats match." : "Your chats will show up here.") + "</div>";
    var l = left();
    $("planCount").textContent = l + " left today";
    $("meterFill").style.width = (l / DAILY_LIMIT) * 100 + "%";
    $("credits").textContent = l + "/" + DAILY_LIMIT;
    $("limit").hidden = l > 0;
    updateSend();
  }

  function renderModes() {
    var cur = currentMode();
    els.modes.innerHTML = MODES.map(function (m) {
      return '<button type="button" role="tab" class="mode" data-mode="' + m.id + '" aria-selected="' + (m.id === cur.id) + '">' + m.label + "</button>";
    }).join("");
    $("topMode").textContent = cur.hint;
    $("compMode").textContent = cur.label;
    els.input.placeholder = cur.ph;
  }

  function msgHtml(m, idx, isLast) {
    if (m.role === "user") {
      var files = (m.files || []).map(function (f) { return '<span class="file-chip"><span>' + esc(f) + "</span></span>"; }).join("");
      return '<div class="msg user"><div>' +
        '<div class="bubble">' + esc(m.text) + "</div>" +
        (files ? '<div class="chips" style="justify-content:flex-end;margin-top:6px">' + files + "</div>" : "") +
        "</div></div>";
    }
    var body = m.text ? md(m.text) : '<span class="thinking">Thinking…</span>';
    var actions = m.pending ? "" :
      '<div class="actions">' +
      '<button class="icon-btn" data-copy="' + idx + '" aria-label="Copy reply">' + icon("copy") + "</button>" +
      (isLast ? '<button class="icon-btn" data-regen="1" aria-label="Regenerate reply (uses 1 message)">' + icon("redo") + "</button>" : "") +
      "</div>";
    return '<div class="msg bot' + (isLast ? " last" : "") + '" data-idx="' + idx + '">' +
      '<span class="logo" aria-hidden="true">J</span>' +
      '<div class="bot-body"><div class="md">' + body + "</div>" + actions + "</div></div>";
  }

  function renderThread() {
    var c = activeChat();
    var has = c && c.messages.length;
    els.stage.classList.toggle("empty", !has);
    $("topName").textContent = c ? c.title : "New chat";
    if (!has) { els.thread.innerHTML = ""; return; }
    els.thread.innerHTML = '<div class="thread-inner">' +
      c.messages.map(function (m, i) { return msgHtml(m, i, i === c.messages.length - 1); }).join("") + "</div>";
    scrollBottom(true);
  }

  function scrollBottom(force) {
    var t = els.thread;
    if (force || t.scrollHeight - t.scrollTop - t.clientHeight < 140) t.scrollTop = t.scrollHeight;
  }

  function updateSend() {
    var streaming = !!live;
    els.send.innerHTML = icon(streaming ? "stop" : "send");
    els.send.setAttribute("aria-label", streaming ? "Stop generating" : "Send message");
    var hasText = els.input.value.trim().length > 0 || pendingFiles.length > 0;
    els.send.disabled = streaming ? false : !hasText || left() <= 0;
  }

  function renderChips() {
    els.chips.innerHTML = pendingFiles.map(function (f, i) {
      return '<span class="file-chip"><span>' + esc(f) + '</span><button type="button" data-rmfile="' + i + '" aria-label="Remove ' + esc(f) + '">' + icon("x") + "</button></span>";
    }).join("");
    updateSend();
  }

  function renderAll() {
    renderSidebar(); renderModes(); renderThread(); renderChips();
  }

  /* ---------- actions ---------- */
  function newChat() {
    stopStream();
    state.activeId = null;
    save(); renderAll();
    els.input.focus();
  }

  function openChat(id) {
    stopStream();
    state.activeId = id;
    save(); renderAll(); closeMenu();
  }

  function deleteChat(id) {
    if (!window.confirm("Delete this chat? Anything JASVO saved as a memory stays until you remove it in Memory settings.")) return;
    state.chats = state.chats.filter(function (c) { return c.id !== id; });
    if (state.activeId === id) { stopStream(); state.activeId = null; }
    save(); renderAll();
  }

  function setMode(id) {
    var c = activeChat();
    if (c) c.mode = id; else state.mode = id;
    save(); renderModes();
  }

  function streamInto(chat, msg) {
    msg.pending = true;
    renderThread();
    var body = els.thread.querySelector(".msg.bot:last-child .md");
    requestReply(chat.messages[chat.messages.length - 2].text, chat.mode, function (full) {
      var i = 0;
      var timer = setInterval(function () {
        i = Math.min(full.length, i + 3);
        msg.text = full.slice(0, i);
        if (body) body.innerHTML = md(msg.text);
        scrollBottom(false);
        if (i >= full.length) {
          clearInterval(timer);
          live = null;
          msg.pending = false;
          consumeCredit(); // only a completed reply counts toward the daily allowance
          save(); renderAll();
        }
      }, 22);
      live = { timer: timer, chat: chat, msg: msg };
      updateSend();
    });
  }

  function stopStream() {
    if (!live) return;
    clearInterval(live.timer);
    live.msg.pending = false;
    if (!live.msg.text) live.chat.messages.pop(); // nothing was produced: drop the empty reply
    live = null;
    save(); renderAll();
  }

  function send() {
    if (live) { stopStream(); return; }
    var text = els.input.value.trim();
    if ((!text && !pendingFiles.length) || left() <= 0) return;
    var c = activeChat();
    if (!c) {
      c = { id: uid(), title: (text || pendingFiles[0]).slice(0, 44), mode: state.mode, ts: Date.now(), messages: [] };
      state.chats.push(c);
      state.activeId = c.id;
    }
    c.ts = Date.now();
    c.messages.push({ role: "user", text: text, files: pendingFiles.slice() });
    var bot = { role: "bot", text: "", pending: true };
    c.messages.push(bot);
    els.input.value = ""; autosize();
    pendingFiles = [];
    save(); renderSidebar(); renderChips();
    streamInto(c, bot);
  }

  function regenerate() {
    var c = activeChat();
    if (!c || live || left() <= 0) return; // regenerating costs a credit, same as a new message
    if (!c.messages.length || c.messages[c.messages.length - 1].role !== "bot") return;
    c.messages.pop();
    var bot = { role: "bot", text: "", pending: true };
    c.messages.push(bot);
    streamInto(c, bot);
  }

  function autosize() {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 200) + "px";
    updateSend();
  }

  function openMenu() { els.app.classList.add("menu-open"); $("scrim").hidden = false; }
  function closeMenu() { els.app.classList.remove("menu-open"); $("scrim").hidden = true; }

  /* ---------- wiring ---------- */
  function init() {
    els.app = $("app"); els.stage = $("stage"); els.thread = $("thread"); els.input = $("input");
    els.send = $("send"); els.modes = $("modes"); els.chips = $("chips"); els.search = $("search");
    els.chatList = $("chatList");

    load();
    if (!state.theme) {
      state.theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    var forced = /[?&]theme=(dark|light)/.exec(location.search);
    if (forced) state.theme = forced[1]; // preview helper, e.g. index.html?theme=dark
    if (/[?&]demo=1/.test(location.search) && !state.chats.length) seedDemo();

    renderIcons(); renderTheme();

    $("suggestions").innerHTML = SUGGESTIONS.map(function (s) { return '<button type="button" class="chip-btn">' + esc(s) + "</button>"; }).join("");
    $("suggestions").addEventListener("click", function (e) {
      var b = e.target.closest(".chip-btn");
      if (!b) return;
      els.input.value = b.textContent; autosize(); els.input.focus();
    });

    els.modes.addEventListener("click", function (e) {
      var b = e.target.closest("[data-mode]");
      if (b) setMode(b.getAttribute("data-mode"));
    });
    els.chatList.addEventListener("click", function (e) {
      var del = e.target.closest("[data-del]");
      if (del) return deleteChat(del.getAttribute("data-del"));
      var open = e.target.closest("[data-open]");
      if (open) openChat(open.getAttribute("data-open"));
    });
    els.thread.addEventListener("click", function (e) {
      var cp = e.target.closest("[data-copy]");
      if (cp) {
        var m = activeChat().messages[+cp.getAttribute("data-copy")];
        var done = function () { cp.innerHTML = icon("check"); setTimeout(function () { cp.innerHTML = icon("copy"); }, 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m.text).then(done, function () {});
        return;
      }
      if (e.target.closest("[data-regen]")) regenerate();
    });
    els.chips.addEventListener("click", function (e) {
      var b = e.target.closest("[data-rmfile]");
      if (b) { pendingFiles.splice(+b.getAttribute("data-rmfile"), 1); renderChips(); }
    });

    $("composer").addEventListener("submit", function (e) { e.preventDefault(); send(); });
    els.input.addEventListener("input", autosize);
    els.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    $("attachBtn").addEventListener("click", function () { $("fileInput").click(); });
    $("fileInput").addEventListener("change", function (e) {
      // UI only: file names are shown as chips; reading and uploading belong to the backend work.
      Array.prototype.forEach.call(e.target.files, function (f) { pendingFiles.push(f.name); });
      e.target.value = ""; renderChips();
    });
    els.search.addEventListener("input", renderSidebar);
    $("newChat").addEventListener("click", function () { newChat(); closeMenu(); });
    $("openSidebar").addEventListener("click", openMenu);
    $("closeSidebar").addEventListener("click", closeMenu);
    $("scrim").addEventListener("click", closeMenu);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    $("themeToggle").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      save(); renderTheme();
    });

    renderAll();
  }

  function seedDemo() {
    var now = Date.now();
    var c = {
      id: uid(), title: "Explain photosynthesis like I'm in Form 2", mode: "tutor", ts: now,
      messages: [
        { role: "user", text: "Explain photosynthesis like I'm in Form 2", files: [] },
        { role: "bot", text: "Think of a leaf as a tiny kitchen.\n\n- **Ingredients:** water from the roots, carbon dioxide from the air, and sunlight\n- **Cook:** chlorophyll catches the light and powers the reaction\n- **Food made:** glucose, plus oxygen released into the air\n\nThe short version:\n\n```\n6CO2 + 6H2O + light -> C6H12O6 + 6O2\n```\n\nQuick check: which two things does the plant take *in*? Try it, then I'll give you the next step." },
        { role: "user", text: "Sasa nimeelewa, nipe swali la mazoezi", files: [] },
        { role: "bot", text: "Poa! Swali la kwanza: kwa nini majani mengi ni ya kijani? Jibu kwa sentensi moja." },
      ],
    };
    state.chats = [
      c,
      { id: uid(), title: "Nisaidie kuandika email ya kazi", mode: "chat", ts: now - 86400000, messages: [] },
      { id: uid(), title: "KCSE Chemistry quiz: mole concept", mode: "exam", ts: now - 3 * 86400000, messages: [] },
    ];
    state.activeId = c.id;
    state.usage = { day: eatDay(), count: 3 };
  }

  init();
})();
