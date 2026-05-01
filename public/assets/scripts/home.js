const ANGLES = [0, 120, 240, 360, 480]; // suporta até 5 atores

async function init() {
  const res = await fetch('/api/actors');
  const actors = await res.json();

  // Nav links — aranha fica no centro entre os atores
  const navList = document.getElementById('nav-list');
  const iconItem = navList.querySelector('.s-menu__icon');

  // Metade dos atores antes da aranha, metade depois
  const half = Math.floor(actors.length / 2);
  actors.forEach((actor, i) => {
    const li = document.createElement('li');
    li.className = 's-menu__item';
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = actor.name;
    fetch(`/api/actors/${actor.slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.movies && data.movies.length > 0) {
          a.href = `/movie/${data.movies[0].id}`;
        }
      });
    li.appendChild(a);
    if (i < half) {
      navList.insertBefore(li, iconItem); // antes da aranha
    } else {
      navList.appendChild(li); // depois da aranha
    }
  });

  // Cards carousel
  const carousel = document.getElementById('carousel');
  actors.forEach((actor, i) => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 's-card';
    a.id = `spider-man-0${i + 1}`;
    a.style.transform = `rotateY(${ANGLES[i]}deg) translateZ(50vw)`;

    fetch(`/api/actors/${actor.slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.movies && data.movies.length > 0) {
          a.href = `/movie/${data.movies[0].id}`;
        }
      });

    a.innerHTML = `
      <img class="s-card__background" src="${actor.card_background}" alt="">
      <img class="s-card__image" src="${actor.card_image}" alt="${actor.name}">
      <h2 class="s-card__title">${actor.name}</h2>
    `;
    carousel.appendChild(a);
  });

  // Controller dots
  const controller = document.getElementById('controller');
  const line = document.createElement('div');
  line.className = 's-controller__line';

  actors.forEach((_, i) => {
    const btn = document.createElement('div');
    btn.id = String(i + 1);
    btn.className = 's-controller__button' + (i === 0 ? ' s-controller__button--active' : '');
    btn.textContent = String(i + 1).padStart(2, '0');
    btn.onclick = function () { selectCarouselItem(this); };
    controller.appendChild(btn);
  });
  controller.appendChild(line);

  // Backgrounds dinâmicos para hover
  const style = document.createElement('style');
  actors.forEach((actor, i) => {
    style.textContent += `
      body#spider-man-0${i + 1}-hovered::before { background-image: url('${actor.card_background}'); }
    `;
  });
  document.head.appendChild(style);

  // Re-attach hover events após cards renderizados
  addEventListenersToCards();

  // Esconde loading
  document.getElementById('loading').classList.add('hidden');
}

init().catch(console.error);
