import { loginPage } from './login.js';

const COOKIE = 'jt_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~13 months: guests log in once per device
const PUBLIC_PATHS = new Set(['/robots.txt', '/favicon.svg']);

const MENU = {
  first: ['Mixed Greens', 'Whole Leaf Caesar', 'Lobster Bisque'],
  main: ['Local Halibut', 'Free Range Chicken', 'Grilled New York Steak', 'Vegetarian'],
};

const enc = new TextEncoder();

/** Case-insensitive, ignores all whitespace: "Shanty", " shanty ", "SHAN TY" all match. */
const normalize = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '');

function safeEqual(a, b) {
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.byteLength !== y.byteLength) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}

/**
 * The auth cookie is an HMAC keyed by the password, so it can't be forged
 * and every existing cookie stops working the moment the password changes.
 */
async function authToken(env) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(normalize(env.SITE_PASSWORD)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('janeandthomas-auth-v1'));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

/** Only allow redirects back to a path on this site. */
function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

const html = (body, status = 200, extra = {}) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Send www → apex so there's one canonical address.
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (PUBLIC_PATHS.has(url.pathname)) return withHeaders(await env.ASSETS.fetch(request));

    // Fail closed if the password secret was never set.
    if (!env.SITE_PASSWORD) {
      return html('<p style="font-family:sans-serif">Site password is not configured yet.</p>', 503);
    }

    const expected = await authToken(env);

    // --- Login ---
    if (url.pathname === '/login') {
      if (request.method === 'POST') {
        const form = await request.formData();
        const next = safeNext(form.get('next'));
        if (safeEqual(normalize(form.get('password')), normalize(env.SITE_PASSWORD))) {
          return new Response(null, {
            status: 303,
            headers: {
              Location: next,
              'Set-Cookie': `${COOKIE}=${expected}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
            },
          });
        }
        return html(loginPage({ next, error: true }), 401, noIndex);
      }
      return html(loginPage({ next: safeNext(url.searchParams.get('next')) }), 200, noIndex);
    }

    if (url.pathname === '/logout') {
      return new Response(null, {
        status: 303,
        headers: { Location: '/login', 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` },
      });
    }

    // --- Admin export (separate password, browser login prompt) ---
    if (url.pathname === '/admin/rsvps.csv') return adminExport(request, env);

    // --- Everything else requires the guest cookie ---
    const cookie = getCookie(request, COOKIE);
    if (!cookie || !safeEqual(cookie, expected)) {
      if (url.pathname.startsWith('/api/')) return json({ error: 'Not signed in' }, 401);
      return html(loginPage({ next: url.pathname + url.search }), 401, noIndex);
    }

    if (url.pathname === '/api/rsvp' && request.method === 'POST') return saveRsvp(request, env);

    return withHeaders(await env.ASSETS.fetch(request));
  },
};

const noIndex = { 'X-Robots-Tag': 'noindex, nofollow' };

function withHeaders(response) {
  const r = new Response(response.body, response);
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return r;
}

// ---------------------------------------------------------------- RSVP

const clip = (v, max) => String(v ?? '').trim().slice(0, max);

async function saveRsvp(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const contact = clip(body.name, 120);
  const email = clip(body.email, 200);
  const attending = body.attending === 'yes' ? 1 : body.attending === 'no' ? 0 : null;
  const note = clip(body.note, 2000);

  if (!contact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || attending === null) {
    return json({ error: 'Please fill in your name, a valid email, and whether you can come.' }, 400);
  }

  let guests = [];
  if (attending) {
    guests = (Array.isArray(body.guests) ? body.guests : []).slice(0, 10).map((g) => ({
      name: clip(g?.name, 120),
      first: MENU.first.includes(g?.first) ? g.first : null,
      main: MENU.main.includes(g?.main) ? g.main : null,
      dietary: clip(g?.dietary, 300),
    }));
    if (!guests.length || guests.some((g) => !g.name || !g.first || !g.main)) {
      return json({ error: 'Please add a name, first course and main course for each guest.' }, 400);
    }
  }

  const rsvp = await env.DB.prepare(
    'INSERT INTO rsvps (contact_name, email, attending, note) VALUES (?, ?, ?, ?) RETURNING id',
  ).bind(contact, email, attending, note || null).first();

  if (guests.length) {
    await env.DB.batch(guests.map((g) =>
      env.DB.prepare(
        'INSERT INTO guests (rsvp_id, name, first_course, main_course, dietary) VALUES (?, ?, ?, ?, ?)',
      ).bind(rsvp.id, g.name, g.first, g.main, g.dietary || null),
    ));
  }

  return json({ ok: true });
}

// ---------------------------------------------------------------- Admin

async function adminExport(request, env) {
  const auth = request.headers.get('Authorization') || '';
  let ok = false;
  if (env.ADMIN_PASSWORD && auth.startsWith('Basic ')) {
    try {
      const [, pass] = atob(auth.slice(6)).split(/:(.*)/s);
      ok = safeEqual(pass ?? '', env.ADMIN_PASSWORD);
    } catch { /* malformed header */ }
  }
  if (!ok) {
    return new Response('Admin login required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="RSVP admin"', 'Cache-Control': 'no-store' },
    });
  }

  const { results } = await env.DB.prepare(`
    SELECT r.id, r.created_at, r.contact_name, r.email, r.attending, r.note,
           g.name AS guest, g.first_course, g.main_course, g.dietary
    FROM rsvps r LEFT JOIN guests g ON g.rsvp_id = r.id
    ORDER BY r.id, g.id`).all();

  const cols = ['id', 'created_at', 'contact_name', 'email', 'attending', 'guest', 'first_course', 'main_course', 'dietary', 'note'];
  const cell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // keep spreadsheet apps from treating text as a formula
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = results.map((r) => cols.map((c) => cell(c === 'attending' ? (r.attending ? 'yes' : 'no') : r[c])).join(','));

  return new Response([cols.join(','), ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rsvps.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
