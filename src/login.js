const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The password page guests see first. Styled as a postcard to match the site. */
export function loginPage({ next = '/', error = false } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Jane &amp; Thomas · May 29, 2027</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=DM+Serif+Display&family=Jost:wght@300;400;500&family=Yellowtail&display=swap" rel="stylesheet">
<style>
  :root { --navy:#10204a; --indigo:#2a2a6e; --blue:#2f7fe0; --turq:#22b5b0; --peri:#8f9ff0; --gold:#f4b83a; --paper:#fbf6ea; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
    font-family: Jost, system-ui, sans-serif; color: var(--navy);
    background: radial-gradient(circle at 20% 10%, #3b3f9a 0, transparent 45%),
                radial-gradient(circle at 85% 90%, #136f8a 0, transparent 45%), var(--navy);
  }
  .card {
    position: relative; width: min(460px, 100%); background: var(--paper);
    padding: 44px 32px 36px; text-align: center; border-radius: 6px;
    box-shadow: 0 30px 60px rgba(0,0,0,.35); transform: rotate(-1.2deg);
  }
  .card::before { content:""; position:absolute; inset:10px; border:1.5px dashed rgba(16,32,74,.22); border-radius:3px; pointer-events:none; }
  .greet { font-family: Yellowtail, cursive; font-size: 1.9rem; color: var(--turq); margin: 0; }
  h1 {
    font-family: "Alfa Slab One", serif; font-weight: 400; margin: 0 0 6px; line-height: 1;
    font-size: clamp(2.6rem, 11vw, 3.4rem); letter-spacing: .02em; color: var(--blue);
    text-shadow: 3px 3px 0 var(--gold), 5px 5px 0 var(--navy);
  }
  .date { font-family: "DM Serif Display", serif; font-size: 1.2rem; margin: 10px 0 26px; }
  label { display:block; font-size:.75rem; letter-spacing:.22em; text-transform:uppercase; color:#4a5677; margin-bottom:8px; }
  input {
    width: 100%; font: inherit; font-size: 1.15rem; text-align: center; padding: 12px 14px;
    border: 1.5px solid #c9cde0; border-radius: 4px; background: #fff; color: var(--navy);
  }
  input:focus { outline: 3px solid var(--peri); outline-offset: 1px; border-color: var(--indigo); }
  button {
    margin-top: 16px; width: 100%; border: 0; border-radius: 4px; cursor: pointer;
    background: var(--indigo); color: #fff; font: inherit; font-weight: 500; font-size: .85rem;
    letter-spacing: .22em; text-transform: uppercase; padding: 14px;
  }
  button:hover { background: var(--navy); }
  .error { color: #b3261e; font-size: .95rem; margin: 12px 0 0; }
  .hint { color: #5a6582; font-size: .9rem; margin: 18px 0 0; }
</style>
</head>
<body>
  <main class="card">
    <p class="greet">Greetings from</p>
    <h1>Morro Bay</h1>
    <p class="date">Jane &amp; Thomas · May 29, 2027</p>
    <form method="post" action="/login">
      <input type="hidden" name="next" value="${escapeHtml(next)}">
      <label for="pw">Password</label>
      <input id="pw" name="password" type="password" autocomplete="current-password" autocapitalize="none" required autofocus>
      <button type="submit">Come on in</button>
      ${error ? '<p class="error" role="alert">That’s not quite it. Please try again.</p>' : ''}
    </form>
    <p class="hint">You’ll find the password on your save-the-date.</p>
  </main>
</body>
</html>`;
}
