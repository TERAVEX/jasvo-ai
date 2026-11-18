/*
 * JASVO AI chat UI.
 *
 * The existing interface is preserved. Authentication, chat persistence and
 * AI replies are handled by the dedicated Supabase backend.
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
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 0 0 0-6l1.4-1.1-1.4-2.4-1.7.6a8 8 0 0 0-5.7-1.6L11.7 2h-2.8l-.3 2.5a8 8 0 0 0-2.5 1.5l-2.3-.7-1.4 2.4 1.8 1.7a8 8 0 0 0 0 5l-1.8 1.7 1.4 2.4 2.3-.7a8 8 0 0 0 2.5 1.5l.3 2.5h2.8l.3-2.5a8 8 0 0 0 2.5-1.5l2.3.7 1.4-2.4Z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
    audio: '<path d="M2 10v4M6 6v12M10 3v18M14 7v10M18 5v14M22 10v4"/>',
    sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14Z"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    life: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
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
  var state = { chats: [], activeId: null, mode: "chat", theme: null, usage: { day: "", count: 0 }, preferredName: "" };
  var deferredInstallPrompt = null;
  var pendingFiles = [];
  var thinkMode = false;
  var speechRecognition = null;
  var voiceMode = false;
  var voiceProcessing = false;
  var live = null; // { timer, chatId, msg, body }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.chats)) {
          state = Object.assign(state, s);
          state.chats.forEach(function (c) {
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.id)) c.id = uid();
          });
        }
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
  function uid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }
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

  /* ---------- Supabase backend ---------- */
  var backendClient = null;
  var authUserId = null;
  var currentAuthUser = null;
  var authMode = "signin";
  var backendReady = (function () {
    if (!window.supabase || !window.JASVO_SUPABASE_CONFIG) return Promise.reject(new Error("JASVO backend client could not load."));
    backendClient = window.supabase.createClient(
      window.JASVO_SUPABASE_CONFIG.url,
      window.JASVO_SUPABASE_CONFIG.publishableKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    return backendClient.auth.getSession().then(function (result) {
      if (result.error) throw result.error;
      if (result.data.session) {
        authUserId = result.data.session.user.id;
        currentAuthUser = result.data.session.user;
        return result.data.session;
      }
      return backendClient.auth.signInAnonymously().then(function (signedIn) {
        if (signedIn.error) throw signedIn.error;
        authUserId = signedIn.data.session.user.id;
        currentAuthUser = signedIn.data.session.user;
        return signedIn.data.session;
      });
    });
  })();

  function syncRemoteChats() {
    return backendReady.then(function () {
      return Promise.all([
        backendClient.from("chat_sessions").select("id,title,mode,updated_at").order("updated_at", { ascending: false }).limit(50),
        backendClient.rpc("get_daily_usage")
      ]);
    }).then(function (results) {
      var sessions = results[0].data || [];
      var usage = results[1].data;
      if (typeof usage === "number") state.usage = { day: eatDay(), count: usage };
      return Promise.all(sessions.map(function (session) {
        return backendClient.from("chat_messages").select("role,content,created_at")
          .eq("session_id", session.id).order("created_at", { ascending: true }).limit(100)
          .then(function (result) {
            if (result.error) throw result.error;
            var chat = {
              id: session.id, title: session.title, mode: session.mode,
              ts: new Date(session.updated_at).getTime(),
              messages: (result.data || []).map(function (m) {
                return { role: m.role === "assistant" ? "bot" : "user", text: m.content, files: [] };
              })
            };
            var existing = state.chats.findIndex(function (c) { return c.id === chat.id; });
            if (existing >= 0) state.chats[existing] = chat;
            else state.chats.push(chat);
          });
      }));
    }).then(function () {
      state.chats.sort(function (a, b) { return b.ts - a.ts; });
      if (!state.activeId && state.chats.length) state.activeId = state.chats[0].id;
      save(); renderAll();
    });
  }

  function requestReply(text, mode, chat, attachments, deepThink, cb) {
    backendReady.then(function () {
      return backendClient.functions.invoke("jasvo-chat", {
        body: { prompt: text, mode: mode, chat_id: chat.id, title: chat.title, attachments: attachments || [], think: !!deepThink }
      });
    }).then(function (result) {
      if (result.data && result.data.error) throw new Error(result.data.error);
      if (result.error) throw result.error;
      if (!result.data || typeof result.data.reply !== "string") throw new Error("The backend returned an invalid response.");
      cb(result.data.reply, null, result.data.remaining);
    }).catch(function (error) {
      cb(null, error && error.message ? error.message : "Unknown backend error");
    });
  }


  /* ---------- account and email authentication ---------- */
  function renderAccount() {
    var permanent = currentAuthUser && !currentAuthUser.is_anonymous;
    var metadataName = permanent && currentAuthUser.user_metadata &&
      (currentAuthUser.user_metadata.preferred_name || currentAuthUser.user_metadata.full_name);
    var preferred = (metadataName || state.preferredName || "").trim();
    var email = permanent ? (currentAuthUser.email || "") : "";
    var display = preferred || (email ? email.split("@")[0] : "Guest");
    $("profileName").textContent = display;
    $("profileEmail").textContent = email || "Sign in to sync chats";
    $("profileAvatar").textContent = display.charAt(0).toUpperCase() || "G";
    $("preferredName").value = preferred;
    $("accountBtn").textContent = permanent ? display : "Sign in";
    var recovery = authMode === "reset";
    $("authSignedIn").hidden = !permanent || recovery;
    $("authForm").hidden = !!permanent && !recovery;
    $("authTabs").hidden = !!permanent || recovery;
    if (permanent) $("authSignedInAs").textContent = "Signed in as " + (currentAuthUser.email || "your account");
    renderAuthMode();
    $("accountMenuName").textContent = display;
    $("accountMenuEmail").textContent = email || "Guest account";
    $("accountMenuAvatar").textContent = display.charAt(0).toUpperCase() || "G";
    $("accountMenuPlan").textContent = permanent ? "Free" : "Guest";
    $("menuLogout").querySelector("span:last-child").textContent = permanent ? "Log out" : "Sign in";
  }

  function toggleAccountMenu(force) {
    var menu = $("accountMenu");
    var open = typeof force === "boolean" ? force : menu.hidden;
    menu.hidden = !open;
    $("profileButton").setAttribute("aria-expanded", open ? "true" : "false");
  }

  function openSettings() {
    toggleAccountMenu(false);
    $("settingsOverlay").hidden = false;
    $("preferredName").focus();
    closeMenu();
  }

  function showSimpleOverlay(id) {
    toggleAccountMenu(false);
    $(id).hidden = false;
  }

  function renderAuthMode() {
    var permanent = currentAuthUser && !currentAuthUser.is_anonymous;
    if (authMode === "reset") {
      $("authPasswordWrap").hidden = false;
      $("authPassword").required = true;
      $("authSubmit").textContent = "Save new password";
      $("authForgot").hidden = true;
      $("authHint").textContent = "Choose a new password with at least 8 characters.";
      return;
    }
    var tabs = document.querySelectorAll("[data-auth-mode]");
    Array.prototype.forEach.call(tabs, function (tab) {
      var active = tab.getAttribute("data-auth-mode") === authMode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", active ? "true" : "false");
    });
    $("authPasswordWrap").hidden = false;
    $("authPassword").required = true;
    $("authSubmit").textContent = authMode === "signup" ? "Create account" : "Sign in";
    $("authForgot").hidden = authMode !== "signin";
    $("authHint").textContent = authMode === "signup"
      ? "Create your JASVO account with your email and a password of at least 8 characters."
      : "Welcome back. Sign in with your email and password.";
  }

  function openAuth(mode) {
    if (mode) authMode = mode;
    $("authStatus").textContent = "";
    if (currentAuthUser && currentAuthUser.email) $("authEmail").value = currentAuthUser.email;
    $("authOverlay").hidden = false;
    renderAccount();
    $("authEmail").focus();
  }

  function closeAuth() {
    $("authOverlay").hidden = true;
  }

  function authRedirectUrl() {
    var configured = window.JASVO_SUPABASE_CONFIG && window.JASVO_SUPABASE_CONFIG.authRedirectUrl;
    return configured || (window.location.origin + window.location.pathname);
  }

  function submitAuth(event) {
    event.preventDefault();
    var email = $("authEmail").value.trim().toLowerCase();
    var password = $("authPassword").value;
    var status = $("authStatus");
    var submit = $("authSubmit");
    if (!email) { status.textContent = "Enter your email address."; return; }
    if (authMode !== "reset" && (!password || password.length < 8)) {
      status.textContent = "Use a password with at least 8 characters.";
      return;
    }
    if (authMode === "reset" && (!password || password.length < 8)) {
      status.textContent = "Choose a password with at least 8 characters.";
      return;
    }
    status.textContent = authMode === "signin" ? "Signing in…" :
      (authMode === "reset" ? "Saving your password…" : "Creating your account…");
    submit.disabled = true;
    backendReady.then(function () {
      if (authMode === "reset") return backendClient.auth.updateUser({ password: password });
      if (authMode === "signin") {
        return backendClient.auth.signInWithPassword({ email: email, password: password });
      }
      return backendClient.auth.signUp({
        email: email,
        password: password,
        options: { emailRedirectTo: authRedirectUrl() }
      });
    }).then(function (result) {
      if (result.error) throw result.error;
      if (authMode === "signup" && result.data && result.data.user && !result.data.session) {
        status.textContent = "Account created. Check your email to verify your address, then sign in.";
      } else if (authMode === "reset") {
        status.textContent = "Your password has been updated.";
        authMode = "signin";
        renderAuthMode();
      } else {
        status.textContent = authMode === "signup" ? "Your account is ready." : "You're signed in.";
        if (result.data && result.data.user) {
          currentAuthUser = result.data.user;
          authUserId = result.data.user.id;
        }
        renderAccount();
        if (currentAuthUser && !currentAuthUser.is_anonymous) {
          setTimeout(function () { closeAuth(); }, 700);
        }
      }
    }).catch(function (error) {
      status.textContent = error.message || "Authentication failed. Please try again.";
    }).finally(function () { submit.disabled = false; });
  }

  function sendPasswordReset() {
    var email = $("authEmail").value.trim().toLowerCase();
    if (!email) {
      $("authStatus").textContent = "Enter your email address first.";
      return;
    }
    $("authStatus").textContent = "Sending password reset email…";
    backendReady.then(function () {
      return backendClient.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl()
      });
    }).then(function (result) {
      if (result.error) throw result.error;
      $("authStatus").textContent = "If an account exists for that email, a password reset link is on its way.";
    }).catch(function (error) {
      $("authStatus").textContent = error.message || "Could not send the reset email.";
    });
  }

  function signOutAccount() {
    $("authStatus").textContent = "Signing out…";
    backendClient.auth.signOut().then(function (result) {
      if (result.error) throw result.error;
      return backendClient.auth.signInAnonymously();
    }).then(function (result) {
      if (result.error) throw result.error;
      closeAuth();
    }).catch(function (error) {
      $("authStatus").textContent = error.message || "Could not sign out.";
    });
  }

  /* ---------- rendering ---------- */
  function renderIcons() {
    $("closeSidebar").innerHTML = icon("x");
    $("collapseSidebar").innerHTML = icon("panel");
    $("imagesIcon").innerHTML = icon("image");
    $("settingsIcon").innerHTML = icon("settings");
    $("installIcon").innerHTML = icon("download");
    $("openSidebar").innerHTML = icon("menu");
    $("newChatIcon").innerHTML = icon("plus");
    $("searchIcon").innerHTML = icon("search");
    $("attachBtn").innerHTML = icon("plus");
    $("micBtn").innerHTML = icon("mic");
    $("voiceBtn").innerHTML = icon("audio");
    $("thinkBtnIcon").innerHTML = icon("sparkles");
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
      return '<span class="file-chip"><span>' + esc(f.name) + '</span><button type="button" data-rmfile="' + i + '" aria-label="Remove ' + esc(f.name) + '">' + icon("x") + "</button></span>";
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
    if (backendClient) backendClient.from("chat_sessions").delete().eq("id", id).then(function () {});
    if (state.activeId === id) { stopStream(); state.activeId = null; }
    save(); renderAll();
  }

  function setMode(id) {
    var c = activeChat();
    if (c) {
      c.mode = id;
      if (backendClient) backendClient.from("chat_sessions").update({ mode: id }).eq("id", c.id).then(function () {});
    } else state.mode = id;
    save(); renderModes();
  }

  function streamInto(chat, msg, attachments) {
    msg.pending = true;
    renderThread();
    var body = els.thread.querySelector(".msg.bot:last-child .md");
    requestReply(chat.messages[chat.messages.length - 2].text, chat.mode, chat, attachments || [], thinkMode, function (full, error, remaining) {
      if (error) {
        live = null; voiceProcessing = false; msg.pending = false;
        msg.text = "I couldn't complete that request: " + error;
        save(); renderAll();
        if (voiceMode) speakReply(msg.text);
        return;
      }
      if (typeof remaining === "number") state.usage = { day: eatDay(), count: DAILY_LIMIT - remaining };
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
          save(); renderAll();
          voiceProcessing = false;
          if (voiceMode) speakReply(full);
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

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("Could not read " + file.name + ".")); };
      reader.readAsDataURL(file);
    });
  }

  function prepareAttachments(files) {
    return Promise.all(files.map(function (item) {
      var file = item.file, type = file.type || "application/octet-stream";
      return fileToDataUrl(file).then(function (dataUrl) {
        var data = dataUrl.split(",")[1] || "";
        if (type.indexOf("image/") === 0 && ["image/jpeg","image/png","image/gif","image/webp"].indexOf(type) >= 0) {
          return { name: file.name, kind: "image", media_type: type, data: data };
        }
        if (type === "application/pdf") return { name: file.name, kind: "document", media_type: type, data: data };
        if (/^(text\/|application\/json)/.test(type) || /\.(txt|md|csv|json)$/i.test(file.name)) {
          var decoded = atob(data), bytes = Uint8Array.from(decoded, function (c) { return c.charCodeAt(0); });
          return { name: file.name, kind: "text", text: new TextDecoder("utf-8").decode(bytes).slice(0, 120000) };
        }
        throw new Error("Unsupported file type: " + file.name + ". Use PDF, JPG, PNG, WEBP, GIF, TXT, MD, CSV or JSON.");
      });
    }));
  }

  function send() {
    if (live) { stopStream(); return; }
    var text = els.input.value.trim();
    if ((!text && !pendingFiles.length) || left() <= 0) return;
    var selectedFiles = pendingFiles.slice();
    var c = activeChat();
    if (!c) {
      c = { id: uid(), title: (text || selectedFiles[0].name).slice(0, 44), mode: state.mode, ts: Date.now(), messages: [] };
      state.chats.push(c);
      state.activeId = c.id;
    }
    c.ts = Date.now();
    c.messages.push({ role: "user", text: text, files: selectedFiles.map(function (f) { return f.name; }) });
    var bot = { role: "bot", text: "", pending: true };
    c.messages.push(bot);
    els.input.value = ""; autosize();
    pendingFiles = [];
    save(); renderSidebar(); renderChips(); renderThread();
    prepareAttachments(selectedFiles).then(function (attachments) {
      streamInto(c, bot, attachments);
    }).catch(function (error) {
      c.messages.pop();
      c.messages.push({ role: "bot", text: "I couldn't read that attachment: " + (error.message || "Unsupported file.") });
      save(); renderAll();
      if (voiceMode) speakReply(c.messages[c.messages.length - 1].text);
    });
  }

  function speechApi() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startListening(dictationOnly) {
    var Speech = speechApi();
    if (!Speech) {
      window.alert("Speech recognition is not available in this browser. Try the latest Chrome or use your device keyboard microphone.");
      if (!dictationOnly) endVoiceSession();
      return;
    }
    if (speechRecognition) { try { speechRecognition.abort(); } catch (e) {} }
    var recognition = new Speech();
    speechRecognition = recognition;
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = function (event) {
      var finalText = "";
      for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (!finalText.trim()) return;
      if (dictationOnly) {
        els.input.value = (els.input.value.trim() ? els.input.value.trim() + " " : "") + finalText.trim();
        autosize(); els.input.focus();
      } else {
        els.input.value = finalText.trim(); autosize();
        voiceProcessing = true;
        $("voiceStatus").textContent = "Thinking…";
        try { recognition.stop(); } catch (e) {}
        send();
      }
    };
    recognition.onerror = function (event) {
      if (event.error !== "no-speech" && event.error !== "aborted") console.warn("JASVO speech recognition:", event.error);
      if (!dictationOnly && voiceMode && event.error !== "aborted") setTimeout(function () { if (voiceMode && !live) startListening(false); }, 700);
    };
    recognition.onend = function () {
      if (speechRecognition === recognition) speechRecognition = null;
      if (!dictationOnly && voiceMode && !live && !voiceProcessing && !window.speechSynthesis.speaking) {
        setTimeout(function () { if (voiceMode && !speechRecognition) startListening(false); }, 350);
      }
    };
    try { recognition.start(); } catch (e) { if (!dictationOnly) endVoiceSession(); }
  }

  function speakReply(text) {
    if (!voiceMode || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || "en-US";
    utterance.rate = 1;
    $("voiceStatus").textContent = "Speaking…";
    utterance.onend = function () { if (voiceMode) { $("voiceStatus").textContent = "Listening…"; startListening(false); } };
    window.speechSynthesis.speak(utterance);
  }

  function endVoiceSession() {
    voiceMode = false;
    voiceProcessing = false;
    if (speechRecognition) { try { speechRecognition.abort(); } catch (e) {} speechRecognition = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    $("voiceBtn").classList.remove("voice-active");
    $("voiceBtn").setAttribute("aria-label", "Start voice conversation");
    $("voiceStatus").textContent = "";
  }

  function toggleVoiceSession() {
    if (voiceMode) { endVoiceSession(); return; }
    if (!speechApi() || !window.speechSynthesis) {
      window.alert("Voice conversation needs a browser with speech recognition and speech synthesis. Try the latest Chrome.");
      return;
    }
    voiceMode = true;
    $("voiceBtn").classList.add("voice-active");
    $("voiceBtn").setAttribute("aria-label", "End voice conversation");
    $("voiceStatus").textContent = "Listening… Tap the blue button to end.";
    startListening(false);
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
    try {
      if (localStorage.getItem("jasvo.sidebarCollapsed") === "1" && window.innerWidth > 820) {
        els.app.classList.add("sidebar-collapsed");
        $("collapseSidebar").setAttribute("aria-label", "Expand sidebar");
      }
    } catch (e) {}

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
      Array.prototype.forEach.call(e.target.files, function (file) {
        var supported = ["image/jpeg","image/png","image/gif","image/webp","application/pdf","text/plain","text/markdown","text/csv","application/json"].indexOf(file.type) >= 0 || /\.(txt|md|csv|json)$/i.test(file.name);
        if (!supported) { window.alert("Unsupported file type. Use PDF, JPG, PNG, WEBP, GIF, TXT, MD, CSV or JSON."); return; }
        var total = pendingFiles.reduce(function (sum, item) { return sum + item.file.size; }, 0);
        if (file.size > 2 * 1024 * 1024 || total + file.size > 4 * 1024 * 1024) { window.alert("Keep each file under 2 MB and the total attachments under 4 MB."); return; }
        if (pendingFiles.length >= 4) { window.alert("Attach up to 4 files per message."); return; }
        pendingFiles.push({ name: file.name, file: file });
      });
      e.target.value = ""; renderChips();
    });
    $("micBtn").addEventListener("click", function () { startListening(true); });
    $("voiceBtn").addEventListener("click", toggleVoiceSession);
    $("thinkBtn").addEventListener("click", function () {
      thinkMode = !thinkMode;
      $("thinkBtn").classList.toggle("think-active", thinkMode);
      $("thinkBtn").setAttribute("aria-pressed", thinkMode ? "true" : "false");
      $("thinkLabel").textContent = thinkMode ? "Think on" : "Think";
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

    $("accountBtn").addEventListener("click", function () { openAuth("signin"); });
    $("profileButton").addEventListener("click", function () { toggleAccountMenu(); });
    $("accountMenuClose").addEventListener("click", function () { toggleAccountMenu(false); });
    $("menuUpgrade").addEventListener("click", function () { showSimpleOverlay("plansOverlay"); });
    $("menuPersonalization").addEventListener("click", openSettings);
    $("menuProfile").addEventListener("click", function () { toggleAccountMenu(false); openAuth("signin"); });
    $("menuSettings").addEventListener("click", openSettings);
    $("menuHelp").addEventListener("click", function () { showSimpleOverlay("helpOverlay"); });
    $("menuLogout").addEventListener("click", function () {
      toggleAccountMenu(false);
      if (currentAuthUser && !currentAuthUser.is_anonymous) signOutAccount();
      else openAuth("signin");
    });
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".profile-area")) toggleAccountMenu(false);
    });
    $("collapseSidebar").addEventListener("click", function () {
      var collapsed = els.app.classList.toggle("sidebar-collapsed");
      try { localStorage.setItem("jasvo.sidebarCollapsed", collapsed ? "1" : "0"); } catch (e) {}
      $("collapseSidebar").setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      $("collapseSidebar").title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    });
    $("settingsShortcut").addEventListener("click", openSettings);
    $("settingsClose").addEventListener("click", function () { $("settingsOverlay").hidden = true; });
    $("settingsOverlay").addEventListener("click", function (e) { if (e.target === $("settingsOverlay")) $("settingsOverlay").hidden = true; });
    $("settingsTheme").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      save(); renderTheme();
    });
    $("profileForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("preferredName").value.trim();
      if (!name) { $("settingsStatus").textContent = "Enter a preferred name."; return; }
      $("settingsStatus").textContent = "Saving…";
      state.preferredName = name;
      save();
      if (currentAuthUser && !currentAuthUser.is_anonymous && backendClient) {
        backendClient.auth.updateUser({ data: { preferred_name: name } }).then(function (result) {
          if (result.error) throw result.error;
          currentAuthUser = result.data.user;
          $("settingsStatus").textContent = "Your preferred name has been saved.";
          renderAccount();
        }).catch(function (error) {
          $("settingsStatus").textContent = error.message || "Could not save your name.";
        });
      } else {
        $("settingsStatus").textContent = "Saved on this device. Sign in to sync your profile across devices.";
        renderAccount();
      }
    });
    $("imagesShortcut").addEventListener("click", function () {
      $("imagesOverlay").hidden = false;
      closeMenu();
    });
    $("imagesClose").addEventListener("click", function () { $("imagesOverlay").hidden = true; });
    $("imagesOverlay").addEventListener("click", function (e) { if (e.target === $("imagesOverlay")) $("imagesOverlay").hidden = true; });
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      $("installApp").hidden = false;
    });
    $("installApp").addEventListener("click", function () {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function () {
        deferredInstallPrompt = null;
        $("installApp").hidden = true;
      });
    });
    window.addEventListener("appinstalled", function () {
      deferredInstallPrompt = null;
      $("installApp").hidden = true;
    });
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
          console.warn("JASVO offline setup:", error);
        });
      });
    }
    $("plansClose").addEventListener("click", function () { $("plansOverlay").hidden = true; });
    $("plansOverlay").addEventListener("click", function (e) { if (e.target === $("plansOverlay")) $("plansOverlay").hidden = true; });
    $("helpClose").addEventListener("click", function () { $("helpOverlay").hidden = true; });
    $("helpOverlay").addEventListener("click", function (e) { if (e.target === $("helpOverlay")) $("helpOverlay").hidden = true; });
    $("authClose").addEventListener("click", closeAuth);
    $("authOverlay").addEventListener("click", function (event) {
      if (event.target === $("authOverlay")) closeAuth();
    });
    $("authTabs").addEventListener("click", function (event) {
      var tab = event.target.closest("[data-auth-mode]");
      if (!tab) return;
      authMode = tab.getAttribute("data-auth-mode");
      $("authStatus").textContent = "";
      renderAuthMode();
    });
    $("authForm").addEventListener("submit", submitAuth);
    $("authForgot").addEventListener("click", sendPasswordReset);
    $("authSignOut").addEventListener("click", signOutAccount);
    if (backendClient && backendClient.auth) {
      backendClient.auth.onAuthStateChange(function (event, session) {
        if (session && session.user) {
          if (event === "PASSWORD_RECOVERY") authMode = "reset";
          if (localStorage.getItem("jasvo.pendingEmailPassword") === "1" &&
              !session.user.is_anonymous && session.user.email_confirmed_at) authMode = "signup";
          if (event === "SIGNED_IN" && authUserId && authUserId !== session.user.id) {
            state.chats = [];
            state.activeId = null;
          }
          authUserId = session.user.id;
          currentAuthUser = session.user;
        } else if (event === "SIGNED_OUT") {
          authUserId = null;
          currentAuthUser = null;
          state.chats = [];
          state.activeId = null;
        }
        renderAccount();
        if (event === "PASSWORD_RECOVERY") openAuth("reset");
        else if (authMode === "signup" && currentAuthUser && !currentAuthUser.is_anonymous &&
                 currentAuthUser.email_confirmed_at && localStorage.getItem("jasvo.pendingEmailPassword") === "1") openAuth("signup");
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          setTimeout(function () {
            syncRemoteChats().catch(function (error) { console.warn("JASVO account sync:", error); });
          }, 0);
        }
      });
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden && voiceMode) endVoiceSession(); });
    renderAll();
    renderAccount();
    backendReady.then(function (session) {
      renderAccount();
      if (localStorage.getItem("jasvo.pendingEmailPassword") === "1" &&
          session.user && !session.user.is_anonymous && session.user.email_confirmed_at) {
        authMode = "signup";
        openAuth("signup");
      }
      return syncRemoteChats();
    }).catch(function (error) {
      console.warn("JASVO backend sign-in/sync:", error);
    });
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
