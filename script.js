/* =========================================================
   Lesotho Horizons – script.js
   Features: 1 dark/light mode (localStorage)   2 destination search
             3 category filter                  4 gallery modal + prev/next
             5 form validation + messages       6 booking cost calculator
             7 saved booking requests (localStorage, rendered dynamically)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } }
  };

  /* ---------- 1. Dark / light mode (remembered between visits) ---------- */
  const themeBtn = $('#themeToggle');
  const applyTheme = (dark) => {
    document.body.classList.toggle('dark-mode', dark);
    if (themeBtn) themeBtn.setAttribute('aria-pressed', String(dark));
  };
  applyTheme(store.get('lh-dark', false));
  themeBtn?.addEventListener('click', () => {
    const dark = !document.body.classList.contains('dark-mode');
    applyTheme(dark);
    store.set('lh-dark', dark);
  });

  /* ---------- Image fallback: a missing photo shows a branded block, not a broken icon ---------- */
  const COMMONS_FALLBACK = 'https://commons.wikimedia.org/wiki/Special:FilePath/Maletsunyanefalls.JPG?width=1200';
  $$('img').forEach(img => img.addEventListener('error', () => {
    if (img.src.includes('maletsunyane') && !img.dataset.tried) {
      img.dataset.tried = '1';
      img.src = COMMONS_FALLBACK;
    } else {
      img.classList.add('img-missing');
    }
  }));

  /* ---------- 2 + 3. Destination search and category filter ---------- */
  const searchBox = $('#destinationSearch');
  const items = $$('.destination-item');
  const noResults = $('#noResults');
  let activeFilter = 'all';

  const updateDestinations = () => {
    const term = (searchBox?.value || '').trim().toLowerCase();
    let visible = 0;
    items.forEach(item => {
      const text = (item.dataset.name + ' ' + item.textContent).toLowerCase();
      const show = (activeFilter === 'all' || item.dataset.category === activeFilter) && text.includes(term);
      item.classList.toggle('d-none', !show);
      if (show) visible++;
    });
    noResults?.classList.toggle('d-none', visible > 0);
  };
  searchBox?.addEventListener('input', updateDestinations);
  $$('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    updateDestinations();
  }));

  /* ---------- 4. Gallery modal with next / previous ---------- */
  const galleryButtons = $$('.gallery-item');
  const preview = $('#galleryPreview');
  if (galleryButtons.length && preview) {
    let current = 0;
    const show = (i) => {
      current = (i + galleryButtons.length) % galleryButtons.length;
      const b = galleryButtons[current];
      preview.src = b.dataset.image;
      preview.alt = $('img', b).alt;
      $('#galleryTitle').textContent = b.dataset.title;
      $('#galleryCaption').textContent = `Photo ${current + 1} of ${galleryButtons.length}`;
    };
    galleryButtons.forEach((b, i) => b.addEventListener('click', () => show(i)));
    $('#galleryPrev')?.addEventListener('click', () => show(current - 1));
    $('#galleryNext')?.addEventListener('click', () => show(current + 1));
    document.addEventListener('keydown', (e) => {
      if (!$('#galleryModal').classList.contains('show')) return;
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ---------- 5. Form validation (shared by both forms) ---------- */
  const showAlert = (box, type, text) => {
    box.className = `alert alert-${type}`;
    box.textContent = text;
    box.focus?.();
  };
  const validate = (form) => {
    let ok = true;
    $$('input, select, textarea', form).forEach(field => {
      const valid = field.checkValidity() && (field.type === 'number' || field.type === 'date' || field.value.trim() !== '' || !field.required);
      field.classList.toggle('is-invalid', !valid);
      field.classList.toggle('is-valid', valid && field.value !== '');
      if (!valid) ok = false;
    });
    return ok;
  };
  const liveValidate = (form) => $$('input, select, textarea', form).forEach(f =>
    f.addEventListener('blur', () => { f.classList.toggle('is-invalid', !f.checkValidity()); }));

  /* ---------- 6. Booking calculator ---------- */
  const RATES = { hiking: 450, culture: 300, horse: 650, road: 900 }; // Maloti per person
  const bookingForm = $('#bookingForm');
  const totalEl = $('#bookingTotal');
  const updateTotal = () => {
    const rate = RATES[$('#service').value] || 0;
    const people = Math.max(0, parseInt($('#people').value, 10) || 0);
    totalEl.textContent = 'M ' + (rate * people).toLocaleString('en-ZA');
  };

  /* ---------- 7. Saved booking requests ---------- */
  const recentBox = $('#recentRequests');
  const renderRecent = () => {
    if (!recentBox) return;
    const list = store.get('lh-bookings', []);
    recentBox.innerHTML = '';
    if (!list.length) return;
    const h = document.createElement('h3');
    h.className = 'h6 mt-4';
    h.textContent = 'Your recent requests (saved on this device)';
    const ul = document.createElement('ul');
    ul.className = 'list-unstyled small mb-2';
    list.slice(-3).reverse().forEach(r => {
      const li = document.createElement('li');
      li.textContent = `${r.date} · ${r.service} · ${r.people} people · ${r.total}`;
      ul.append(li);
    });
    const clear = document.createElement('button');
    clear.className = 'btn btn-sm btn-outline-primary';
    clear.type = 'button';
    clear.textContent = 'Clear saved requests';
    clear.addEventListener('click', () => { store.set('lh-bookings', []); renderRecent(); });
    recentBox.append(h, ul, clear);
  };

  if (bookingForm) {
    const date = $('#travelDate');
    date.min = new Date().toISOString().split('T')[0]; // no past dates
    ['service', 'people'].forEach(id => $('#' + id).addEventListener('input', updateTotal));
    liveValidate(bookingForm);
    renderRecent();
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = $('#bookingMessage');
      if (!validate(bookingForm)) {
        showAlert(msg, 'danger', 'Please fix the highlighted fields and try again.');
        return;
      }
      const list = store.get('lh-bookings', []);
      list.push({
        date: date.value,
        service: $('#service').selectedOptions[0].text,
        people: $('#people').value,
        total: totalEl.textContent
      });
      store.set('lh-bookings', list);
      showAlert(msg, 'success', `Thank you, ${$('#fullName').value.trim()}! Your request was received. We will email you at ${$('#email').value.trim()}.`);
      bookingForm.reset();
      $$('.is-valid, .is-invalid', bookingForm).forEach(f => f.classList.remove('is-valid', 'is-invalid'));
      $('#people').value = 2;
      updateTotal();
      renderRecent();
    });
  }

  const contactForm = $('#contactForm');
  if (contactForm) {
    liveValidate(contactForm);
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = $('#contactMessage');
      if (!validate(contactForm)) {
        showAlert(msg, 'danger', 'Please complete every field before sending.');
        return;
      }
      showAlert(msg, 'success', 'Message sent. We usually reply within one working day.');
      contactForm.reset();
      $$('.is-valid, .is-invalid', contactForm).forEach(f => f.classList.remove('is-valid', 'is-invalid'));
    });
  }
});
