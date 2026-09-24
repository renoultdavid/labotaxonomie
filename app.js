// ========================================================
// OBSERVATOIRE DU VIVANT • APPLICATION LOGIC
// ========================================================
let globalSpeciesData = null;
let currentResultsList = [];
let resultsViewMode = 'gallery';

// Dictionnaire de traduction vernaculaire
const vernMap = {
  'Animalia': 'Animaux',
  'Plantae': 'Végétaux / Plantes',
  'Fungi': 'Champignons',
  'Arthropoda': 'Arthropodes',
  'Chordata': 'Chordés / Vertébrés',
  'Mollusca': 'Mollusques',
  'Annelida': 'Vers annelés',
  'Cnidaria': 'Méduses, Anémones & Coraux',
  'Echinodermata': 'Oursins & Étoiles de mer',
  'Porifera': 'Éponges',
  'Bryozoa': 'Bryozoaires',
  'Insecta': 'Insectes',
  'Arachnida': 'Arachnides',
  'Aves': 'Oiseaux',
  'Mammalia': 'Mammifères',
  'Reptilia': 'Reptiles',
  'Amphibia': 'Amphibiens',
  'Actinopterygii': 'Poissons osseux',
  'Elasmobranchii': 'Requins & Raies',
  'Malacostraca': 'Crustacés',
  'Gastropoda': 'Escargots & Limaces',
  'Bivalvia': 'Bivalves',
  'Lepidoptera': 'Papillons',
  'Coleoptera': 'Coléoptères',
  'Araneae': 'Araignées',
  'Odonata': 'Libellules & Demoiselles',
  'Hymenoptera': 'Abeilles, Guêpes & Fourmis',
  'Diptera': 'Mouches & Moustiques',
  'Hemiptera': 'Punaises & Cigales',
  'Orthoptera': 'Criquets, Sauterelles & Grillons',
  'Mantodea': 'Mantes',
  'Phasmida': 'Phasmes',
  'Mytilida': 'Moules',
  'Pectinida': 'Pectens & Coquilles',
  'Venerida': 'Palourdes & Praires',
  'Passeriformes': 'Passereaux',
  'Falconiformes': 'Faucons',
  'Accipitriformes': 'Rapaces diurnes',
  'Carnivora': 'Carnivores',
  'Rodentia': 'Rongeurs',
  'Chiroptera': 'Chauves-souris',
  'Cetacea': 'Cétacés (Dauphins & Baleines)',
  'Squamata': 'Lézards & Serpents',
  'Testudines': 'Tortues',
  'Anura': 'Grenouilles & Crapauds',
  'Urodela': 'Salamandres & Tritons',
  'Orchidaceae': 'Orchidées'
};

// Nettoyage de chaîne pour la recherche
function normalizeStr(str) {
  return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Chargement initial
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    globalSpeciesData = data;
    document.getElementById('treeTotalCount').innerText = `${data.length.toLocaleString('fr-FR')} espèces`;
    initDeepExpertTree();
  })
  .catch(err => console.warn('Erreur data.json...', err));

// Navigation plein écran
function openModule(moduleId) {
  document.getElementById('homeScreen').classList.add('hidden');
  document.getElementById(moduleId).classList.add('active');
  
  if (moduleId === 'module2') {
    initObservationsWorkspace();
  }
}

function backToHome() {
  document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active'));
  document.getElementById('homeScreen').classList.remove('hidden');
}

function switchModuleTab(moduleId, tabIndex) {
  const module = document.getElementById(moduleId);
  const tabs = module.querySelectorAll('.tab-btn');
  tabs.forEach((tab, idx) => tab.classList.toggle('active', idx === tabIndex));
  const views = module.querySelectorAll('.module-view');
  views.forEach((view, idx) => view.classList.toggle('active', idx === tabIndex));

  if (moduleId === 'module1' && tabIndex === 1) {
    setTimeout(initGeoMapWorkspace, 50);
  } else if (moduleId === 'module1' && tabIndex === 2) {
    initVisualWorkspace();
  } else if (moduleId === 'module2' && tabIndex === 0) {
    initObservationsWorkspace();
  } else if (moduleId === 'module2' && tabIndex === 1) {
    initStatsDashboard();
  }
}

// ========================================================
// 1. MODULE 1 - ONGLET 1 : ARBRE EXPERT
// ========================================================
function initDeepExpertTree() {
  if (!globalSpeciesData) return;
  const treeContainer = document.getElementById('expertTreeContainer');
  treeContainer.innerHTML = '';

  const kingdoms = {};
  globalSpeciesData.forEach(sp => {
    const k = sp.taxonomy.kingdom || 'Incertae sedis';
    kingdoms[k] = (kingdoms[k] || 0) + 1;
  });

  const fragment = document.createDocumentFragment();
  Object.keys(kingdoms).sort().forEach(k => {
    const node = createDynamicNode('kingdom', k, kingdoms[k], { kingdom: k });
    fragment.appendChild(node);
  });

  treeContainer.appendChild(fragment);
  renderExpertResults(null, null);
}

function createDynamicNode(rank, name, count, pathContext) {
  const div = document.createElement('div');
  div.className = 'taxo-node';

  const label = document.createElement('div');
  label.className = 'taxo-label';
  label.innerHTML = `
    <div class="taxo-names">
      <span class="taxo-latin">${name}</span>
      <span class="taxo-vern">${vernMap[name] ? '— ' + vernMap[name] : ''}</span>
    </div>
    <span class="taxo-badge">${count}</span>
  `;

  const children = document.createElement('div');
  children.className = 'taxo-children';
  let isLoaded = false;

  label.onclick = (e) => {
    e.stopPropagation();
    highlightLabel(label);
    document.getElementById('expertTreeSearch').value = '';
    renderExpertResults(rank, name, pathContext);

    if (rank === 'species') return;

    if (!isLoaded) {
      loadNextRankChildren(rank, pathContext, children);
      isLoaded = true;
    }
    children.classList.toggle('open');
  };

  div.appendChild(label);
  div.appendChild(children);
  return div;
}

function loadNextRankChildren(currentRank, pathContext, container) {
  const rankOrder = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
  const nextIdx = rankOrder.indexOf(currentRank) + 1;
  if (nextIdx >= rankOrder.length) return;
  const nextRank = rankOrder[nextIdx];

  let scoped = globalSpeciesData;
  for (const k in pathContext) {
    if (k === 'species') scoped = scoped.filter(s => s.scientific_name === pathContext[k]);
    else scoped = scoped.filter(s => s.taxonomy[k] === pathContext[k]);
  }

  const groups = {};
  scoped.forEach(sp => {
    let val = (nextRank === 'species') ? sp.scientific_name : (sp.taxonomy[nextRank] || `${nextRank} indét.`);
    groups[val] = (groups[val] || 0) + 1;
  });

  const fragment = document.createDocumentFragment();
  Object.keys(groups).sort().forEach(subName => {
    const subContext = { ...pathContext, [nextRank]: subName };
    const childNode = createDynamicNode(nextRank, subName, groups[subName], subContext);
    fragment.appendChild(childNode);
  });

  container.appendChild(fragment);
}

function highlightLabel(labelEl) {
  document.querySelectorAll('.taxo-label').forEach(l => l.classList.remove('active'));
  labelEl.classList.add('active');
}

function setResultsViewMode(mode) {
  resultsViewMode = mode;
  document.getElementById('btnViewGallery').classList.toggle('active', mode === 'gallery');
  document.getElementById('btnViewList').classList.toggle('active', mode === 'list');
  renderResultsDOM();
}

function renderExpertResults(rank, value, pathContext) {
  if (!globalSpeciesData) return;
  if (rank && value) {
    let filtered = globalSpeciesData;
    if (pathContext) {
      for (const k in pathContext) {
        if (k === 'species') filtered = filtered.filter(s => s.scientific_name === pathContext[k]);
        else filtered = filtered.filter(s => s.taxonomy[k] === pathContext[k]);
      }
    } else {
      if (rank === 'species') filtered = filtered.filter(s => s.scientific_name === value);
      else filtered = filtered.filter(s => s.taxonomy[rank] === value);
    }
    currentResultsList = filtered;
    document.getElementById('resultsFilterTitle').innerText = `${rank.toUpperCase()} : ${value} ${vernMap[value] ? '(' + vernMap[value] + ')' : ''}`;
  } else {
    currentResultsList = globalSpeciesData;
    document.getElementById('resultsFilterTitle').innerText = 'Ensemble des espèces répertoriées';
  }

  document.getElementById('resultsCountBadge').innerText = `${currentResultsList.length.toLocaleString('fr-FR')} espèce(s)`;
  renderResultsDOM();
}

function renderResultsDOM() {
  const container = document.getElementById('expertResultsWrapper');
  container.innerHTML = '';
  const slice = currentResultsList.slice(0, 100);
  const fragment = document.createDocumentFragment();

  if (resultsViewMode === 'gallery') {
    const galleryDiv = document.createElement('div');
    galleryDiv.className = 'results-gallery-mode';

    slice.forEach(sp => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.onclick = () => alert(`Super-Fiche bientôt active pour : ${sp.scientific_name}`);
      const thumb = sp.photo_url || 'https://via.placeholder.com/200x200/080c14/475569?text=?';

      card.innerHTML = `
        <img class="gallery-photo" src="${thumb}" alt="${sp.scientific_name}" loading="lazy" />
        <div class="gallery-overlay"></div>
        <div class="gallery-text">
          <span class="gallery-latin">${sp.scientific_name}</span>
          <span class="gallery-vern">${sp.common_name || sp.taxonomy.genus || ''}</span>
        </div>
      `;
      galleryDiv.appendChild(card);
    });
    fragment.appendChild(galleryDiv);
  } else {
    const listDiv = document.createElement('div');
    listDiv.className = 'results-list-mode';

    slice.forEach(sp => {
      const row = document.createElement('div');
      row.className = 'species-row';
      row.onclick = () => alert(`Super-Fiche bientôt active pour : ${sp.scientific_name}`);
      const thumb = sp.photo_url || 'https://via.placeholder.com/80x80/080c14/475569?text=?';

      row.innerHTML = `
        <div class="species-left">
          <img class="species-mini-thumb" src="${thumb}" alt="${sp.scientific_name}" loading="lazy" />
          <div class="species-text">
            <span class="species-latin">${sp.scientific_name}</span>
            <span class="species-vernacular">${sp.common_name || sp.taxonomy.family || 'Taxon validé'}</span>
          </div>
        </div>
        <button class="btn-open-fiche">Fiche</button>
      `;
      listDiv.appendChild(row);
    });
    fragment.appendChild(listDiv);
  }

  container.appendChild(fragment);
  container.scrollTop = 0;
}

document.getElementById('expertTreeSearch').addEventListener('input', (e) => {
  if (!globalSpeciesData) return;
  const rawTokens = normalizeStr(e.target.value).split(/\s+/).filter(Boolean);

  if (rawTokens.length === 0) {
    renderExpertResults(null, null);
    return;
  }

  currentResultsList = globalSpeciesData.filter(sp => {
    const fullSearchable = normalizeStr(`${sp.scientific_name} ${sp.common_name || ''} ${sp.taxonomy.genus || ''} ${sp.taxonomy.family || ''} ${sp.taxonomy.order || ''}`);
    return rawTokens.every(tok => fullSearchable.includes(tok));
  });

  document.getElementById('resultsFilterTitle').innerText = `Recherche : "${e.target.value}"`;
  document.getElementById('resultsCountBadge').innerText = `${currentResultsList.length.toLocaleString('fr-FR')} résultat(s)`;
  renderResultsDOM();
});

// ========================================================
// 2. MODULE 1 - ONGLET 2 : GÉOGRAPHIE 2D (CLUSTERS)
// ========================================================
let geoMap = null;
let clusterGroup = null;
let activeGeoGroups = new Set(['all', 'Aves', 'Lepidoptera', 'Coleoptera', 'Araneae', 'Reptilia', 'Amphibia', 'Mammalia', 'Fish', 'Plantae', 'Fungi', 'Other']);
let geoSearchFilterText = '';

const groupMeta = {
  'Aves': { icon: '🦅', color: '#38bdf8', match: sp => sp.taxonomy.class === 'Aves' },
  'Lepidoptera': { icon: '🦋', color: '#ec4899', match: sp => sp.taxonomy.order === 'Lepidoptera' },
  'Coleoptera': { icon: '🐞', color: '#eab308', match: sp => sp.taxonomy.order === 'Coleoptera' },
  'Araneae': { icon: '🕷️', color: '#a855f7', match: sp => sp.taxonomy.order === 'Araneae' },
  'Reptilia': { icon: '🦎', color: '#10b981', match: sp => sp.taxonomy.class === 'Reptilia' },
  'Amphibia': { icon: '🐸', color: '#34d399', match: sp => sp.taxonomy.class === 'Amphibia' },
  'Mammalia': { icon: '🐾', color: '#f97316', match: sp => sp.taxonomy.class === 'Mammalia' },
  'Fish': { icon: '🐟', color: '#06b6d4', match: sp => ['Actinopterygii', 'Elasmobranchii', 'Chondrichthyes'].includes(sp.taxonomy.class) },
  'Plantae': { icon: '🌿', color: '#84cc16', match: sp => sp.taxonomy.kingdom === 'Plantae' },
  'Fungi': { icon: '🍄', color: '#d97706', match: sp => sp.taxonomy.kingdom === 'Fungi' },
  'Other': { icon: '🔬', color: '#818cf8', match: () => true }
};

function getSpeciesGroupKey(sp) {
  for (const key in groupMeta) {
    if (key !== 'Other' && groupMeta[key].match(sp)) return key;
  }
  return 'Other';
}

function initGeoMapWorkspace() {
  if (!geoMap) {
    geoMap = L.map('geoMapLeaflet').setView([42.5, 9.3], 5);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    }).addTo(geoMap);

    clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 45
    });
    geoMap.addLayer(clusterGroup);
    geoMap.on('moveend', syncGeoRightPane);

    document.querySelectorAll('.geo-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const grp = btn.dataset.group;
        if (grp === 'all') {
          const shouldActivateAll = !btn.classList.contains('active');
          document.querySelectorAll('.geo-filter-pill').forEach(b => b.classList.toggle('active', shouldActivateAll));
          if (shouldActivateAll) {
            activeGeoGroups = new Set(['all', 'Aves', 'Lepidoptera', 'Coleoptera', 'Araneae', 'Reptilia', 'Amphibia', 'Mammalia', 'Fish', 'Plantae', 'Fungi', 'Other']);
          } else {
            activeGeoGroups.clear();
          }
        } else {
          btn.classList.toggle('active');
          if (btn.classList.contains('active')) activeGeoGroups.add(grp);
          else {
            activeGeoGroups.delete(grp);
            document.querySelector('[data-group="all"]').classList.remove('active');
          }
        }
        populateGeoMarkers();
      });
    });

    const searchInput = document.getElementById('geoFreeSearch');
    searchInput.addEventListener('input', (e) => {
      geoSearchFilterText = normalizeStr(e.target.value);
      populateGeoMarkers();
    });

    document.getElementById('geoResetSearchBtn').addEventListener('click', () => {
      searchInput.value = '';
      geoSearchFilterText = '';
      populateGeoMarkers();
    });
  }

  geoMap.invalidateSize();
  populateGeoMarkers();
}

function populateGeoMarkers() {
  if (!globalSpeciesData || !clusterGroup) return;
  clusterGroup.clearLayers();

  const markers = [];
  const searchTokens = geoSearchFilterText.split(/\s+/).filter(Boolean);

  globalSpeciesData.forEach(sp => {
    if (!sp.coordinates || !sp.coordinates.lat || !sp.coordinates.lng) return;

    const gKey = getSpeciesGroupKey(sp);
    if (!activeGeoGroups.has('all') && !activeGeoGroups.has(gKey)) return;

    if (searchTokens.length > 0) {
      const searchable = normalizeStr(`${sp.scientific_name} ${sp.common_name || ''} ${sp.taxonomy.phylum || ''} ${sp.taxonomy.family || ''} ${sp.taxonomy.class || ''} ${sp.taxonomy.kingdom || ''}`);
      const matchAll = searchTokens.every(tok => {
        if (tok === 'eponge' || tok === 'eponges') return searchable.includes('porifera') || searchable.includes('eponge');
        return searchable.includes(tok);
      });
      if (!matchAll) return;
    }

    const meta = groupMeta[gKey] || groupMeta['Other'];
    const customIcon = L.divIcon({
      className: 'geo-custom-pin',
      html: `<div class="geo-marker-pin" style="background:${meta.color};">${meta.icon}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([sp.coordinates.lat, sp.coordinates.lng], { icon: customIcon });
    marker.speciesData = sp;
    marker.bindPopup(`
      <img class="geo-pop-img" src="${sp.photo_url || ''}" alt="" />
      <div class="geo-pop-body">
        <div class="geo-pop-sci">${sp.scientific_name}</div>
        <div class="geo-pop-vern">${sp.common_name || sp.taxonomy.family || ''}</div>
        <div style="font-size:0.7rem; color:#94a3b8; margin-top:0.3rem;">${sp.place || 'Station de relevé'}</div>
      </div>
    `);

    markers.push(marker);
  });

  clusterGroup.addLayers(markers);
  syncGeoRightPane();
}

function syncGeoRightPane() {
  if (!geoMap || !globalSpeciesData) return;
  const bounds = geoMap.getBounds();
  const searchTokens = geoSearchFilterText.split(/\s+/).filter(Boolean);

  const visibleSpecies = [];
  const seenIds = new Set();

  globalSpeciesData.forEach(sp => {
    if (!sp.coordinates || !sp.coordinates.lat || !sp.coordinates.lng) return;
    const gKey = getSpeciesGroupKey(sp);
    if (!activeGeoGroups.has('all') && !activeGeoGroups.has(gKey)) return;

    if (searchTokens.length > 0) {
      const searchable = normalizeStr(`${sp.scientific_name} ${sp.common_name || ''} ${sp.taxonomy.phylum || ''} ${sp.taxonomy.family || ''} ${sp.taxonomy.class || ''} ${sp.taxonomy.kingdom || ''}`);
      const matchAll = searchTokens.every(tok => {
        if (tok === 'eponge' || tok === 'eponges') return searchable.includes('porifera') || searchable.includes('eponge');
        return searchable.includes(tok);
      });
      if (!matchAll) return;
    }

    if (bounds.contains([sp.coordinates.lat, sp.coordinates.lng])) {
      if (!seenIds.has(sp.id)) {
        seenIds.add(sp.id);
        visibleSpecies.push(sp);
      }
    }
  });

  document.getElementById('geoVisibleCount').innerText = `${visibleSpecies.length.toLocaleString('fr-FR')} espèce(s)`;
  const container = document.getElementById('geoCardsContainer');
  container.innerHTML = '';
  const slice = visibleSpecies.slice(0, 80);
  const fragment = document.createDocumentFragment();

  slice.forEach(sp => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.onclick = () => alert(`Super-Fiche bientôt active pour : ${sp.scientific_name}`);
    const thumb = sp.photo_url || 'https://via.placeholder.com/200x200/080c14/475569?text=?';

    card.innerHTML = `
      <img class="gallery-photo" src="${thumb}" alt="${sp.scientific_name}" loading="lazy" />
      <div class="gallery-overlay"></div>
      <div class="gallery-text">
        <span class="gallery-latin">${sp.scientific_name}</span>
        <span class="gallery-vern">${sp.common_name || sp.place || ''}</span>
      </div>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

// ========================================================
// 3. MODULE 1 - ONGLET 3 : RECHERCHE VISUELLE
// ========================================================
const visualTree = [
  {
    id: 'birds',
    title: '🦅 Les Oiseaux',
    desc: 'Passereaux, rapaces, échassiers et oiseaux marins',
    filter: sp => sp.taxonomy.class === 'Aves',
    subgroups: [
      { id: 'passerines', title: 'Passereaux & Petits chanteurs', desc: 'Mésanges, pinsons, fauvettes...', filter: sp => sp.taxonomy.order === 'Passeriformes' },
      { id: 'raptors', title: 'Rapaces & Chasseurs du ciel', desc: 'Aigles, faucons, milans, chouettes...', filter: sp => ['Accipitriformes', 'Falconiformes', 'Strigiformes'].includes(sp.taxonomy.order) },
      { id: 'waterbirds', title: 'Oiseaux d’eau & Échassiers', desc: 'Hérons, canards, mouettes...', filter: sp => ['Anseriformes', 'Pelecaniformes', 'Charadriiformes'].includes(sp.taxonomy.order) },
      { id: 'other_birds', title: 'Autres oiseaux', desc: 'Pics, pigeons, martinets...', filter: sp => !['Passeriformes', 'Accipitriformes', 'Falconiformes', 'Strigiformes', 'Anseriformes', 'Pelecaniformes', 'Charadriiformes'].includes(sp.taxonomy.order) }
    ]
  },
  {
    id: 'mammals',
    title: '🐾 Les Mammifères',
    desc: 'Carnivores, rongeurs, chauves-souris et cétacés',
    filter: sp => sp.taxonomy.class === 'Mammalia',
    subgroups: [
      { id: 'carnivores', title: 'Félins & Carnivores', desc: 'Renards, belettes, chats sauvages...', filter: sp => sp.taxonomy.order === 'Carnivora' },
      { id: 'rodents', title: 'Rongeurs & Lièvres', desc: 'Écureuils, lérots, lièvres...', filter: sp => ['Rodentia', 'Lagomorpha'].includes(sp.taxonomy.order) },
      { id: 'bats', title: 'Chauves-souris', desc: 'Rhinolophes, pipistrelles...', filter: sp => sp.taxonomy.order === 'Chiroptera' },
      { id: 'cetaceans', title: 'Dauphins & Baleines', desc: 'Cétacés du large...', filter: sp => sp.taxonomy.order === 'Cetacea' || (sp.taxonomy.order === 'Artiodactyla' && (sp.common_name||'').toLowerCase().includes('dauphin')) },
      { id: 'ungulates', title: 'Grands ongulés', desc: 'Cerfs, sangliers, mouflons...', filter: sp => ['Artiodactyla', 'Perissodactyla'].includes(sp.taxonomy.order) && !(sp.common_name||'').toLowerCase().includes('dauphin') }
    ]
  },
  {
    id: 'insects',
    title: '🐞 Les Insectes',
    desc: 'Papillons, coléoptères, libellules et abeilles',
    filter: sp => sp.taxonomy.class === 'Insecta',
    subgroups: [
      { id: 'butterflies', title: 'Papillons (Lépidoptères)', desc: 'Papillons de jour et papillons de nuit', filter: sp => sp.taxonomy.order === 'Lepidoptera' },
      { id: 'beetles', title: 'Coléoptères & Scarabées', desc: 'Coccinelles, cétoines, chrysomèles...', filter: sp => sp.taxonomy.order === 'Coleoptera' },
      { id: 'dragonflies', title: 'Libellules & Demoiselles', desc: 'Odonates des rivières et mares', filter: sp => sp.taxonomy.order === 'Odonata' },
      { id: 'hymenoptera', title: 'Abeilles, Guêpes & Fourmis', desc: 'Pollinisateurs et bâtisseurs sociaux', filter: sp => sp.taxonomy.order === 'Hymenoptera' },
      { id: 'orthoptera', title: 'Criquets, Sauterelles & Grillons', desc: 'Chanteurs des herbes sèches', filter: sp => sp.taxonomy.order === 'Orthoptera' },
      { id: 'other_insects', title: 'Mouches, Punaises & Mantes', desc: 'Dioptères, hémiptères, mantes...', filter: sp => !['Lepidoptera', 'Coleoptera', 'Odonata', 'Hymenoptera', 'Orthoptera'].includes(sp.taxonomy.order) }
    ]
  },
  {
    id: 'arachnids',
    title: '🕷️ Araignées & Arachnides',
    desc: 'Tisseuses, chasseuses à l’affût et scorpions',
    filter: sp => sp.taxonomy.class === 'Arachnida',
    subgroups: [
      { id: 'spiders', title: 'Araignées vraies', desc: 'Argiopes, thomises, épeires...', filter: sp => sp.taxonomy.order === 'Araneae' },
      { id: 'scorpions', title: 'Scorpions & Pseudoscorpions', desc: 'Scorpions et espèces apparentées', filter: sp => ['Scorpiones', 'Pseudoscorpiones'].includes(sp.taxonomy.order) },
      { id: 'harvestmen', title: 'Opilions (Faucheurs)', desc: 'Arachnides à pattes démesurées', filter: sp => sp.taxonomy.order === 'Opiliones' }
    ]
  },
  {
    id: 'reptiles',
    title: '🦎 Les Reptiles',
    desc: 'Lézards, geckos, serpents et tortues',
    filter: sp => sp.taxonomy.class === 'Reptilia',
    subgroups: [
      { id: 'lizards', title: 'Lézards & Geckos', desc: 'Lézards tyrrhéniens, tarentes...', filter: sp => sp.taxonomy.order === 'Squamata' && !(sp.common_name||'').toLowerCase().includes('couleuvre') && !(sp.common_name||'').toLowerCase().includes('vipere') },
      { id: 'snakes', title: 'Serpents & Couleuvres', desc: 'Couleuvres et vipères', filter: sp => sp.taxonomy.order === 'Squamata' && ((sp.common_name||'').toLowerCase().includes('couleuvre') || (sp.common_name||'').toLowerCase().includes('vipere')) },
      { id: 'turtles', title: 'Tortues terrestres & marines', desc: 'Tortue d’Hermann, cistudes...', filter: sp => sp.taxonomy.order === 'Testudines' }
    ]
  },
  {
    id: 'amphibians',
    title: '🐸 Les Amphibiens',
    desc: 'Grenouilles, crapauds, tritons et salamandres',
    filter: sp => sp.taxonomy.class === 'Amphibia',
    subgroups: [
      { id: 'anurans', title: 'Grenouilles, Crapauds & Rainettes', desc: 'Anoures chanteurs d’eau douce', filter: sp => sp.taxonomy.order === 'Anura' },
      { id: 'urodeles', title: 'Salamandres & Tritons', desc: 'Urodèles des torrents et forêts', filter: sp => sp.taxonomy.order === 'Urodela' }
    ]
  },
  {
    id: 'marine_life',
    title: '🐟 Le Monde Marin & Aquatique',
    desc: 'Poissons, éponges, méduses, coraux et crustacés',
    filter: sp => ['Actinopterygii', 'Elasmobranchii', 'Chondrichthyes', 'Malacostraca', 'Cnidaria', 'Porifera', 'Echinodermata', 'Bivalvia'].includes(sp.taxonomy.class) || ['Cnidaria', 'Porifera', 'Echinodermata'].includes(sp.taxonomy.phylum),
    subgroups: [
      { id: 'fish', title: 'Poissons osseux & cartilagineux', desc: 'Mérous, rascasses, sars, raies...', filter: sp => ['Actinopterygii', 'Elasmobranchii', 'Chondrichthyes'].includes(sp.taxonomy.class) },
      { id: 'sponges', title: 'Éponges marines (Porifères)', desc: 'Faune fixée des grottes et tombants', filter: sp => sp.taxonomy.phylum === 'Porifera' },
      { id: 'cnidarians', title: 'Méduses, Anémones & Coraux', desc: 'Cnidaires aux tentacules urticants', filter: sp => sp.taxonomy.phylum === 'Cnidaria' },
      { id: 'crustaceans', title: 'Crabes, Crevettes & Homards', desc: 'Crustacés à carapace articulée', filter: sp => sp.taxonomy.class === 'Malacostraca' },
      { id: 'mollusks', title: 'Coquillages & Céphalopodes', desc: 'Poulpes, seiches, moules, nacres...', filter: sp => sp.taxonomy.phylum === 'Mollusca' && sp.taxonomy.class !== 'Gastropoda' }
    ]
  },
  {
    id: 'plants',
    title: '🌿 Plantes & Flore sauvage',
    desc: 'Orchidées sauvages, maquis, arbres et fougères',
    filter: sp => sp.taxonomy.kingdom === 'Plantae',
    subgroups: [
      { id: 'orchids', title: 'Orchidées sauvages (Ophrys, Orchis...)', desc: 'Fleurs d’une rare complexité', filter: sp => sp.taxonomy.family === 'Orchidaceae' },
      { id: 'maquis_flora', title: 'Arbustes du Maquis & Méditerranée', desc: 'Cistes, myrtes, arbousiers, bruyères...', filter: sp => ['Cistaceae', 'Myrtaceae', 'Ericaceae', 'Lamiaceae'].includes(sp.taxonomy.family) },
      { id: 'wildflowers', title: 'Fleurs des champs & Prairies', desc: 'Astéracées, fabacées, renonculacées...', filter: sp => ['Asteraceae', 'Fabaceae', 'Ranunculaceae', 'Liliaceae'].includes(sp.taxonomy.family) },
      { id: 'trees', title: 'Arbres forestiers & Conifères', desc: 'Chênes, châtaigniers, pins laricio...', filter: sp => ['Fagaceae', 'Pinaceae', 'Betulaceae'].includes(sp.taxonomy.family) },
      { id: 'other_plants', title: 'Autres plantes & Fougères', desc: 'Graminées, mousses, ptéridophytes...', filter: sp => !['Orchidaceae', 'Cistaceae', 'Myrtaceae', 'Ericaceae', 'Lamiaceae', 'Asteraceae', 'Fabaceae', 'Ranunculaceae', 'Liliaceae', 'Fagaceae', 'Pinaceae', 'Betulaceae'].includes(sp.taxonomy.family) }
    ]
  },
  {
    id: 'fungi',
    title: '🍄 Champignons & Lichens',
    desc: 'Bolets, agarics, amanites et lichens corticoles',
    filter: sp => sp.taxonomy.kingdom === 'Fungi',
    subgroups: [
      { id: 'mushrooms', title: 'Champignons à chapeau (Bolets, Agarics)', desc: 'Fructifications forestières d’automne', filter: sp => ['Agaricomycetes'].includes(sp.taxonomy.class) },
      { id: 'lichens', title: 'Lichens & Mousses symbiotiques', desc: 'Symbioses sur roches et écorces', filter: sp => ['Lecanoromycetes'].includes(sp.taxonomy.class) },
      { id: 'other_fungi', title: 'Autres champignons', desc: 'Champignons du bois, ascomycètes...', filter: sp => !['Agaricomycetes', 'Lecanoromycetes'].includes(sp.taxonomy.class) }
    ]
  }
];

function initVisualWorkspace() {
  if (!globalSpeciesData) return;
  visualNavigateToRoot();
}

function visualNavigateToRoot() {
  document.getElementById('visualBreadcrumbs').innerHTML = `
    <span class="visual-crumb-link" onclick="visualNavigateToRoot()">🌳 Le Grand Monde Vivant</span>
  `;
  document.getElementById('visualCurrentCount').innerText = `${globalSpeciesData.length.toLocaleString('fr-FR')} espèces au total`;
  const container = document.getElementById('visualContentArea');
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'visual-group-grid';

  visualTree.forEach(group => {
    const matchingSpecies = globalSpeciesData.filter(group.filter);
    const count = matchingSpecies.length;
    if (count === 0) return;

    const samplePhoto = (matchingSpecies.find(s => s.photo_url) || {}).photo_url || 'https://via.placeholder.com/300x200/080c14/475569?text=?';
    const card = document.createElement('div');
    card.className = 'visual-card';
    card.onclick = () => visualNavigateToSubgroups(group.id);
    card.innerHTML = `
      <img class="visual-card-bg" src="${samplePhoto}" alt="${group.title}" loading="lazy" />
      <div class="visual-card-overlay"></div>
      <span class="visual-card-badge">${count.toLocaleString('fr-FR')} espèces</span>
      <div class="visual-card-content">
        <div class="visual-card-title">${group.title}</div>
        <div class="visual-card-subtitle">${group.desc}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function visualNavigateToSubgroups(macroId) {
  const macro = visualTree.find(m => m.id === macroId);
  if (!macro) return;
  const matchingMacro = globalSpeciesData.filter(macro.filter);

  document.getElementById('visualBreadcrumbs').innerHTML = `
    <span class="visual-crumb-link" onclick="visualNavigateToRoot()">🌳 Le Grand Monde Vivant</span>
    <span class="visual-crumb-separator">&gt;</span>
    <span style="color:#fff;">${macro.title}</span>
  `;
  document.getElementById('visualCurrentCount').innerText = `${matchingMacro.length.toLocaleString('fr-FR')} espèce(s)`;

  const container = document.getElementById('visualContentArea');
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'visual-group-grid';

  macro.subgroups.forEach(sub => {
    const matchingSub = matchingMacro.filter(sub.filter);
    const count = matchingSub.length;
    if (count === 0) return;

    const samplePhoto = (matchingSub.find(s => s.photo_url) || {}).photo_url || 'https://via.placeholder.com/300x200/080c14/475569?text=?';
    const card = document.createElement('div');
    card.className = 'visual-card';
    card.onclick = () => visualNavigateToSpecies(macroId, sub.id);
    card.innerHTML = `
      <img class="visual-card-bg" src="${samplePhoto}" alt="${sub.title}" loading="lazy" />
      <div class="visual-card-overlay"></div>
      <span class="visual-card-badge">${count.toLocaleString('fr-FR')} espèces</span>
      <div class="visual-card-content">
        <div class="visual-card-title">${sub.title}</div>
        <div class="visual-card-subtitle">${sub.desc}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function visualNavigateToSpecies(macroId, subId) {
  const macro = visualTree.find(m => m.id === macroId);
  if (!macro) return;
  const sub = macro.subgroups.find(s => s.id === subId);
  if (!sub) return;

  const matchingSpecies = globalSpeciesData.filter(macro.filter).filter(sub.filter);

  document.getElementById('visualBreadcrumbs').innerHTML = `
    <span class="visual-crumb-link" onclick="visualNavigateToRoot()">🌳 Le Grand Monde Vivant</span>
    <span class="visual-crumb-separator">&gt;</span>
    <span class="visual-crumb-link" onclick="visualNavigateToSubgroups('${macroId}')">${macro.title}</span>
    <span class="visual-crumb-separator">&gt;</span>
    <span style="color:#fff;">${sub.title}</span>
  `;
  document.getElementById('visualCurrentCount').innerText = `${matchingSpecies.length.toLocaleString('fr-FR')} espèce(s)`;

  const container = document.getElementById('visualContentArea');
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'visual-species-grid';

  matchingSpecies.slice(0, 120).forEach(sp => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.onclick = () => alert(`Super-Fiche bientôt active pour : ${sp.scientific_name}`);
    const thumb = sp.photo_url || 'https://via.placeholder.com/200x200/080c14/475569?text=?';

    card.innerHTML = `
      <img class="gallery-photo" src="${thumb}" alt="${sp.scientific_name}" loading="lazy" />
      <div class="gallery-overlay"></div>
      <div class="gallery-text">
        <span class="gallery-latin">${sp.scientific_name}</span>
        <span class="gallery-vern">${sp.common_name || sp.taxonomy.genus || ''}</span>
      </div>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// ========================================================
// 4. MODULE 2 - ONGLET 1 : OBSERVATIONS (TRIS AVANCÉS)
// ========================================================
let obsFilteredData = [];

function initObservationsWorkspace() {
  if (!globalSpeciesData) return;

  const searchInput = document.getElementById('obsSearchInput');
  const sortSelect = document.getElementById('obsSortSelect');

  searchInput.oninput = applyObsFilteringAndSorting;
  sortSelect.onchange = applyObsFilteringAndSorting;

  applyObsFilteringAndSorting();
}

function applyObsFilteringAndSorting() {
  if (!globalSpeciesData) return;
  const q = normalizeStr(document.getElementById('obsSearchInput').value);
  const sortMode = document.getElementById('obsSortSelect').value;

  // Filtrage
  if (!q) {
    obsFilteredData = [...globalSpeciesData];
  } else {
    obsFilteredData = globalSpeciesData.filter(sp => {
      const fullText = normalizeStr(`${sp.scientific_name} ${sp.common_name || ''} ${sp.place || ''} ${sp.taxonomy.family || ''} ${sp.taxonomy.order || ''}`);
      return fullText.includes(q);
    });
  }

  // Tris
  obsFilteredData.sort((a, b) => {
    if (sortMode === 'date-desc') return (b.last_observed || '').localeCompare(a.last_observed || '');
    if (sortMode === 'date-asc') return (a.last_observed || '').localeCompare(b.last_observed || '');
    if (sortMode === 'sci-asc') return a.scientific_name.localeCompare(b.scientific_name);
    if (sortMode === 'sci-desc') return b.scientific_name.localeCompare(a.scientific_name);
    if (sortMode === 'vern-asc') return (a.common_name || 'zzz').localeCompare(b.common_name || 'zzz');
    if (sortMode === 'count-desc') return (b.obs_count || 1) - (a.obs_count || 1);
    if (sortMode === 'count-asc') return (a.obs_count || 1) - (b.obs_count || 1);
    return 0;
  });

  document.getElementById('obsCountBadge').innerText = `${obsFilteredData.length.toLocaleString('fr-FR')} observation(s)`;
  renderObsCards();
}

function renderObsCards() {
  const container = document.getElementById('obsCardsGrid');
  container.innerHTML = '';

  const slice = obsFilteredData.slice(0, 100);
  const fragment = document.createDocumentFragment();

  slice.forEach(sp => {
    const card = document.createElement('div');
    card.className = 'obs-card';
    card.onclick = () => alert(`Super-Fiche bientôt active pour : ${sp.scientific_name}`);
    const thumb = sp.photo_url || 'https://via.placeholder.com/220x220/080c14/475569?text=?';

    card.innerHTML = `
      <img class="obs-card-img" src="${thumb}" alt="${sp.scientific_name}" loading="lazy" />
      <div class="obs-card-overlay"></div>
      <div class="obs-card-content">
        <div class="obs-sci">${sp.scientific_name}</div>
        <div class="obs-vern">${sp.common_name || sp.taxonomy.family || 'Taxon validé'}</div>
        <div class="obs-meta">${sp.place || 'Lieu non renseigné'} • ${sp.last_observed || 'Non daté'}</div>
      </div>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
  container.scrollTop = 0;
}

// ========================================================
// 5. MODULE 2 - ONGLET 2 : STATISTIQUES & ANALYSES
// ========================================================
function initStatsDashboard() {
  if (!globalSpeciesData) return;
  const container = document.getElementById('statsDashboardArea');
  container.innerHTML = '';

  const totalSpecies = globalSpeciesData.length;
  const totalObs = globalSpeciesData.reduce((acc, s) => acc + (s.obs_count || 1), 0);
  const driveCount = globalSpeciesData.filter(s => s.drive_folder_id).length;
  const drivePct = Math.round((driveCount / totalSpecies) * 100);

  // 1. KPI Banner
  const kpiBanner = document.createElement('div');
  kpiBanner.className = 'stat-kpi-banner';
  kpiBanner.innerHTML = `
    <div class="stat-kpi-card">
      <div class="stat-kpi-label">Espèces validées</div>
      <div class="stat-kpi-val">${totalSpecies.toLocaleString('fr-FR')}</div>
    </div>
    <div class="stat-kpi-card">
      <div class="stat-kpi-label">Total des observations</div>
      <div class="stat-kpi-val" style="color: var(--accent-cyan);">${totalObs.toLocaleString('fr-FR')}</div>
    </div>
    <div class="stat-kpi-card">
      <div class="stat-kpi-label">Complétude Google Drive</div>
      <div class="stat-kpi-val" style="color: var(--accent-emerald);">${drivePct} %</div>
    </div>
    <div class="stat-kpi-card">
      <div class="stat-kpi-label">Moyenne par espèce</div>
      <div class="stat-kpi-val" style="color: var(--accent-amber);">${(totalObs / totalSpecies).toFixed(1)} obs</div>
    </div>
  `;
  container.appendChild(kpiBanner);

  // 2. Grille 2x2 des 4 quadrants
  const grid2x2 = document.createElement('div');
  grid2x2.className = 'stats-grid-2x2';

  // Quadrant 1 : Les Grands Règnes
  const kingdomBox = document.createElement('div');
  kingdomBox.className = 'stat-box';
  const kingdoms = {};
  globalSpeciesData.forEach(s => {
    const k = s.taxonomy.kingdom || 'Autres';
    kingdoms[k] = (kingdoms[k] || 0) + 1;
  });

  kingdomBox.innerHTML = `
    <div class="stat-box-header">
      <div class="stat-box-title">⚖️ Ratios des Grands Règnes</div>
      <span style="font-size:0.75rem; color:var(--text-dim);">Cliquez pour lister</span>
    </div>
    <div class="stat-bars-list" id="kingdomBarsList"></div>
  `;
  grid2x2.appendChild(kingdomBox);

  // Quadrant 2 : Top 8 des Ordres
  const orderBox = document.createElement('div');
  orderBox.className = 'stat-box';
  const orders = {};
  globalSpeciesData.forEach(s => {
    const o = s.taxonomy.order || 'Ordre indéterminé';
    orders[o] = (orders[o] || 0) + 1;
  });
  const topOrders = Object.entries(orders).sort((a,b) => b[1] - a[1]).slice(0, 8);

  orderBox.innerHTML = `
    <div class="stat-box-header">
      <div class="stat-box-title">🏆 Top des Ordres les plus riches</div>
      <span style="font-size:0.75rem; color:var(--text-dim);">Par nombre d'espèces</span>
    </div>
    <div class="stat-bars-list" id="orderBarsList"></div>
  `;
  grid2x2.appendChild(orderBox);

  // Quadrant 3 : Top 8 des Familles
  const familyBox = document.createElement('div');
  familyBox.className = 'stat-box';
  const families = {};
  globalSpeciesData.forEach(s => {
    const f = s.taxonomy.family || 'Famille indéterminée';
    families[f] = (families[f] || 0) + 1;
  });
  const topFamilies = Object.entries(families).sort((a,b) => b[1] - a[1]).slice(0, 8);

  familyBox.innerHTML = `
    <div class="stat-box-header">
      <div class="stat-box-title">🌿 Familles reines de la collection</div>
      <span style="font-size:0.75rem; color:var(--text-dim);">Par diversité spécifique</span>
    </div>
    <div class="stat-bars-list" id="familyBarsList"></div>
  `;
  grid2x2.appendChild(familyBox);

  // Quadrant 4 : Top des Stations de prospection (Lieux-dits)
  const placeBox = document.createElement('div');
  placeBox.className = 'stat-box';
  const places = {};
  globalSpeciesData.forEach(s => {
    if (s.place) {
      // Découpage simple pour garder le lieu principal
      const p = s.place.split(',')[0].trim();
      places[p] = (places[p] || 0) + 1;
    }
  });
  const topPlaces = Object.entries(places).sort((a,b) => b[1] - a[1]).slice(0, 8);

  placeBox.innerHTML = `
    <div class="stat-box-header">
      <div class="stat-box-title">📍 Hauts-lieux de prospection (Stations)</div>
      <span style="font-size:0.75rem; color:var(--text-dim);">Points chauds</span>
    </div>
    <div class="stat-bars-list" id="placeBarsList"></div>
  `;
  grid2x2.appendChild(placeBox);

  container.appendChild(grid2x2);

  // Remplissage animé des barres
  renderBars('kingdomBarsList', Object.entries(kingdoms), totalSpecies, '#38bdf8', 'kingdom');
  renderBars('orderBarsList', topOrders, totalSpecies, '#ec4899', 'order');
  renderBars('familyBarsList', topFamilies, totalSpecies, '#10b981', 'family');
  renderBars('placeBarsList', topPlaces, totalSpecies, '#f59e0b', 'place');
}

function renderBars(elementId, dataArray, totalRef, colorHex, filterType) {
  const container = document.getElementById(elementId);
  if (!container) return;

  dataArray.forEach(([key, count]) => {
    const pct = ((count / totalRef) * 100).toFixed(1);
    const item = document.createElement('div');
    item.className = 'stat-bar-item';
    item.onclick = () => openStatsModal(filterType, key, count);

    item.innerHTML = `
      <div class="stat-bar-labels">
        <span class="stat-bar-name">${vernMap[key] ? vernMap[key] + ' (' + key + ')' : key}</span>
        <span class="stat-bar-count">${count.toLocaleString('fr-FR')} <span style="font-size:0.7rem; color:var(--text-dim); font-weight:normal;">(${pct}%)</span></span>
      </div>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width: ${Math.min(100, Math.max(3, pct * 2.5))}%; background: ${colorHex};"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Pop-up modale d'affichage des espèces d'une statistique
function openStatsModal(type, value, count) {
  const modal = document.getElementById('statsModal');
  const title = document.getElementById('statsModalTitle');
  const body = document.getElementById('statsModalBody');

  title.innerText = `${value} (${count.toLocaleString('fr-FR')} espèces)`;
  body.innerHTML = '';

  let matches = [];
  if (type === 'kingdom') matches = globalSpeciesData.filter(s => s.taxonomy.kingdom === value);
  else if (type === 'order') matches = globalSpeciesData.filter(s => s.taxonomy.order === value);
  else if (type === 'family') matches = globalSpeciesData.filter(s => s.taxonomy.family === value);
  else if (type === 'place') matches = globalSpeciesData.filter(s => (s.place || '').includes(value));

  const fragment = document.createDocumentFragment();
  matches.slice(0, 100).forEach(sp => {
    const row = document.createElement('div');
    row.className = 'species-row';
    row.onclick = () => alert(`Super-Fiche bientôt active pour : ${sp.scientific_name}`);
    const thumb = sp.photo_url || 'https://via.placeholder.com/80x80/080c14/475569?text=?';

    row.innerHTML = `
      <div class="species-left">
        <img class="species-mini-thumb" src="${thumb}" alt="${sp.scientific_name}" loading="lazy" />
        <div class="species-text">
          <span class="species-latin">${sp.scientific_name}</span>
          <span class="species-vernacular">${sp.common_name || sp.taxonomy.family || ''}</span>
        </div>
      </div>
      <button class="btn-open-fiche">Fiche</button>
    `;
    fragment.appendChild(row);
  });

  body.appendChild(fragment);
  modal.classList.add('open');
}

function closeStatsModal() {
  document.getElementById('statsModal').classList.remove('open');
}
