/* =============================================
   STATE
============================================= */
let allSources   = [];
let activeFilter = 'Tout';
let searchQuery  = '';
let sortByVotes  = false;
let viewMode     = 'grid'; // 'grid' | 'list'
let votes        = JSON.parse(localStorage.getItem('stash_votes') || '{}');
let favorites    = JSON.parse(localStorage.getItem('stash_favs')  || '{}');

/* =============================================
   CATEGORY COLOR MAP
============================================= */
const CAT_COLORS = {
  'Frontend':   'var(--cat-frontend)',
  'IA':         'var(--cat-ia)',
  'DevOps':     'var(--cat-devops)',
  'Design':     'var(--cat-design)',
  'Sécurité':   'var(--cat-securite)',
  'Actualités': 'var(--cat-actualites)',
  'Mobile':     'var(--cat-mobile)',
  'Backend':    'var(--cat-backend)',
};

function getCatColor(cat) {
  return CAT_COLORS[cat] || 'var(--cat-default)';
}

/* =============================================
   INIT — FETCH JSON
============================================= */
async function init() {
  try {
    const res  = await fetch('./sources.json');
    const data = await res.json();
    allSources = data.sources || [];
  } catch (e) {
    // Fallback: inline demo data si fetch échoue (protocole file://)
    allSources = DEMO_SOURCES;
  }

  document.getElementById('loading').style.display   = 'none';
  document.getElementById('grid').style.display      = 'grid';

  buildFilters();
  bindEvents();
  render();
}

/* =============================================
   BUILD CATEGORY FILTERS
============================================= */
function buildFilters() {
  const cats = [...new Set(allSources.map(s => s.category))].sort();
  const bar  = document.getElementById('filters');

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className      = 'filter-btn';
    btn.dataset.cat    = cat;
    btn.textContent    = cat;
    btn.style.color    = getCatColor(cat);
    bar.appendChild(btn);
  });
}

/* =============================================
   FILTER + SORT PIPELINE
============================================= */
function getFiltered() {
  let list = [...allSources];

  // Favorites filter
  if (activeFilter === 'Favoris') {
    list = list.filter(s => favorites[s.id]);
  } else if (activeFilter !== 'Tout') {
    list = list.filter(s => s.category === activeFilter);
  }

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort
  if (sortByVotes) {
    list.sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
  } else {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return list;
}

/* =============================================
   RENDER
============================================= */
function render() {
  const grid     = document.getElementById('grid');
  const filtered = getFiltered();

  // Update results info
  document.getElementById('results-info').innerHTML =
    `<span>${filtered.length}</span> source${filtered.length > 1 ? 's' : ''} affichée${filtered.length > 1 ? 's' : ''}`;

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-glyph">◎</div>
        <p>Aucune source trouvée</p>
      </div>`;
    return;
  }

  filtered.forEach((source, i) => {
    const card = buildCard(source, i);
    grid.appendChild(card);
  });
}

/* =============================================
   BUILD CARD
============================================= */
function buildCard(source, index) {
  const isFav     = !!favorites[source.id];
  const isVoted   = !!votes[source.id];
  const voteCount = votes[source.id] || 0;
  const catColor  = getCatColor(source.category);
  const favUrl    = `https://www.google.com/s2/favicons?domain=${source.url}&sz=64`;

  const card = document.createElement('div');
  card.className = `card card-enter ${source.featured ? 'featured' : ''}`;
  card.style.setProperty('--cat-color', catColor);
  card.style.animationDelay = `${index * 0.04}s`;

  const tagsHtml = (source.tags || [])
    .map(t => `<span class="tag">${t}</span>`)
    .join('');

  card.innerHTML = `
    <div class="card-header">
      <div class="card-favicon">
        <img
          src="${favUrl}"
          alt="${source.name}"
          onerror="this.parentElement.innerHTML='◈'"
          loading="lazy"
        />
      </div>
      <div class="card-title-block">
        <div class="card-name">${source.name}</div>
        <div class="card-cat">${source.category}</div>
      </div>
    </div>

    <p class="card-desc">${source.description}</p>

    <div class="card-tags">${tagsHtml}</div>

    <div class="card-footer">
      <div class="card-actions">
        <button
          class="action-btn upvote-btn ${isVoted ? 'voted' : ''}"
          data-id="${source.id}"
          title="${isVoted ? 'Retirer le vote' : 'Upvoter'}"
        >
          ▲ <span class="vote-count">${voteCount}</span>
        </button>
        <button
          class="action-btn fav-btn ${isFav ? 'favorited' : ''}"
          data-id="${source.id}"
          title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
        >
          ${isFav ? '❤' : '♡'}
        </button>
      </div>
      <a class="visit-link" href="${source.url}" target="_blank" rel="noopener">
        Visiter ↗
      </a>
    </div>
  `;

  // Upvote
  card.querySelector('.upvote-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleVote(source.id);
  });

  // Favorite
  card.querySelector('.fav-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFav(source.id);
  });

  return card;
}

/* =============================================
   UPVOTE
============================================= */
function toggleVote(id) {
  if (votes[id]) {
    delete votes[id];
  } else {
    votes[id] = (votes[id] || 0) + 1;
  }
  localStorage.setItem('stash_votes', JSON.stringify(votes));
  render();
}

/* =============================================
   FAVORITES
============================================= */
function toggleFav(id) {
  if (favorites[id]) {
    delete favorites[id];
  } else {
    favorites[id] = true;
  }
  localStorage.setItem('stash_favs', JSON.stringify(favorites));
  render();
}

/* =============================================
   EXPORT
============================================= */
function exportView() {
  const filtered = getFiltered();

  const mdLines = [
    '# STASH — Export de veille',
    `> ${filtered.length} source(s) exportée(s)`,
    '',
    ...filtered.map(s => [
      `## ${s.name}`,
      `- **URL** : ${s.url}`,
      `- **Catégorie** : ${s.category}`,
      `- **Tags** : ${(s.tags || []).join(', ')}`,
      `- **Description** : ${s.description}`,
      `- **Votes** : ${votes[s.id] || 0}`,
      '',
    ].join('\n'))
  ].join('\n');

  const blob = new Blob([mdLines], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `stash-export-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`✓ ${filtered.length} source(s) exportée(s) en Markdown`);
}

/* =============================================
   TOAST
============================================= */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* =============================================
   BIND EVENTS
============================================= */
function bindEvents() {
  // Search
  document.getElementById('search').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    render();
  });

  // Filters
  document.getElementById('filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.cat;
    render();
  });

  // Sort
  document.getElementById('sort-btn').addEventListener('click', () => {
    sortByVotes = !sortByVotes;
    document.getElementById('sort-label').textContent = sortByVotes ? 'Par votes' : 'Alphabétique';
    document.getElementById('sort-btn').classList.toggle('active', sortByVotes);
    render();
  });

  // View toggle
  document.getElementById('view-btn').addEventListener('click', () => {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    const grid = document.getElementById('grid');
    grid.classList.toggle('list-view', viewMode === 'list');
    document.getElementById('view-icon').textContent = viewMode === 'grid' ? '⊞' : '≡';
    document.getElementById('view-btn').classList.toggle('active', viewMode === 'list');
  });

  // Export
  document.getElementById('export-btn').addEventListener('click', exportView);
}

/* =============================================
   FALLBACK DEMO DATA (pour usage en file://)
============================================= */
const DEMO_SOURCES = [
  { id:'001', name:'Smashing Magazine', url:'https://smashingmagazine.com', description:'Référence incontournable sur le frontend, l\'UX et le design web.', category:'Frontend', tags:['CSS','UX','Performance'], featured:true },
  { id:'002', name:'CSS-Tricks', url:'https://css-tricks.com', description:'Le meilleur endroit pour apprendre CSS en profondeur.', category:'Frontend', tags:['CSS','HTML','JavaScript'], featured:false },
  { id:'003', name:'Hacker News', url:'https://news.ycombinator.com', description:'Agrégateur communautaire de Y Combinator. Discussions techniques de haute qualité.', category:'Actualités', tags:['Community','Startups','Programming'], featured:true },
  { id:'004', name:'Hugging Face Blog', url:'https://huggingface.co/blog', description:'Articles techniques sur les modèles open-source et les avancées en NLP.', category:'IA', tags:['LLM','NLP','Open Source'], featured:true },
  { id:'005', name:'The New Stack', url:'https://thenewstack.io', description:'Couverture approfondie du cloud natif, Kubernetes et DevOps.', category:'DevOps', tags:['Kubernetes','Cloud','CI/CD'], featured:false },
];

/* =============================================
   START
============================================= */
init();
