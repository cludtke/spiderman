const movieId = Number(window.location.pathname.split('/').pop());

async function loadMovie() {
  const [movieRes, actorRes] = await Promise.all([
    fetch(`/api/movies/${movieId}`),
    fetch('/api/actors')
  ]);
  const movie = await movieRes.json();
  const allActors = await actorRes.json();

  if (movie.error) {
    document.body.innerHTML = '<h1 style="color:white;padding:2rem">Filme não encontrado</h1>';
    return;
  }

  // Encontra o ator do filme
  const actor = allActors.find(a => a.id === movie.actor_id) || {};

  // Todos os filmes do mesmo ator
  const actorRes2 = await fetch(`/api/actors/${actor.slug}`);
  const actorData = await actorRes2.json();
  const siblingMovies = actorData.movies || [];

  // Título da página
  document.title = `${movie.title} | Spider-Man Multiversos`;

  // Background na camada separada
  if (movie.background) {
    document.getElementById('bg-layer').style.backgroundImage = `url(${movie.background})`;
  }

  // Ícone do ator no navegador lateral
  if (actor.icon) document.getElementById('nav-icon').src = actor.icon;

  // Botões de navegação entre filmes do mesmo ator
  const navMovies = document.getElementById('nav-movies');
  siblingMovies.forEach(m => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/movie/${m.id}`;
    a.textContent = String(m.order).padStart(2, '0');
    if (m.id === movieId) a.className = 'active';
    li.appendChild(a);
    navMovies.appendChild(li);
  });

  // Logo do filme
  const logo = document.getElementById('movie-logo');
  logo.src = movie.logo;
  logo.alt = movie.title;

  // Pills: ano e diretor
  document.getElementById('movie-pills').innerHTML =
    `<li>Ano: ${movie.year}</li><li>Diretor: ${movie.director}</li>`;

  // Sinopse
  document.getElementById('movie-synopsis').innerHTML =
    `<strong>Sinopse:</strong>&nbsp;${movie.synopsis}`;

  // Link do trailer
  if (movie.trailer_url) {
    document.getElementById('movie-links').innerHTML = `
      <li>
        <a href="${movie.trailer_url}" class="link-button" target="_blank">
          <span class="icon"><div class="play-icon">&nbsp;</div></span>
          <span class="label">Assistir trailer</span>
        </a>
      </li>`;
  }

  // Galeria
  const gallery = document.getElementById('movie-gallery');
  (movie.gallery || []).forEach(img => {
    gallery.innerHTML += `
      <li>
        <a data-fancybox href="${img}">
          <img src="${img}" alt="">
        </a>
      </li>`;
  });

  Fancybox.bind('[data-fancybox]');
  document.getElementById('loading').classList.add('hidden');
}

loadMovie().catch(console.error);
