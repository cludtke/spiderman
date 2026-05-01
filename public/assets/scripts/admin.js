// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
let actors = [];
let movies = [];
let uploadedFiles = {}; // fieldName -> File

// ══════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'actors') renderActorsTable();
  if (name === 'movies') renderMoviesTable();
}

// ══════════════════════════════════════════════════════════
//  API HELPERS
// ══════════════════════════════════════════════════════════
async function api(method, url, body) {
  const opts = { method, headers: {} };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  return res.json();
}

async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const data = await res.json();
  return data.url;
}

// ══════════════════════════════════════════════════════════
//  LOAD DATA
// ══════════════════════════════════════════════════════════
async function loadData() {
  [actors, movies] = await Promise.all([
    api('GET', '/api/actors'),
    api('GET', '/api/movies')
  ]);
}

async function loadDashboard() {
  await loadData();
  document.getElementById('stat-actors').textContent = actors.length;
  document.getElementById('stat-movies').textContent = movies.length;
  const totalGallery = movies.reduce((s, m) => s + (m.gallery || []).length, 0);
  document.getElementById('stat-gallery').textContent = totalGallery;

  const tbody = document.getElementById('dashboard-movies-table');
  tbody.innerHTML = movies.map(m => {
    const actor = actors.find(a => a.id === m.actor_id) || {};
    return `<tr>
      <td>${m.logo ? `<img class="thumb" src="${m.logo}" alt="">` : '—'}</td>
      <td><strong>${m.title}</strong></td>
      <td><span class="badge">${actor.name || '—'}</span></td>
      <td>${m.year}</td>
      <td>
        <button class="btn btn-icon btn-sm" onclick="showPage('movies');setTimeout(()=>openMovieModal(${m.id}),100)">✏️ Editar</button>
      </td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
//  ACTORS TABLE
// ══════════════════════════════════════════════════════════
function renderActorsTable() {
  const tbody = document.getElementById('actors-table');
  tbody.innerHTML = actors.map(a => {
    const count = movies.filter(m => m.actor_id === a.id).length;
    return `<tr>
      <td>${a.card_background ? `<img class="thumb" src="${a.card_background}" style="width:80px;height:48px" alt="">` : '—'}</td>
      <td>${a.icon ? `<img class="thumb" src="${a.icon}" style="width:40px;height:40px;border-radius:50%" alt="">` : '—'}</td>
      <td><strong>${a.name}</strong></td>
      <td>${a.order}</td>
      <td><span class="badge badge-red">${count} filme${count !== 1 ? 's' : ''}</span></td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-icon btn-sm" onclick="openActorModal(${a.id})">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDelete('ator','${a.name}',()=>deleteActor(${a.id}))">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
//  MOVIES TABLE
// ══════════════════════════════════════════════════════════
function renderMoviesTable() {
  // populate filter
  const filter = document.getElementById('filter-actor');
  if (filter.options.length === 1) {
    actors.forEach(a => {
      filter.innerHTML += `<option value="${a.id}">${a.name}</option>`;
    });
  }

  const actorId = Number(filter.value) || null;
  const filtered = actorId ? movies.filter(m => m.actor_id === actorId) : movies;

  const tbody = document.getElementById('movies-table');
  tbody.innerHTML = filtered.map(m => {
    const actor = actors.find(a => a.id === m.actor_id) || {};
    const galleryCount = (m.gallery || []).length;
    return `<tr>
      <td>${m.logo ? `<img class="thumb" src="${m.logo}" alt="">` : '—'}</td>
      <td><strong>${m.title}</strong></td>
      <td><span class="badge">${actor.name || '—'}</span></td>
      <td>${m.year}</td>
      <td>${m.director}</td>
      <td><span class="badge">${galleryCount} img</span></td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-icon btn-sm" onclick="openMovieModal(${m.id})">✏️ Editar</button>
        <a href="/movie/${m.id}" target="_blank" class="btn btn-icon btn-sm">👁️</a>
        <button class="btn btn-danger btn-sm" onclick="confirmDelete('filme','${m.title.replace(/'/g,"\\'")}',()=>deleteMovie(${m.id}))">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
//  FILE PREVIEW
// ══════════════════════════════════════════════════════════
function previewFile(input, previewId, hiddenId) {
  const file = input.files[0];
  if (!file) return;
  const fieldName = hiddenId;
  uploadedFiles[fieldName] = file;
  const url = URL.createObjectURL(file);
  const preview = document.getElementById(previewId);
  preview.src = url;
  preview.style.display = 'block';
}

function previewGallery(input) {
  const files = Array.from(input.files);
  uploadedFiles['gallery'] = files;
  const preview = document.getElementById('gallery-preview');
  preview.innerHTML = files.map(f => `<img src="${URL.createObjectURL(f)}" alt="">`).join('');
}

// ══════════════════════════════════════════════════════════
//  ACTOR MODAL
// ══════════════════════════════════════════════════════════
function openActorModal(id) {
  uploadedFiles = {};
  const actor = id ? actors.find(a => a.id === id) : null;
  document.getElementById('actor-modal-title').textContent = actor ? 'Editar Ator' : 'Novo Ator';
  document.getElementById('actor-id').value = id || '';
  document.getElementById('actor-name').value = actor ? actor.name : '';
  document.getElementById('actor-order').value = actor ? actor.order : actors.length + 1;

  // previews
  ['icon','card','bg'].forEach(k => {
    const prev = document.getElementById(`preview-actor-${k}`);
    prev.style.display = 'none'; prev.src = '';
  });

  if (actor) {
    if (actor.icon) { setPreview('preview-actor-icon', actor.icon); document.getElementById('actor-icon-url').value = actor.icon; }
    if (actor.card_image) { setPreview('preview-actor-card', actor.card_image); document.getElementById('actor-card-url').value = actor.card_image; }
    if (actor.card_background) { setPreview('preview-actor-bg', actor.card_background); document.getElementById('actor-bg-url').value = actor.card_background; }
  }

  openModal('modal-actor');
}

async function saveActor(e) {
  e.preventDefault();
  const id = document.getElementById('actor-id').value;

  // Upload files first
  async function resolveUrl(fieldKey, inputId) {
    if (uploadedFiles[fieldKey]) return await uploadFile(uploadedFiles[fieldKey]);
    return document.getElementById(inputId).value || '';
  }

  const icon = await resolveUrl('actor-icon-url', 'actor-icon-url');
  const card_image = await resolveUrl('actor-card-url', 'actor-card-url');
  const card_background = await resolveUrl('actor-bg-url', 'actor-bg-url');

  const payload = {
    name: document.getElementById('actor-name').value,
    order: Number(document.getElementById('actor-order').value),
    icon, card_image, card_background
  };

  if (id) {
    await api('PUT', `/api/actors/${id}`, payload);
    toast('Ator atualizado com sucesso!', 'success');
  } else {
    await api('POST', '/api/actors', payload);
    toast('Ator criado com sucesso!', 'success');
  }

  closeModal('modal-actor');
  await loadData();
  renderActorsTable();
}

async function deleteActor(id) {
  await api('DELETE', `/api/actors/${id}`);
  closeModal('modal-confirm');
  toast('Ator excluído.', 'success');
  await loadData();
  renderActorsTable();
}

// ══════════════════════════════════════════════════════════
//  MOVIE MODAL
// ══════════════════════════════════════════════════════════
function openMovieModal(id) {
  uploadedFiles = {};
  const movie = id ? movies.find(m => m.id === id) : null;

  document.getElementById('movie-modal-title').textContent = movie ? 'Editar Filme' : 'Novo Filme';
  document.getElementById('movie-id').value = id || '';

  // populate actor select
  const sel = document.getElementById('movie-actor-id');
  sel.innerHTML = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

  if (movie) {
    sel.value = movie.actor_id;
    document.getElementById('movie-order').value = movie.order;
    document.getElementById('movie-title').value = movie.title;
    document.getElementById('movie-year').value = movie.year;
    document.getElementById('movie-director').value = movie.director;
    document.getElementById('movie-synopsis').value = movie.synopsis;
    document.getElementById('movie-trailer').value = movie.trailer_url || '';
    document.getElementById('movie-logo-url').value = movie.logo || '';
    document.getElementById('movie-bg-url').value = movie.background || '';

    if (movie.logo) setPreview('preview-movie-logo', movie.logo);
    if (movie.background) setPreview('preview-movie-bg', movie.background);

    // gallery
    const preview = document.getElementById('gallery-preview');
    preview.innerHTML = (movie.gallery || []).map(img => `<img src="${img}" alt="">`).join('');
    // store existing gallery urls
    document.getElementById('gallery-urls-container').innerHTML =
      (movie.gallery || []).map(url => `<input type="hidden" name="existing_gallery" value="${url}">`).join('');
  } else {
    ['movie-title','movie-year','movie-director','movie-synopsis','movie-trailer'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('movie-order').value = 1;
    document.getElementById('movie-logo-url').value = '';
    document.getElementById('movie-bg-url').value = '';
    ['preview-movie-logo','preview-movie-bg'].forEach(id => { const el = document.getElementById(id); el.style.display='none'; el.src=''; });
    document.getElementById('gallery-preview').innerHTML = '';
    document.getElementById('gallery-urls-container').innerHTML = '';
    document.getElementById('gallery-input').value = '';
  }

  openModal('modal-movie');
}

async function saveMovie(e) {
  e.preventDefault();
  const id = document.getElementById('movie-id').value;

  async function resolveUrl(fieldKey, inputId) {
    if (uploadedFiles[fieldKey]) return await uploadFile(uploadedFiles[fieldKey]);
    return document.getElementById(inputId).value || '';
  }

  const logo = await resolveUrl('movie-logo-url', 'movie-logo-url');
  const background = await resolveUrl('movie-bg-url', 'movie-bg-url');

  // Gallery: upload new files or keep existing
  let gallery = [];
  if (uploadedFiles['gallery'] && uploadedFiles['gallery'].length > 0) {
    gallery = await Promise.all(uploadedFiles['gallery'].map(f => uploadFile(f)));
  } else {
    // keep existing
    document.querySelectorAll('[name=existing_gallery]').forEach(inp => gallery.push(inp.value));
  }

  const payload = {
    actor_id: Number(document.getElementById('movie-actor-id').value),
    order: Number(document.getElementById('movie-order').value),
    title: document.getElementById('movie-title').value,
    year: Number(document.getElementById('movie-year').value),
    director: document.getElementById('movie-director').value,
    synopsis: document.getElementById('movie-synopsis').value,
    trailer_url: document.getElementById('movie-trailer').value,
    logo, background, gallery
  };

  if (id) {
    await api('PUT', `/api/movies/${id}`, payload);
    toast('Filme atualizado!', 'success');
  } else {
    await api('POST', '/api/movies', payload);
    toast('Filme criado!', 'success');
  }

  closeModal('modal-movie');
  await loadData();
  renderMoviesTable();
}

async function deleteMovie(id) {
  await api('DELETE', `/api/movies/${id}`);
  closeModal('modal-confirm');
  toast('Filme excluído.', 'success');
  await loadData();
  renderMoviesTable();
}

// ══════════════════════════════════════════════════════════
//  CONFIRM DELETE
// ══════════════════════════════════════════════════════════
function confirmDelete(type, name, callback) {
  document.getElementById('confirm-title').textContent = `Excluir ${type}?`;
  document.getElementById('confirm-message').textContent = `"${name}" será excluído permanentemente.`;
  const btn = document.getElementById('confirm-btn');
  btn.onclick = callback;
  openModal('modal-confirm');
}

// ══════════════════════════════════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});

// ══════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════
function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${type === 'success' ? '✅' : '❌'} ${message}`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ══════════════════════════════════════════════════════════
//  UTIL
// ══════════════════════════════════════════════════════════
function setPreview(id, url) {
  const el = document.getElementById(id);
  if (el) { el.src = url; el.style.display = 'block'; }
}

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
loadData().then(() => loadDashboard()).catch(console.error);
