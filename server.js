const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ── Middlewares ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos: pasta public + uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Upload de imagens (multer) ─────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  }
});

// ── Database ───────────────────────────────────────────────────────
const db = require('./data/db');

// ══════════════════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════════════════

// ── GET /api/actors ───────────────────────────────────────────────
app.get('/api/actors', (req, res) => {
  const actors = db.get('actors').orderBy('order').value();
  res.json(actors);
});

// ── GET /api/actors/:slug ─────────────────────────────────────────
app.get('/api/actors/:slug', (req, res) => {
  const actor = db.get('actors').find({ slug: req.params.slug }).value();
  if (!actor) return res.status(404).json({ error: 'Ator não encontrado' });
  const movies = db.get('movies').filter({ actor_id: actor.id }).orderBy('order').value();
  res.json({ ...actor, movies });
});

// ── GET /api/movies ───────────────────────────────────────────────
app.get('/api/movies', (req, res) => {
  const movies = db.get('movies').orderBy(['actor_id', 'order']).value();
  res.json(movies);
});

// ── GET /api/movies/:id ───────────────────────────────────────────
app.get('/api/movies/:id', (req, res) => {
  const movie = db.get('movies').find({ id: Number(req.params.id) }).value();
  if (!movie) return res.status(404).json({ error: 'Filme não encontrado' });
  res.json(movie);
});

// ── POST /api/actors ──────────────────────────────────────────────
app.post('/api/actors', upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'card_image', maxCount: 1 },
  { name: 'card_background', maxCount: 1 }
]), (req, res) => {
  const actors = db.get('actors').value();
  const newId = actors.length > 0 ? Math.max(...actors.map(a => a.id)) + 1 : 1;
  const maxOrder = actors.length > 0 ? Math.max(...actors.map(a => a.order)) + 1 : 1;

  const actor = {
    id: newId,
    name: req.body.name,
    slug: req.body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    icon: req.files['icon'] ? '/uploads/' + req.files['icon'][0].filename : req.body.icon || '',
    card_image: req.files['card_image'] ? '/uploads/' + req.files['card_image'][0].filename : req.body.card_image || '',
    card_background: req.files['card_background'] ? '/uploads/' + req.files['card_background'][0].filename : req.body.card_background || '',
    order: maxOrder
  };

  db.get('actors').push(actor).write();
  res.status(201).json(actor);
});

// ── PUT /api/actors/:id ───────────────────────────────────────────
app.put('/api/actors/:id', upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'card_image', maxCount: 1 },
  { name: 'card_background', maxCount: 1 }
]), (req, res) => {
  const id = Number(req.params.id);
  const actor = db.get('actors').find({ id }).value();
  if (!actor) return res.status(404).json({ error: 'Ator não encontrado' });

  const updates = {
    name: req.body.name || actor.name,
    slug: req.body.name
      ? req.body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : actor.slug,
    icon: req.files['icon'] ? '/uploads/' + req.files['icon'][0].filename : req.body.icon || actor.icon,
    card_image: req.files['card_image'] ? '/uploads/' + req.files['card_image'][0].filename : req.body.card_image || actor.card_image,
    card_background: req.files['card_background'] ? '/uploads/' + req.files['card_background'][0].filename : req.body.card_background || actor.card_background,
    order: req.body.order ? Number(req.body.order) : actor.order
  };

  db.get('actors').find({ id }).assign(updates).write();
  res.json(db.get('actors').find({ id }).value());
});

// ── DELETE /api/actors/:id ────────────────────────────────────────
app.delete('/api/actors/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get('actors').remove({ id }).write();
  db.get('movies').remove({ actor_id: id }).write();
  res.json({ success: true });
});

// ── POST /api/movies ──────────────────────────────────────────────
app.post('/api/movies', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'background', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), (req, res) => {
  const movies = db.get('movies').value();
  const newId = movies.length > 0 ? Math.max(...movies.map(m => m.id)) + 1 : 1;
  const actorId = Number(req.body.actor_id);
  const actorMovies = db.get('movies').filter({ actor_id: actorId }).value();
  const maxOrder = actorMovies.length > 0 ? Math.max(...actorMovies.map(m => m.order)) + 1 : 1;

  let gallery = [];
  if (req.files['gallery']) {
    gallery = req.files['gallery'].map(f => '/uploads/' + f.filename);
  } else if (req.body.gallery) {
    gallery = Array.isArray(req.body.gallery) ? req.body.gallery : [req.body.gallery];
  }

  const movie = {
    id: newId,
    actor_id: actorId,
    order: maxOrder,
    title: req.body.title,
    year: Number(req.body.year),
    director: req.body.director,
    trailer_url: req.body.trailer_url || '',
    synopsis: req.body.synopsis,
    logo: req.files['logo'] ? '/uploads/' + req.files['logo'][0].filename : req.body.logo || '',
    background: req.files['background'] ? '/uploads/' + req.files['background'][0].filename : req.body.background || '',
    gallery
  };

  db.get('movies').push(movie).write();
  res.status(201).json(movie);
});

// ── PUT /api/movies/:id ───────────────────────────────────────────
app.put('/api/movies/:id', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'background', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), (req, res) => {
  const id = Number(req.params.id);
  const movie = db.get('movies').find({ id }).value();
  if (!movie) return res.status(404).json({ error: 'Filme não encontrado' });

  let gallery = movie.gallery;
  if (req.files['gallery']) {
    gallery = req.files['gallery'].map(f => '/uploads/' + f.filename);
  } else if (req.body.gallery) {
    gallery = Array.isArray(req.body.gallery) ? req.body.gallery : [req.body.gallery];
  }

  const updates = {
    title: req.body.title || movie.title,
    year: req.body.year ? Number(req.body.year) : movie.year,
    director: req.body.director || movie.director,
    trailer_url: req.body.trailer_url !== undefined ? req.body.trailer_url : movie.trailer_url,
    synopsis: req.body.synopsis || movie.synopsis,
    logo: req.files['logo'] ? '/uploads/' + req.files['logo'][0].filename : req.body.logo || movie.logo,
    background: req.files['background'] ? '/uploads/' + req.files['background'][0].filename : req.body.background || movie.background,
    gallery,
    order: req.body.order ? Number(req.body.order) : movie.order,
    actor_id: req.body.actor_id ? Number(req.body.actor_id) : movie.actor_id
  };

  db.get('movies').find({ id }).assign(updates).write();
  res.json(db.get('movies').find({ id }).value());
});

// ── DELETE /api/movies/:id ────────────────────────────────────────
app.delete('/api/movies/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get('movies').remove({ id }).write();
  res.json({ success: true });
});

// ── POST /api/upload ──────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// ══════════════════════════════════════════════════════════════════
//  FRONTEND ROUTES  (SPA-style — serve HTML, JS busca dados da API)
// ══════════════════════════════════════════════════════════════════
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/movie/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'movie.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin/{*splat}', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🕷️  Spider-Man Multiverses rodando em http://localhost:${PORT}`);
  console.log(`📺  Site:  http://localhost:${PORT}`);
  console.log(`⚙️   Admin: http://localhost:${PORT}/admin`);
  console.log(`🔌  API:   http://localhost:${PORT}/api/movies\n`);
});
