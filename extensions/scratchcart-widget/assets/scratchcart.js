/* ScratchCart — mağaza vitrini betiği
 * Bağımlılık yok. Tema ile çakışmaması için her şey tek bir kapanış içinde.
 * Akış: yapılandırmayı çek -> tetikleyiciyi bekle -> bileti göster ->
 *       kazı -> sunucudan kod al -> sepete uygula.
 */
(function () {
  "use strict";

  if (window.__scratchCartBooted) return;
  window.__scratchCartBooted = true;

  var script = document.currentScript;
  var PROXY =
    (script && script.getAttribute("data-proxy")) || "/apps/scratchcart";
  var STORAGE_KEY = "scratchcart.state.v1";
  var THRESHOLD = 0.4; // kaplamanın %40'ı kalkınca ödül açılır
  var state = {
    config: null,
    scratch: null,
    opened: false,
    revealed: false,
    requesting: false,
    sessionId: null,
  };

  /* ---------------------------------------------------------------- yardımcılar */

  function local() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveLocal(patch) {
    try {
      var next = local();
      for (var key in patch) next[key] = patch[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      /* özel sekmede sessizce geç */
    }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "sc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function sessionId() {
    var stored = local();
    if (!stored.sessionId) {
      stored.sessionId = uuid();
      saveLocal({ sessionId: stored.sessionId });
    }
    return stored.sessionId;
  }

  function post(path, body) {
    return fetch(PROXY + path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw Object.assign(new Error("request_failed"), { data: data });
        return data;
      });
    });
  }

  function deviceType() {
    var ua = navigator.userAgent.toLowerCase();
    if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
    if (/mobi|iphone|android/.test(ua)) return "mobile";
    return "desktop";
  }

  function isMobile() {
    return deviceType() !== "desktop";
  }

  function money(cents, format) {
    var value = (cents / 100).toFixed(2);
    return format ? format.replace(/\{\{\s*amount\s*\}\}/, value) : value;
  }

  /* ------------------------------------------------------------------ sepet */

  function getCart() {
    return fetch("/cart.js", { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .catch(function () {
        return null;
      });
  }

  /**
   * İndirimi sepete işler.
   * Shopify'ın `/discount/<kod>` uç noktası oturuma indirim çerezini yazar;
   * müşteri ödemeye geçtiğinde kod kendiliğinden uygulanmış olur.
   * Ayrıca sipariş eşleştirmesi için sepete gizli bir öznitelik eklenir.
   */
  function applyDiscount(code) {
    var applyUrl = "/discount/" + encodeURIComponent(code) + "?redirect=/cart.js";
    return fetch(applyUrl, { credentials: "same-origin", redirect: "follow" })
      .then(function () {
        return fetch("/cart/update.js", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attributes: {
              _scratchcart_code: code,
              _scratchcart_session: sessionId(),
            },
          }),
        });
      })
      .catch(function () {
        /* kod ekranda yazılı; başarısız olursa müşteri elle girebilir */
      });
  }

  /* -------------------------------------------------------------- işaretleme */

  function buildMarkup(config) {
    var t = config.translations;
    var root = document.createElement("div");
    root.className = "sc-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", config.title);
    root.setAttribute("data-open", "false");
    if (config.mobileFullScreen) root.setAttribute("data-fullscreen", "true");

    root.innerHTML =
      '<div class="sc-scrim" data-sc-dismiss></div>' +
      '<div class="sc-ticket" data-state="idle">' +
      '<canvas class="sc-confetti" aria-hidden="true"></canvas>' +
      '<button class="sc-close" type="button" data-sc-dismiss aria-label="' +
      esc(t.close) +
      '">&times;</button>' +
      '<div class="sc-head">' +
      '<span class="sc-eyebrow">' +
      esc(t.eyebrow) +
      "</span>" +
      '<h2 class="sc-title"></h2>' +
      '<p class="sc-subtitle"></p>' +
      "</div>" +
      '<div class="sc-panel" data-scratching="false">' +
      '<div class="sc-prize">' +
      '<span class="sc-prize-value"></span>' +
      '<span class="sc-prize-note">' +
      esc(t.prizeNote) +
      "</span>" +
      "</div>" +
      '<canvas class="sc-foil" aria-label="' +
      esc(t.canvasLabel) +
      '" role="img" tabindex="0"></canvas>' +
      '<span class="sc-hint"></span>' +
      "</div>" +
      '<div class="sc-progress"><div class="sc-progress-bar"></div></div>' +
      '<div class="sc-result">' +
      '<span class="sc-stamp">' +
      esc(t.applied) +
      "</span>" +
      '<div class="sc-code"><span class="sc-code-value"></span>' +
      '<button class="sc-copy" type="button">' +
      esc(t.copy) +
      "</button></div>" +
      '<p class="sc-expiry"></p>' +
      "</div>" +
      '<div class="sc-error"></div>' +
      '<button class="sc-cta" type="button"></button>' +
      '<button class="sc-dismiss" type="button" data-sc-dismiss>' +
      esc(t.noThanks) +
      "</button>" +
      '<div class="sc-foot">' +
      '<span class="sc-serial"></span>' +
      '<span class="sc-terms">' +
      esc(t.terms) +
      "</span>" +
      "</div>" +
      "</div>";

    return root;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function applyTheme(root, config) {
    var s = root.style;
    s.setProperty("--sc-ink", config.colors.background);
    s.setProperty("--sc-foil-a", shade(config.colors.card, -18));
    s.setProperty("--sc-foil-b", shade(config.colors.card, 26));
    s.setProperty("--sc-gold", config.colors.reveal);
    s.setProperty("--sc-stock", config.colors.text);
    if (config.fontFamily && config.fontFamily !== "system") {
      s.setProperty("--sc-display", '"' + config.fontFamily + '", sans-serif');
      s.setProperty("--sc-body", '"' + config.fontFamily + '", sans-serif');
    }
  }

  function shade(hex, amount) {
    var value = hex.replace("#", "");
    if (value.length === 3) {
      value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
    }
    var num = parseInt(value, 16);
    var parts = [num >> 16, (num >> 8) & 255, num & 255].map(function (channel) {
      return Math.max(0, Math.min(255, channel + amount));
    });
    return (
      "#" +
      parts
        .map(function (channel) {
          return ("0" + channel.toString(16)).slice(-2);
        })
        .join("")
    );
  }

  /* ------------------------------------------------------------ folyo katmanı */

  function paintFoil(canvas, config) {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));

    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var w = rect.width;
    var h = rect.height;

    // Metalik taban: çapraz gradyan + iki parlama bandı
    var base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, shade(config.colors.card, -22));
    base.addColorStop(0.32, shade(config.colors.card, 30));
    base.addColorStop(0.5, shade(config.colors.card, -6));
    base.addColorStop(0.72, shade(config.colors.card, 24));
    base.addColorStop(1, shade(config.colors.card, -26));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // Folyo grenini taklit eden ince gürültü
    ctx.globalAlpha = 0.06;
    for (var i = 0; i < Math.round(w * h * 0.05); i++) {
      ctx.fillStyle = i % 2 ? "#ffffff" : "#000000";
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Baskı hatası izlenimi veren hafif tarama çizgileri
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    for (var y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    return ctx;
  }

  /* -------------------------------------------------------------- kazıma motoru */

  function initScratch(elements, config, onComplete) {
    var canvas = elements.foil;
    var panel = elements.panel;
    var ctx = paintFoil(canvas, config);
    var drawing = false;
    var completed = false;
    var started = false;
    var lastPoint = null;
    var checkQueued = false;
    var brush = Math.max(18, Math.min(34, canvas.getBoundingClientRect().width / 9));

    function pointFrom(event) {
      var rect = canvas.getBoundingClientRect();
      var source = event.touches && event.touches[0] ? event.touches[0] : event;
      return {
        x: source.clientX - rect.left,
        y: source.clientY - rect.top,
      };
    }

    function carve(from, to) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brush;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // Kenarları düzgün daire yerine taneli göstermek için serpme
      for (var i = 0; i < 5; i++) {
        var angle = Math.random() * Math.PI * 2;
        var radius = brush * (0.45 + Math.random() * 0.4);
        ctx.beginPath();
        ctx.arc(
          to.x + Math.cos(angle) * radius,
          to.y + Math.sin(angle) * radius,
          brush * (0.1 + Math.random() * 0.18),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function measure() {
      checkQueued = false;
      var w = canvas.width;
      var h = canvas.height;
      if (!w || !h) return;

      var data = ctx.getImageData(0, 0, w, h).data;
      var step = 16; // her 16. pikseli örnekle: 60fps'i korur
      var clear = 0;
      var total = 0;
      for (var i = 3; i < data.length; i += 4 * step) {
        total++;
        if (data[i] < 40) clear++;
      }

      var ratio = total ? clear / total : 0;
      elements.progressBar.style.width = Math.min(100, (ratio / THRESHOLD) * 100) + "%";

      if (ratio >= THRESHOLD && !completed) {
        completed = true;
        onComplete();
      }
    }

    function queueMeasure() {
      if (checkQueued) return;
      checkQueued = true;
      requestAnimationFrame(measure);
    }

    function start(event) {
      if (completed) return;
      drawing = true;
      lastPoint = pointFrom(event);
      if (!started) {
        started = true;
        panel.setAttribute("data-scratching", "true");
        elements.onFirstScratch();
      }
      carve(lastPoint, lastPoint);
      queueMeasure();
    }

    function move(event) {
      if (!drawing || completed) return;
      if (event.cancelable) event.preventDefault();
      var point = pointFrom(event);
      carve(lastPoint || point, point);
      lastPoint = point;
      queueMeasure();
    }

    function end() {
      drawing = false;
      lastPoint = null;
      queueMeasure();
    }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: true });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    // Klavye erişilebilirliği: fareyle kazıyamayanlar için tek tuşla açma
    canvas.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (completed) return;
      if (!started) {
        started = true;
        panel.setAttribute("data-scratching", "true");
        elements.onFirstScratch();
      }
      var rect = canvas.getBoundingClientRect();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.globalCompositeOperation = "source-over";
      completed = true;
      elements.progressBar.style.width = "100%";
      onComplete();
    });

    return {
      clear: function () {
        var rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
      },
    };
  }

  /* ---------------------------------------------------------------- konfeti */

  function runConfetti(canvas, colors) {
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var pieces = [];
    var count = isMobile() ? 50 : 90;
    for (var i = 0; i < count; i++) {
      pieces.push({
        x: rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.5,
        y: rect.height * 0.35,
        vx: (Math.random() - 0.5) * 7,
        vy: -6 - Math.random() * 7,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
      });
    }

    var start = performance.now();
    function frame(now) {
      var elapsed = now - start;
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        p.vy += 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (elapsed < 2600) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, rect.width, rect.height);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------- tetikleyici */

  function armTriggers(config, open) {
    var fired = false;
    var idleTimer = null;

    function fire(reason) {
      if (fired) return;
      fired = true;
      cleanup();
      open(reason);
    }

    function resetIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        fire("inactivity");
      }, config.inactivitySeconds * 1000);
    }

    function onMouseOut(event) {
      if (event.clientY > 10) return;
      if (event.relatedTarget || event.toElement) return;
      fire("exit_intent");
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") return;
      // Sekmeye geri dönüşte, terk etme niyeti göstermiş sayılır.
      fire("exit_intent");
    }

    function onPopState() {
      fire("exit_intent");
    }

    var idleEvents = ["mousemove", "keydown", "scroll", "click", "touchstart"];

    function cleanup() {
      if (idleTimer) clearTimeout(idleTimer);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("popstate", onPopState);
      idleEvents.forEach(function (name) {
        window.removeEventListener(name, resetIdle);
      });
    }

    var wantsExit = config.trigger === "exit_intent" || config.trigger === "both";
    var wantsIdle = config.trigger === "inactivity" || config.trigger === "both";

    if (wantsExit) {
      if (isMobile()) {
        document.addEventListener("visibilitychange", onVisibility);
        try {
          history.pushState({ scratchcart: true }, "");
          window.addEventListener("popstate", onPopState);
        } catch (e) {
          /* bazı tarayıcılar engelleyebilir */
        }
      } else {
        document.addEventListener("mouseout", onMouseOut);
      }
    }

    if (wantsIdle) {
      idleEvents.forEach(function (name) {
        window.addEventListener(name, resetIdle, { passive: true });
      });
      resetIdle();
    }

    return cleanup;
  }

  /* ---------------------------------------------------------- gösterim kuralı */

  function canDisplay(config) {
    var stored = local();
    var now = Date.now();

    if (stored.cooldownUntil && stored.cooldownUntil > now) return false;

    var today = new Date().toDateString();
    if (stored.displayDay !== today) {
      saveLocal({ displayDay: today, displayCount: 0 });
      return true;
    }

    return (stored.displayCount || 0) < config.maxDisplaysPerSession;
  }

  function recordDisplay(config) {
    var stored = local();
    saveLocal({
      displayCount: (stored.displayCount || 0) + 1,
      cooldownUntil: Date.now() + config.cooldownMinutes * 60000,
    });
  }

  /* ------------------------------------------------------------------ başlat */

  function boot() {
    // Ödeme ve hesap sayfalarında hiçbir zaman gösterilmez.
    if (/^\/(checkouts?|account|challenge|password)/.test(location.pathname)) return;
    if (window.Shopify && window.Shopify.designMode) return; // tema düzenleyici

    fetch(PROXY + "/config", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (config) {
        if (!config || !config.enabled) return;
        state.config = config;
        if (!canDisplay(config)) return;
        return getCart().then(function (cart) {
          start(config, cart);
        });
      })
      .catch(function () {
        /* yapılandırma alınamazsa mağaza normal çalışmaya devam eder */
      });
  }

  function start(config, cart) {
    var cartTotal = cart ? cart.total_price / 100 : 0;
    if (cartTotal < config.minCartValue) return;

    var root = buildMarkup(config);
    applyTheme(root, config);
    document.body.appendChild(root);

    var el = {
      root: root,
      ticket: root.querySelector(".sc-ticket"),
      panel: root.querySelector(".sc-panel"),
      foil: root.querySelector(".sc-foil"),
      hint: root.querySelector(".sc-hint"),
      title: root.querySelector(".sc-title"),
      subtitle: root.querySelector(".sc-subtitle"),
      prizeValue: root.querySelector(".sc-prize-value"),
      progressBar: root.querySelector(".sc-progress-bar"),
      cta: root.querySelector(".sc-cta"),
      codeValue: root.querySelector(".sc-code-value"),
      copy: root.querySelector(".sc-copy"),
      expiry: root.querySelector(".sc-expiry"),
      serial: root.querySelector(".sc-serial"),
      error: root.querySelector(".sc-error"),
      confetti: root.querySelector(".sc-confetti"),
    };

    var t = config.translations;
    el.title.textContent = config.title;
    el.subtitle.textContent = config.subtitle;
    el.hint.textContent = config.scratchText;
    el.cta.textContent = t.scratchToReveal;
    el.cta.disabled = true;
    el.serial.textContent = "NO " + sessionId().replace(/-/g, "").slice(0, 12).toUpperCase();

    var disarm = armTriggers(config, openTicket);
    var scratcher = null;
    var awarded = null;

    function openTicket(reason) {
      if (state.opened) return;
      state.opened = true;
      recordDisplay(config);

      root.setAttribute("data-open", "true");
      document.documentElement.style.overflow = "hidden";

      // Folyo ancak görünür alan ölçülebildiğinde çizilebilir.
      requestAnimationFrame(function () {
        scratcher = initScratch(
          {
            foil: el.foil,
            panel: el.panel,
            progressBar: el.progressBar,
            onFirstScratch: onFirstScratch,
          },
          config,
          reveal,
        );
        el.foil.focus({ preventScroll: true });
      });

      post("/start", {
        sessionId: sessionId(),
        cartToken: cart ? cart.token : null,
        cartValue: cartTotal,
        currency: cart ? cart.currency : null,
        deviceType: deviceType(),
        trigger: reason,
      }).catch(function () {});
    }

    function onFirstScratch() {
      el.cta.textContent = t.keepScratching;
    }

    function reveal() {
      if (state.revealed || state.requesting) return;
      state.requesting = true;
      el.cta.textContent = t.checking;

      post("/win", {
        sessionId: sessionId(),
        cartToken: cart ? cart.token : null,
        cartValue: cartTotal,
      })
        .then(function (result) {
          if (!result.ok) throw new Error(result.error || "unknown");
          awarded = result;
          state.revealed = true;

          el.prizeValue.textContent = result.label;
          el.ticket.setAttribute("data-state", "won");
          el.codeValue.textContent = result.code;
          el.expiry.textContent = t.expiresIn.replace(
            "{minutes}",
            String(result.validMinutes),
          );
          el.cta.textContent = config.autoApply ? t.applying : t.continueShopping;
          el.cta.disabled = true;

          if (config.enableHaptic && navigator.vibrate && isMobile()) {
            navigator.vibrate([40, 80, 40]);
          }
          if (config.showConfetti) {
            runConfetti(el.confetti, [
              config.colors.reveal,
              "#ffffff",
              config.colors.card,
            ]);
          }

          if (!config.autoApply) {
            el.cta.disabled = false;
            return;
          }
          return applyDiscount(result.code).then(function () {
            el.cta.textContent = t.goToCart;
            el.cta.disabled = false;
          });
        })
        .catch(function (error) {
          state.requesting = false;
          var reason = (error && error.data && error.data.error) || "unknown";
          el.ticket.setAttribute("data-error", "true");
          el.error.textContent = t.errors[reason] || t.errors.unknown;
          el.cta.textContent = t.close;
          el.cta.onclick = close;
          // Panel gizlenince buton, parmağın az önce kazıdığı yere kayar.
          // Kısa bir kilit olmazsa devam eden hareket bileti kazara kapatır
          // ve müşteri hata mesajını hiç okuyamaz.
          el.cta.disabled = true;
          setTimeout(function () {
            el.cta.disabled = false;
          }, 600);
        });
    }

    function close() {
      root.setAttribute("data-open", "false");
      document.documentElement.style.overflow = "";
      setTimeout(function () {
        if (root.parentNode) root.parentNode.removeChild(root);
      }, 350);

      if (!state.revealed) {
        post("/abandon", { sessionId: sessionId() }).catch(function () {});
      }
      document.removeEventListener("keydown", onKey);
    }

    function onKey(event) {
      if (event.key === "Escape") close();
    }

    el.cta.addEventListener("click", function () {
      if (!state.revealed) return;
      if (awarded && config.autoApply) {
        window.location.href = "/cart";
      } else {
        close();
      }
    });

    el.copy.addEventListener("click", function () {
      if (!awarded) return;
      var write = navigator.clipboard && navigator.clipboard.writeText;
      if (write) navigator.clipboard.writeText(awarded.code);
      el.copy.textContent = t.copied;
      setTimeout(function () {
        el.copy.textContent = t.copy;
      }, 1800);
    });

    root.addEventListener("click", function (event) {
      if (event.target.hasAttribute("data-sc-dismiss")) close();
    });

    document.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", disarm);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
