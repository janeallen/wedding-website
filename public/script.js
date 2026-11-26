// ---------- Mobile menu ----------
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav-toggle');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav-links a').forEach((a) =>
  a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }),
);

// ---------- Countdown to 3:00 PM Pacific, May 29, 2027 ----------
const wedding = new Date('2027-05-29T15:00:00-07:00');
const days = Math.ceil((wedding - Date.now()) / 86_400_000);
document.getElementById('countdown').textContent =
  days > 1 ? `${days} days to go` : days === 1 ? 'Tomorrow!' : days === 0 ? 'Today’s the day!' : 'Just married';

// ---------- RSVP ----------
const form = document.getElementById('rsvp-form');
const guestsBox = document.getElementById('guests');
const guestList = document.getElementById('guest-list');
const template = document.getElementById('guest-template');
const status = document.getElementById('form-status');
const MAX_GUESTS = 10;

function renumber() {
  guestList.querySelectorAll('.guest').forEach((g, i) => (g.querySelector('.guest-num').textContent = i + 1));
  document.getElementById('add-guest').hidden = guestList.children.length >= MAX_GUESTS;
}

function addGuest(prefillName = '') {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector('[name=guest-name]').value = prefillName;
  node.querySelector('.remove-guest').addEventListener('click', () => { node.remove(); renumber(); });
  guestList.appendChild(node);
  renumber();
  return node;
}

form.querySelectorAll('input[name=attending]').forEach((radio) =>
  radio.addEventListener('change', () => {
    const yes = form.attending.value === 'yes';
    guestsBox.hidden = !yes;
    // Start with one guest card, pre-filled with the person replying.
    if (yes && !guestList.children.length) addGuest(form.name.value.trim());
  }),
);

document.getElementById('add-guest').addEventListener('click', () => {
  addGuest().querySelector('input').focus();
});

function markInvalid(el, bad) {
  el.classList.toggle('invalid', bad);
  return bad;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.className = 'form-status';

  const attending = form.attending.value;
  let bad = false;
  bad = markInvalid(form.name, !form.name.value.trim()) || bad;
  bad = markInvalid(form.email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim())) || bad;
  if (!attending) bad = true;

  const guests = attending === 'yes'
    ? [...guestList.querySelectorAll('.guest')].map((g) => {
        const name = g.querySelector('[name=guest-name]');
        const first = g.querySelector('[name=guest-first]');
        const main = g.querySelector('[name=guest-main]');
        bad = markInvalid(name, !name.value.trim()) || bad;
        bad = markInvalid(first, !first.value) || bad;
        bad = markInvalid(main, !main.value) || bad;
        return { name: name.value, first: first.value, main: main.value, dietary: g.querySelector('[name=guest-dietary]').value };
      })
    : [];

  if (bad) {
    status.textContent = 'Please fill in the highlighted fields.';
    status.classList.add('error');
    return;
  }

  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  status.textContent = 'Sending…';

  try {
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.value, email: form.email.value, attending, guests, note: form.note.value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');

    form.innerHTML = attending === 'yes'
      ? '<p class="thanks">Thank you! We can’t wait to celebrate with you in Morro Bay. 🌊</p>'
      : '<p class="thanks">Thank you for letting us know. You’ll be missed!</p>';
  } catch (err) {
    status.textContent = `${err.message} Please try again.`;
    status.classList.add('error');
    button.disabled = false;
  }
});
