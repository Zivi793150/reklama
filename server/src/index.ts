import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { router } from './routes';
import { runMigrations } from './db';

const app = express();
app.use(cors({
  origin: true, // Allow all origins
  credentials: false, // Disable credentials to avoid CORS issues
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

runMigrations();

app.use('/api', router);

const port = Number(process.env.PORT || 4000);

// Zero-config integration script for marketers
app.get('/integrate.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  const script = `(() => {
  const currentScript = document.currentScript || (function() { const scripts = document.getElementsByTagName('script'); return scripts[scripts.length - 1]; })();
  const base = new URL(currentScript.src).origin;
  const endpoint = base + '/api/webhook/forms';
  const debug = (currentScript.getAttribute('data-debug') === '1');
  const log = (...args) => { try { if (debug && window && window.console) console.log('[integrate]', ...args); } catch(_) {} };
  log('loaded');

  function getUTM() {
    const params = new URLSearchParams(window.location.search);
    const u = {};
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(k => { const v = params.get(k); if (v) u[k] = v; });
    return u;
  }

  function serializeForm(form) {
    const data = {};
    const fd = new FormData(form);
    fd.forEach((value, key) => {
      if (!(key in data)) data[key] = value;
    });
    // Heuristics for common fields
    const byName = (names) => names.map(n => form.querySelector('[name="' + n + '"]')).find(el => el && el.value && String(el.value).trim());
    const nameEl = byName(['name','fullname','fio']);
    const phoneEl = byName(['phone','tel','telephone','phone_number']);
    const emailEl = byName(['email','mail']);
    if (!data.name && nameEl) data.name = nameEl.value;
    if (!data.phone && phoneEl) data.phone = phoneEl.value;
    if (!data.email && emailEl) data.email = emailEl.value;
    return data;
  }

  function sendLead(payload) {
    const body = JSON.stringify(payload);
    const headers = { type: 'application/json' };
    log('sendLead', payload);
    if (navigator.sendBeacon) {
      try { return navigator.sendBeacon(endpoint, new Blob([body], headers)); } catch(_) {}
    }
    try {
      return fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, credentials: 'omit' });
    } catch (_) { /* noop */ }
  }

  // Prevent duplicate sends within a short time window for the same form
  function markSentOnce(target) {
    try {
      const now = Date.now();
      if (target.__analyticsLastSent && (now - target.__analyticsLastSent) < 1500) return false;
      target.__analyticsLastSent = now;
      return true;
    } catch(_) { return true; }
  }

  function attach(form) {
    if (!form || form.__analyticsBound) return;
    form.__analyticsBound = true;
    log('attach form', form);
    form.addEventListener('submit', () => {
      try {
        if (!markSentOnce(form)) return;
        const payload = Object.assign(
          {
            page: window.location.href,
            source: currentScript.getAttribute('data-source') || 'website_form'
          },
          getUTM(),
          serializeForm(form)
        );
        sendLead(payload);
      } catch (_) {}
    }, { capture: true });

    // Fallback: some sites submit forms via JS without dispatching submit
    form.addEventListener('click', (ev) => {
      try {
        const t = ev.target;
        if (!t) return;
        const type = (t.getAttribute && t.getAttribute('type')) || '';
        if (type.toLowerCase() === 'submit') {
          if (!markSentOnce(form)) return;
          const payload = Object.assign(
            {
              page: window.location.href,
              source: currentScript.getAttribute('data-source') || 'website_form'
            },
            getUTM(),
            serializeForm(form)
          );
          sendLead(payload);
          log('fallback click submit');
        }
      } catch (_) {}
    }, { capture: true });
  }

  // Bind existing forms
  Array.prototype.forEach.call(document.forms || [], attach);
  // Observe dynamically added forms
  const mo = new MutationObserver(muts => {
    muts.forEach(m => {
      Array.prototype.forEach.call(m.addedNodes || [], node => {
        if (node && node.nodeType === 1) {
          if (node.tagName === 'FORM') attach(node);
          const forms = node.querySelectorAll ? node.querySelectorAll('form') : [];
          Array.prototype.forEach.call(forms, attach);
        }
      });
    });
  });
  try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch(_) {}

  // Global capture: any submit bubbling through the document
  try {
    document.addEventListener('submit', (ev) => {
      const form = ev && ev.target && ev.target.tagName === 'FORM' ? ev.target : null;
      if (!form) return;
      try {
        if (!markSentOnce(form)) return;
        const payload = Object.assign(
          { page: window.location.href, source: currentScript.getAttribute('data-source') || 'website_form' },
          getUTM(),
          serializeForm(form)
        );
        sendLead(payload);
        log('document submit captured');
      } catch (_) {}
    }, true);
  } catch(_) {}

  // Intercept programmatic form.submit()
  try {
    const nativeSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      try {
        if (markSentOnce(this)) {
          const payload = Object.assign(
            { page: window.location.href, source: currentScript.getAttribute('data-source') || 'website_form' },
            getUTM(),
            serializeForm(this)
          );
          sendLead(payload);
          log('native submit intercepted');
        }
      } catch (_) {}
      return nativeSubmit.apply(this, arguments);
    };
  } catch(_) {}

  // Intercept fetch calls that send FormData (popular frameworks)
  try {
    const nativeFetch = window.fetch;
    window.fetch = function(input, init) {
      try {
        const maybeInit = init || (typeof input === 'object' ? input : undefined);
        const body = maybeInit && maybeInit.body;
        if (body && typeof FormData !== 'undefined' && body instanceof FormData) {
          const data = {};
          body.forEach((v, k) => { if (!(k in data)) data[k] = v; });
          if (data && (data.name || data.phone || data.email)) {
            const payload = Object.assign(
              { page: window.location.href, source: currentScript.getAttribute('data-source') || 'website_form' },
              getUTM(),
              data
            );
            sendLead(payload);
            log('fetch FormData mirrored');
          }
        }
      } catch(_) {}
      return nativeFetch.apply(this, arguments);
    };
  } catch(_) {}

  // Intercept XMLHttpRequest that sends FormData
  try {
    const NativeXHR = window.XMLHttpRequest;
    const originalOpen = NativeXHR.prototype.open;
    const originalSend = NativeXHR.prototype.send;
    NativeXHR.prototype.open = function(method, url) {
      try { this.__analyticsMethod = (method || '').toString().toUpperCase(); } catch(_) {}
      return originalOpen.apply(this, arguments);
    };
    NativeXHR.prototype.send = function(body) {
      try {
        if (body && typeof FormData !== 'undefined' && body instanceof FormData) {
          const data = {} as any;
          body.forEach((v, k) => { if (!(k in data)) data[k] = v; });
          if (data && (data.name || data.phone || data.email)) {
            const payload = Object.assign(
              { page: window.location.href, source: currentScript.getAttribute('data-source') || 'website_form' },
              getUTM(),
              data
            );
            sendLead(payload);
            log('xhr FormData mirrored');
          }
        }
      } catch(_) {}
      return originalSend.apply(this, arguments);
    };
  } catch(_) {}
})();`;
  res.send(script);
});

// Serve static frontend if available
const configuredClientDir = process.env.CLIENT_DIR || path.join(process.cwd(), '..', 'client');
const clientDir = path.isAbsolute(configuredClientDir)
  ? configuredClientDir
  : path.resolve(process.cwd(), configuredClientDir);

if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  // Express v5 no longer accepts '*' path string; use a regex catch-all instead
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


