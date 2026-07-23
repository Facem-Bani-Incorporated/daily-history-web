/* Daily History — shared site JS: PostHog analytics, platform detection, UTM, email capture */
(function () {
  'use strict';

  /* ============================================================
     1. CONFIG — paste your PostHog project API key here (one place
        for all pages). Get it at https://posthog.com → Project Settings.
        If your project is in the EU region, change api_host to
        https://eu.i.posthog.com
     ============================================================ */
  var POSTHOG_KEY = 'phc_pSMS9UwJ6WknXf3iMRQ9P83mrELnUNqJeyHXwHGPqHMG';
  var POSTHOG_HOST = 'https://us.i.posthog.com';

  var LANG = document.documentElement.lang || 'en';

  /* ---------- UTM handling: persist params across the session ---------- */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var params = new URLSearchParams(window.location.search);
  var utm = {};
  UTM_KEYS.forEach(function (k) {
    var v = params.get(k);
    if (v) { utm[k] = v; sessionStorage.setItem('dh_' + k, v); }
    else if (sessionStorage.getItem('dh_' + k)) { utm[k] = sessionStorage.getItem('dh_' + k); }
  });

  /* ---------- Play Store install referrer ----------
     The browser does not forward "came from TikTok" through the store
     link, so Play logs the install with no referrer and Firebase files it
     under organic. We rebuild the referrer from the UTMs on the URL (or
     the ones kept in sessionStorage from the landing hit) and hand it to
     Play, which passes it to the app on first open.
     iOS has no equivalent — Apple drops referrers — so there the only
     signal is the store_click event below. */
  function playReferrer() {
    var r = {
      utm_source: utm.utm_source || 'website',
      utm_medium: utm.utm_medium || 'website',
      utm_campaign: utm.utm_campaign || 'direct'
    };
    if (utm.utm_content) { r.utm_content = utm.utm_content; }
    if (utm.utm_term) { r.utm_term = utm.utm_term; }
    return Object.keys(r).map(function (k) {
      return k + '=' + encodeURIComponent(r[k]);
    }).join('&');
  }

  function tagPlayLinks() {
    var ref = encodeURIComponent(playReferrer());
    document.querySelectorAll('a[href*="play.google.com"]').forEach(function (a) {
      a.href = a.href.split('&referrer=')[0] + '&referrer=' + ref;
    });
  }

  /* ---------- PostHog loader (official snippet, minified) ---------- */
  !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);

  var analyticsOn = POSTHOG_KEY.indexOf('PASTE_YOUR_KEY') === -1;
  if (analyticsOn) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      persistence: 'localStorage+cookie'
    });
    var props = { page_language: LANG };
    UTM_KEYS.forEach(function (k) { if (utm[k]) props[k] = utm[k]; });
    posthog.register(props);
  }

  function track(event, extra) {
    if (!analyticsOn) return;
    var p = { page_language: LANG };
    for (var k in extra) p[k] = extra[k];
    posthog.capture(event, p);
  }

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------- Live date in the phone mockup ---------- */
    var dateEl = document.querySelector('.scr-date');
    if (dateEl) {
      try {
        dateEl.textContent = new Date().toLocaleDateString(LANG, { month: 'long', day: 'numeric' }).toUpperCase();
      } catch (e) { /* keep static fallback text */ }
    }

    var isAndroid = /android/i.test(navigator.userAgent);
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    /* ---------- Single-button store links ----------
       The header, the inline quiz card and the sticky bar each show one button
       rather than two. They ship pointing at Play, and on iOS the href is
       swapped here. This must run BEFORE tagPlayLinks(), otherwise a link
       rewritten afterwards would lose the install referrer. */
    document.querySelectorAll('[data-smart-store]').forEach(function (a) {
      if (!isIOS) return;
      a.href = 'https://apps.apple.com/us/app/daily-history-on-this-day/id6768552706';
      a.setAttribute('data-store', 'ios');
    });

    tagPlayLinks();

    /* ---------- Sticky app bar ----------
       Hidden in the markup and revealed here, so a reader with JavaScript off
       never gets a bar they cannot dismiss. Dismissal is remembered. */
    var appBar = document.getElementById('app-bar');
    if (appBar) {
      var DISMISS_KEY = 'dh_app_bar_dismissed';
      var dismissed;
      try { dismissed = localStorage.getItem(DISMISS_KEY); } catch (e) { dismissed = null; }
      if (!dismissed) {
        appBar.hidden = false;
        document.body.classList.add('has-app-bar');
        track('app_bar_shown', {});
      }
      var closeBtn = appBar.querySelector('.app-bar-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          appBar.hidden = true;
          document.body.classList.remove('has-app-bar');
          try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* private mode */ }
          track('app_bar_dismissed', {});
        });
      }
    }

    /* ---------- Platform detection: Android sees Google Play first ---------- */
    var stores = document.querySelector('.stores');
    if (isAndroid && stores) {
      var ios = stores.querySelector('[data-store="ios"]');
      var android = stores.querySelector('[data-store="android"]');
      if (ios && android) {
        stores.insertBefore(android, ios);
        android.classList.remove('secondary'); android.classList.add('primary');
        ios.classList.remove('primary'); ios.classList.add('secondary');
      }
    }

    /* ---------- Store click tracking ---------- */
    // Includes the single-button links in the header, quiz card and sticky bar,
    // so every route to a store shows up in the funnel, not just the big pair.
    document.querySelectorAll('.store-btn, [data-smart-store]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        track('store_click', {
          store: btn.getAttribute('data-store'),
          device_platform: isAndroid ? 'android' : (/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'desktop'),
          placement: btn.getAttribute('data-placement') || 'hero',
          play_referrer: btn.getAttribute('data-store') === 'android' ? playReferrer() : null
        });
      });
    });

    /* ---------- Email capture ---------- */
    var form = document.querySelector('.email-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[type="email"]');
        var email = (input.value || '').trim();
        if (!email || email.indexOf('@') === -1) { input.focus(); return; }
        track('email_submitted', { email: email });
        if (analyticsOn) {
          posthog.identify(email, { email: email });
        }
        form.style.display = 'none';
        var done = document.querySelector('.email-done');
        if (done) done.style.display = 'block';
      });
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Pointer glow and magnetic button ----------
       Both write custom properties and let CSS do the compositing, so no frame
       here ever reads layout. Pointer-coarse devices and reduced-motion skip it
       entirely rather than paying for a listener they cannot see the result of. */
    if (!reduceMotion && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      var glowQueued = false, lastX = 0, lastY = 0;
      var appBtn = document.querySelector('.btn-app');

      document.addEventListener('pointermove', function (e) {
        lastX = e.clientX; lastY = e.clientY;
        if (glowQueued) return;
        glowQueued = true;
        requestAnimationFrame(function () {
          glowQueued = false;
          document.body.classList.add('has-pointer');
          document.documentElement.style.setProperty('--mx', lastX + 'px');
          document.documentElement.style.setProperty('--my', lastY + 'px');

          if (appBtn) {
            // getBoundingClientRect is cheap here because it runs at most once
            // per frame and only while the pointer is near the button.
            var r = appBtn.getBoundingClientRect();
            var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            var dx = lastX - cx, dy = lastY - cy;
            var near = Math.abs(dx) < r.width * 1.6 && Math.abs(dy) < r.height * 3;
            appBtn.style.setProperty('--dx', near ? (dx * 0.18).toFixed(1) + 'px' : '0px');
            appBtn.style.setProperty('--dy', near ? (dy * 0.22).toFixed(1) + 'px' : '0px');
          }
        });
      }, { passive: true });
    }

    /* ---------- Keyboard: move through the archive by day ----------
       Ignored while typing, so the email field still behaves. */
    var prevLink = document.querySelector('.day-nav-item.prev');
    var nextLink = document.querySelector('.day-nav-item.next');
    if (prevLink || nextLink) {
      document.addEventListener('keydown', function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var el = document.activeElement;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
        if (e.key === 'ArrowLeft' && prevLink && prevLink.href) { window.location = prevLink.href; }
        if (e.key === 'ArrowRight' && nextLink && nextLink.href) { window.location = nextLink.href; }
      });
    }

    /* ---------- Masthead: hairline appears once the page has moved ---------- */
    var mast = document.getElementById('masthead');
    if (mast) {
      var onScroll = function () {
        mast.classList.toggle('is-stuck', window.scrollY > 12);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ---------- Reveal on scroll ----------
       Browsers with scroll-driven CSS animations do this natively (see the
       @supports block in site.css) and must be left alone, or the elements
       would animate twice. This is only the fallback path. */
    var nativeScrollAnim = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
    var revealSel = '.rv, .rv-wipe';
    if (nativeScrollAnim) {
      /* nothing to do — CSS owns it */
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      document.querySelectorAll(revealSel).forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll(revealSel).forEach(function (el) { el.classList.add('in'); });
    }
  });
})();
