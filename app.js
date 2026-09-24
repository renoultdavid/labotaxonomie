// ========================================================
// OBSERVATOIRE DU VIVANT • ARCHITECTURE MAÎTRESSE
// ========================================================
let globalSpeciesData = null;
let currentResultsList = [];
let resultsViewMode = 'gallery';
let currentOpenSpecies = null;

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

function normalizeStr(str) {
  return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isTrueSpecies(sp) {
  if (!sp || !sp.scientific_name) return false;
  const parts = sp.scientific_name.trim().split(/\s+/);
  return parts.length >= 2 && !['Animalia', 'Plantae', 'Fungi', 'Arthropoda', 'Chordata', 'Insecta'].includes(parts[0]);
}

// FABRICATION UNIVERSELLE D'UNE VIGNETTE DE MOSAÏQUE
function createOriginalGalleryCard(sp, metaText, countBadge) {
  const card = document.createElement('div');
  card.className = 'gallery-card';
  card.onclick = () => openSpeciesSheet(sp);
  const thumb = sp.photo_url || 'https://via.placeholder.com/200x200/080c14/475569?text=?';

  const metaHtml = metaText ? `<span class="gallery-meta">${metaText}</span>` : '';
  const badgeHtml = countBadge ? `<span class="gallery-count-badge">${countBadge} obs</span>` : '';

  card.innerHTML = `
    <img class="gallery-photo" src="${thumb}" alt="${sp.scientific_name}" loading="lazy" />
    <div class="gallery-overlay"></div>
    ${badgeHtml}
    <div class="gallery-text">
      <span class="gallery-latin">${sp.scientific_name}</span>
      <span class="gallery-vern">${sp.common_name || sp.taxonomy.genus || ''}</span>
      ${metaHtml}
    </div>
  `;
  return card;
}

// Chargement initial
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    globalSpeciesData = data;
    document.getElementById('treeTotalCount').innerText = `${data.length.toLocaleString('fr-FR')} espèces`;
    initDeepExpertTree();
    restoreStateFromURL();
  })
  .catch(err => console.warn('Erreur chargement data.json...', err));

// ========================================================
// PERSISTANCE DE LA NAVIGATION PAR URL
// ========================================================
function updateURLHash(moduleId, tabIndex, speciesId) {
  if (speciesId) {
    window.location.hash = `species/${speciesId}`;
  } else if (moduleId) {
    window.location.hash = `${moduleId}/${tabIndex !== undefined ? tabIndex : 0}`;
  } else {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
}

function restoreStateFromURL() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return;

  const parts = hash.split('/');
  if (parts[0] === 'species' && parts[1]) {
    const sp = globalSpeciesData.find(s => String(s.id) === parts[1]);
    if (sp) {
      openModule('module1', false);
      openSpeciesSheet(sp);
    }
  } else if (parts[0] === 'module1' || parts[0] === 'module2') {
    const tabIdx = parseInt(parts[1] || '0', 10);
    openModule(parts[0], false);
    switchModuleTab(parts[0], tabIdx, false);
  }
}

window.addEventListener('popstate', () => {
  if (globalSpeciesData) restoreStateFromURL();
});

function openModule(moduleId, updateHash = true) {
  document.getElementById('homeScreen').classList.add('hidden');
  document.getElementById(moduleId).classList.add('active');
  if (moduleId === 'module2') {
    initObservationsWorkspace();
  }
  if (updateHash) updateURLHash(moduleId, 0);
}

function backToHome() {
  document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active'));
  document.getElementById('homeScreen').classList.remove('hidden');
  updateURLHash(null);
}

function switchModuleTab(moduleId, tabIndex, updateHash = true) {
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

  if (updateHash) updateURLHash(moduleId, tabIndex);
}

// 1. EXPERT
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
  renderExpertResultsDOM();
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
  renderExpertResultsDOM();
}

function renderExpertResultsDOM() {
  const container = document.getElementById('expertResultsWrapper');
  container.innerHTML = '';
  const slice = currentResultsList.slice(0, 100);

  if (resultsViewMode === 'gallery') {
    const galleryDiv = document.createElement('div');
    galleryDiv.className = 'results-gallery-mode';

    slice.forEach(sp => {
      galleryDiv.appendChild(createOriginalGalleryCard(sp));
    });
    container.appendChild(galleryDiv);
  } else {
    const listDiv = document.createElement('div');
    listDiv.className = 'results-list-mode';

    slice.forEach(sp => {
      const row = document.createElement('div');
      row.className = 'species-row';
      row.onclick = () => openSpeciesSheet(sp);
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
    container.appendChild(listDiv);
  }

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
  renderExpertResultsDOM();
});

// 2. GÉO 2D
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
        <button style="margin-top:0.4rem; padding:0.25rem 0.5rem; background:#38bdf8; border:none; border-radius:4px; font-weight:700; cursor:pointer;" onclick='openSpeciesSheetFromId("${sp.id}")'>Voir Fiche</button>
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

  const galleryDiv = document.createElement('div');
  galleryDiv.className = 'results-gallery-mode';

  const slice = visibleSpecies.slice(0, 80);
  slice.forEach(sp => {
    galleryDiv.appendChild(createOriginalGalleryCard(sp, sp.place ? sp.place.split(',')[0] : ''));
  });

  container.appendChild(galleryDiv);
}

// 3. VISUEL
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

  const galleryDiv = document.createElement('div');
  galleryDiv.className = 'results-gallery-mode';

  matchingSpecies.slice(0, 120).forEach(sp => {
    galleryDiv.appendChild(createOriginalGalleryCard(sp));
  });

  container.appendChild(galleryDiv);
}

// ========================================================
// 4. OBSERVATIONS
// ========================================================
let obsFilteredData = [];
let obsCurrentPage = 1;
let obsPageSize = 100;

function initObservationsWorkspace() {
  if (!globalSpeciesData) return;

  const searchInput = document.getElementById('obsSearchInput');
  const sortSelect = document.getElementById('obsSortSelect');
  const pageSizeSelect = document.getElementById('obsPageSizeSelect');

  searchInput.oninput = () => { obsCurrentPage = 1; applyObsFilteringAndSorting(); };
  sortSelect.onchange = () => { obsCurrentPage = 1; applyObsFilteringAndSorting(); };
  pageSizeSelect.onchange = (e) => {
    obsPageSize = parseInt(e.target.value, 10);
    obsCurrentPage = 1;
    applyObsFilteringAndSorting();
  };

  applyObsFilteringAndSorting();
}

function applyObsFilteringAndSorting() {
  if (!globalSpeciesData) return;
  const q = normalizeStr(document.getElementById('obsSearchInput').value);
  const sortMode = document.getElementById('obsSortSelect').value;

  let baseList = globalSpeciesData;
  if (q) {
    baseList = baseList.filter(sp => {
      const fullText = normalizeStr(`${sp.scientific_name} ${sp.common_name || ''} ${sp.place || ''} ${sp.taxonomy.family || ''} ${sp.taxonomy.order || ''}`);
      return fullText.includes(q);
    });
  }

  if (sortMode === 'freq-desc' || sortMode === 'freq-asc') {
    baseList = baseList.filter(isTrueSpecies);
  }

  obsFilteredData = [...baseList];

  obsFilteredData.sort((a, b) => {
    if (sortMode === 'date-desc') return (b.last_observed || '').localeCompare(a.last_observed || '');
    if (sortMode === 'date-asc') return (a.last_observed || '').localeCompare(b.last_observed || '');
    if (sortMode === 'sci-asc') return a.scientific_name.localeCompare(b.scientific_name);
    if (sortMode === 'sci-desc') return b.scientific_name.localeCompare(a.scientific_name);
    if (sortMode === 'vern-asc') return (a.common_name || 'zzz').localeCompare(b.common_name || 'zzz');
    if (sortMode === 'freq-desc') return (b.obs_count || 1) - (a.obs_count || 1);
    if (sortMode === 'freq-asc') return (a.obs_count || 1) - (b.obs_count || 1);
    return 0;
  });

  updateObsPagination();
  renderObsCards();
}

function updateObsPagination() {
  const totalItems = obsFilteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / obsPageSize));

  if (obsCurrentPage > totalPages) obsCurrentPage = totalPages;

  document.getElementById('obsCountBadge').innerText = `${totalItems.toLocaleString('fr-FR')} observation(s)`;
  document.getElementById('obsPageIndicator').innerText = `Page ${obsCurrentPage} / ${totalPages}`;
  document.getElementById('btnPagePrev').disabled = (obsCurrentPage <= 1);
  document.getElementById('btnPageNext').disabled = (obsCurrentPage >= totalPages);
}

function changeObsPage(delta) {
  obsCurrentPage += delta;
  updateObsPagination();
  renderObsCards();
  document.getElementById('obsCardsGrid').scrollTop = 0;
}

function renderObsCards() {
  const container = document.getElementById('obsCardsGrid');
  container.innerHTML = '';

  const galleryDiv = document.createElement('div');
  galleryDiv.className = 'results-gallery-mode';

  const sortMode = document.getElementById('obsSortSelect').value;
  const showBadge = (sortMode === 'freq-desc');

  const start = (obsCurrentPage - 1) * obsPageSize;
  const slice = obsFilteredData.slice(start, start + obsPageSize);

  slice.forEach(sp => {
    const metaText = `${sp.place ? sp.place.split(',')[0] : 'Station'} • ${sp.last_observed || 'Non daté'}`;
    const badgeVal = showBadge ? (sp.obs_count || 1) : null;
    galleryDiv.appendChild(createOriginalGalleryCard(sp, metaText, badgeVal));
  });

  container.appendChild(galleryDiv);
}

// ========================================================
// 5. STATISTIQUES & PHÉNOLOGIE
// ========================================================
function initStatsDashboard() {
  if (!globalSpeciesData) return;
  const container = document.getElementById('statsDashboardArea');
  container.innerHTML = '';

  const trueSpeciesList = globalSpeciesData.filter(isTrueSpecies);
  const totalTrueSpecies = trueSpeciesList.length;
  const totalObs = globalSpeciesData.reduce((acc, s) => acc + (s.obs_count || 1), 0);

  const monthCounts = new Array(12).fill(0);
  globalSpeciesData.forEach(s => {
    if (s.last_observed) {
      const parts = s.last_observed.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) monthCounts[m] += (s.obs_count || 1);
      }
    }
  });
  const maxMonth = Math.max(...monthCounts, 1);
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  const rareCount = trueSpeciesList.filter(s => (s.obs_count || 1) === 1).length;
  const moderateCount = trueSpeciesList.filter(s => (s.obs_count || 1) >= 2 && (s.obs_count || 1) <= 4).length;
  const frequentCount = trueSpeciesList.filter(s => (s.obs_count || 1) >= 5).length;

  const pctRare = ((rareCount / totalTrueSpecies) * 100).toFixed(0);
  const pctMod = ((moderateCount / totalTrueSpecies) * 100).toFixed(0);
  const pctFreq = (100 - pctRare - pctMod);

  const circ = 282.7;
  const strokeRare = (pctRare / 100) * circ;
  const strokeMod = (pctMod / 100) * circ;
  const strokeFreq = (pctFreq / 100) * circ;

  const topSpeciesStars = [...trueSpeciesList]
    .sort((a,b) => (b.obs_count || 1) - (a.obs_count || 1))
    .slice(0, 5);

  const kpiBanner = document.createElement('div');
  kpiBanner.className = 'stat-kpi-banner';
  kpiBanner.innerHTML = `
    <div class="stat-kpi-card">
      <div class="stat-kpi-label">Espèces binominales</div>
      <div class="stat-kpi-val">${totalTrueSpecies.toLocaleString('fr-FR')}</div>
    </div>
    <div class="stat-kpi-card">
      <div class="stat-kpi-label">Observations cumulées</div>
      <div class="stat-kpi-val" style="color: var(--accent-cyan);">${totalObs.toLocaleString('fr-FR')}</div>
    </div>
    <div class="stat-kpi-card">
      <div class="stat-kpi-label">Indice de rareté</div>
      <div class="stat-kpi-val" style="color: var(--accent-amber);">${pctRare} %</div>
    </div>
    <div class="stat-kpi-card">
      <div class="stat-kpi-label">Moyenne d'obs / taxon</div>
      <div class="stat-kpi-val" style="color: var(--accent-emerald);">${(totalObs / totalTrueSpecies).toFixed(1)}</div>
    </div>
  `;
  container.appendChild(kpiBanner);

  const grid = document.createElement('div');
  grid.className = 'stats-grid-2x2';

  const phenoBox = document.createElement('div');
  phenoBox.className = 'stat-box';
  let phenoBarsHtml = '';
  monthNames.forEach((name, idx) => {
    const count = monthCounts[idx];
    const heightPct = Math.round((count / maxMonth) * 100);
    phenoBarsHtml += `
      <div class="pheno-col" title="${name} : ${count} relevés">
        <div class="pheno-bar-track">
          <div class="pheno-bar-fill" style="height: ${Math.max(4, heightPct)}%;"></div>
        </div>
        <span class="pheno-month-label">${name}</span>
      </div>
    `;
  });

  phenoBox.innerHTML = `
    <div class="stat-box-header">
      <div class="stat-box-title">📅 Phénologie & Activité Saisonnière</div>
      <span style="font-size:0.75rem; color:var(--text-dim);">Relevés cumulés par mois</span>
    </div>
    <div class="pheno-grid">${phenoBarsHtml}</div>
  `;
  grid.appendChild(phenoBox);

  const rarityBox = document.createElement('div');
  rarityBox.className = 'stat-box';
  rarityBox.innerHTML = `
    <div class="stat-box-header">
      <div class="stat-box-title">🎯 Profil de Rareté des Espèces</div>
      <span style="font-size:0.75rem; color:var(--text-dim);">Distribution des contacts</span>
    </div>
    <div class="donut-wrap">
      <svg class="donut-svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#060910" stroke-width="22" />
        <circle class="donut-circle" cx="60" cy="60" r="45" stroke="#f59e0b" stroke-dasharray="${strokeRare} ${circ}" stroke-dashoffset="0" />
        <circle class="donut-circle" cx="60" cy="60" r="45" stroke="#38bdf8" stroke-dasharray="${strokeMod} ${circ}" stroke-dashoffset="-${strokeRare}" />
        <circle class="donut-circle" cx="60" cy="60" r="45" stroke="#10b981" stroke-dasharray="${strokeFreq} ${circ}" stroke-dashoffset="-${strokeRare + strokeMod}" />
      </svg>
      <div class="donut-legend">
        <div class="donut-legend-item">
          <span class="donut-dot" style="background:#f59e0b;"></span>
          <div>
            <strong>${rareCount.toLocaleString('fr-FR')}</strong> espèces vues 1 fois
            <div style="font-size:0.7rem; color:var(--text-dim);">${pctRare}% de raretés absolues</div>
          </div>
        </div>
        <div class="donut-legend-item">
          <span class="donut-dot" style="background:#38bdf8;"></span>
          <div>
            <strong>${moderateCount.toLocaleString('fr-FR')}</strong> espèces régulières (2 à 4)
            <div style="font-size:0.7rem; color:var(--text-dim);">${pctMod}% de présence stable</div>
          </div>
        </div>
        <div class="donut-legend-item">
          <span class="donut-dot" style="background:#10b981;"></span>
          <div>
            <strong>${frequentCount.toLocaleString('fr-FR')}</strong> espèces reines (5+)
            <div style="font-size:0.7rem; color:var(--text-dim);">${pctFreq}% de piliers</div>
          </div>
        </div>
      </div>
    </div>
  `;
  grid.appendChild(rarityBox);

  const podiumBox = document.createElement('div');
  podiumBox.className = 'stat-box';
  let podiumHtml = '';
  topSpeciesStars.forEach((sp, i) => {
    const thumb = sp.photo_url || 'https://via.placeholder.com/80x80/080c14/475569?text=?';
    podiumHtml += `
      <div class="podium-item" onclick="openSpeciesSheet(sp)">
        <div class="podium-left">
          <span class="podium-rank">#${i + 1}</span>
          <img class="podium-avatar" src="${thumb}" alt="" />
          <div>
            <div style="font-style:italic; font-weight:700; font-size:0.85rem; color:#fff;">${sp.scientific_name}</div>
            <div style="font-size:0.725rem; color:var(--accent-emerald);">${sp.common_name || sp.taxonomy.family || ''}</div>
          </div>
        </div>
        <div class="podium-score">${sp.obs_count || 1} relevés</div>
      </div>
    `;
  });

  podiumBox.innerHTML = `
    <div class="stat-box-header">
      <div class="stat-box-title">👑 Les 5 Espèces Reines du Terrain</div>
      <span style="font-size:0.75rem; color:var(--text-dim);">Les plus documentées</span>
    </div>
    <div class="podium-list">${podiumHtml}</div>
  `;
  grid.appendChild(podiumBox);

  const biomeBox = document.createElement('div');
  biomeBox.className = 'stat-box';
  const insectCount = globalSpeciesData.filter(s => s.taxonomy.class === 'Insecta').length;
  const plantCount = globalSpeciesData.filter(s => s.taxonomy.kingdom === 'Plantae').length;
  const birdCount = globalSpeciesData.filter(s => s.taxonomy.class === 'Aves').length;
  const marineCount = globalSpeciesData.filter(s => ['Actinopterygii', 'Porifera', 'Cnidaria', 'Malacostraca'].includes(s.taxonomy.class) || s.taxonomy.phylum === 'Porifera').length;

  biomeBox.innerHTML = `
    <div class="stat-box-header">
      <div class="stat-box-title">🌐 Équilibre des Grands Pôles Biologiques</div>
      <span style="font-size:0.75rem; color:var(--text-dim);">Poids de biodiversité</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:0.85rem; justify-content:center; height:100%;">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
        <span>🐞 Entomofaune (Insectes)</span>
        <strong style="color:var(--accent-amber);">${insectCount} espèces</strong>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
        <span>🌿 Flore & Végétation</span>
        <strong style="color:var(--accent-emerald);">${plantCount} espèces</strong>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
        <span>🦅 Avifaune (Oiseaux)</span>
        <strong style="color:var(--accent-cyan);">${birdCount} espèces</strong>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
        <span>🐟 Faune Aquatique & Sous-marine</span>
        <strong style="color:var(--accent-purple);">${marineCount} espèces</strong>
      </div>
    </div>
  `;
  grid.appendChild(biomeBox);

  container.appendChild(grid);
}

// ========================================================
// 6. SUPER-FICHE ESPÈCE : SPLIT-SCREEN 50/50 ÉLARGI
// ========================================================
const iucnDefinitions = {
  'LC': { label: 'LC • Préoccupation mineure', class: 'iucn-lc' },
  'NT': { label: 'NT • Quasi menacée', class: 'iucn-nt' },
  'VU': { label: 'VU • Vulnérable', class: 'iucn-vu' },
  'EN': { label: 'EN • En danger', class: 'iucn-en' },
  'CR': { label: 'CR • En danger critique', class: 'iucn-cr' },
  'EW': { label: 'EW • Éteinte à l’état sauvage', class: 'iucn-ex' },
  'EX': { label: 'EX • Éteinte', class: 'iucn-ex' },
  'RE': { label: 'RE • Disparue au niveau régional', class: 'iucn-ex' },
  'DD': { label: 'DD • Données insuffisantes', class: 'iucn-dd' }
};

function openSpeciesSheetFromId(id) {
  if (!globalSpeciesData) return;
  const sp = globalSpeciesData.find(s => String(s.id) === String(id));
  if (sp) openSpeciesSheet(sp);
}

function openSpeciesSheet(sp) {
  currentOpenSpecies = sp;
  updateURLHash(null, null, sp.id);

  const overlay = document.getElementById('speciesSheetOverlay');

  // Photo pure sans rien dessus (Volet Gauche)
  document.getElementById('sheetHeroImg').src = sp.photo_url || 'https://via.placeholder.com/900x900/080c14/475569?text=?';

  // Volet Droit
  document.getElementById('sheetHeroSci').innerText = sp.scientific_name;
  document.getElementById('sheetHeroVern').innerText = sp.common_name || sp.taxonomy.genus || 'Taxon validé';
  document.getElementById('sheetHeroRank').innerText = sp.taxonomy.rank || (isTrueSpecies(sp) ? 'Espèce' : 'Taxon supérieur');

  // Badge UICN
  const iucnEl = document.getElementById('sheetHeroIucn');
  const rawStatus = (sp.iucn_status || sp.conservation_status || 'LC').toUpperCase().trim();
  const iucnData = iucnDefinitions[rawStatus] || iucnDefinitions['LC'];
  iucnEl.className = `sheet-iucn-badge ${iucnData.class}`;
  iucnEl.innerText = iucnData.label;

  // Remettre sur le 1er onglet
  switchSheetTab(0);

  // Monographie
  generateSpontaneousMonograph(sp);

  // Diagnostic
  populateEcoDiagnostic(sp);

  // Taxonomie
  populateTaxoLineage(sp);

  // Terrain
  populateFieldData(sp);

  // Apparentés
  populateRelatedSpecies(sp);

  overlay.classList.add('active');
}

function closeSpeciesSheet() {
  document.getElementById('speciesSheetOverlay').classList.remove('active');
  const mod1Active = document.getElementById('module1').classList.contains('active');
  const mod2Active = document.getElementById('module2').classList.contains('active');
  if (mod1Active) updateURLHash('module1', 0);
  else if (mod2Active) updateURLHash('module2', 0);
  else updateURLHash(null);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSpeciesSheet();
    closeObsPhotosModal();
  }
});

function switchSheetTab(tabIndex) {
  const tabs = document.querySelectorAll('.sheet-tab-btn');
  tabs.forEach((t, i) => t.classList.toggle('active', i === tabIndex));

  const drawers = document.querySelectorAll('.sheet-drawer');
  drawers.forEach((d, i) => d.classList.toggle('active', i === tabIndex));
}

// MOTEUR DE MONOGRAPHIE FOUILLEE ET COMPLETE
function generateSpontaneousMonograph(sp) {
  const contentEl = document.getElementById('sheetWikiContent');
  contentEl.innerHTML = `<span class="sheet-loading-spinner"></span> Consultation de l'observatoire encyclopédique et compilation du diagnostic...`;

  const queryTitle = encodeURIComponent(sp.scientific_name);
  const endpoint = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exchars=1600&titles=${queryTitle}&format=json&origin=*`;

  fetch(endpoint)
    .then(res => res.json())
    .then(data => {
      const pages = data.query ? data.query.pages : null;
      const pageId = pages ? Object.keys(pages)[0] : '-1';

      if (pageId !== '-1' && pages[pageId].extract && pages[pageId].extract.length > 80) {
        renderMonographHTML(sp, pages[pageId].extract.trim(), "Notice naturaliste encyclopédique");
      } else {
        renderSyntheticMonograph(sp);
      }
    })
    .catch(() => {
      renderSyntheticMonograph(sp);
    });
}

function renderSyntheticMonograph(sp) {
  const sci = sp.scientific_name;
  const vern = sp.common_name ? `dénommé(e) communément <strong>${sp.common_name}</strong>` : `taxon systématique validé`;
  const k = vernMap[sp.taxonomy.kingdom] || sp.taxonomy.kingdom;
  const o = vernMap[sp.taxonomy.order] || sp.taxonomy.order || 'Ordre indéterminé';
  const f = sp.taxonomy.family ? `la famille des <em>${sp.taxonomy.family}</em>` : 'une lignée spécialisée';
  const g = sp.taxonomy.genus ? `du genre <em>${sp.taxonomy.genus}</em>` : '';
  const obs = sp.obs_count || 1;
  const place = sp.place ? `Station de référence : <strong>${sp.place}</strong>` : 'Localisation générale répertoriée';
  const dateStr = sp.last_observed ? `relevé le ${sp.last_observed}` : 'contact pérenne';

  const syntheticText = `
    <p><strong>${sci}</strong>, ${vern}, est un organisme appartenant au grand règne des <strong>${k}</strong>, rattaché à l'ordre des <strong>${o}</strong> au sein de ${f} ${g}.</p>
    
    <p><strong>Écologie, Biotopes & Morphologie :</strong> Ce taxon présente l'ensemble des caractères morpho-anatomiques distinctifs de son clade. Sur le plan autoécologique, il exploite préférentiellement les milieux naturels préservés et les étages bioclimatiques caractéristiques de son aire de répartition, participant activement aux réseaux d'interactions trophiques et fonctionnelles de son biotope d'accueil.</p>
    
    <p><strong>Statut au sein de la Collection :</strong> Ce taxon fait l'objet d'un suivi au laboratoire avec <strong>${obs} relevé(s)</strong> recensé(s) (${place}, ${dateStr}). Sa présence témoigne de la représentativité de l'inventaire écologique conduit sur le terrain.</p>
  `;

  renderMonographHTML(sp, syntheticText, "Monographie synthétique élaborée par le Laboratoire Taxonomique");
}

function renderMonographHTML(sp, textBody, sourceLabel) {
  const contentEl = document.getElementById('sheetWikiContent');
  let paragraphs = textBody;
  if (!textBody.includes('<p>')) {
    paragraphs = textBody.split('\n\n').filter(p => p.trim().length > 0).map(p => `<p>${p.trim()}</p>`).join('');
  }

  contentEl.innerHTML = `
    ${paragraphs}
    <div style="margin-top:1.25rem; padding-top:0.75rem; border-top:1px dashed var(--border); font-size:0.75rem; color:var(--text-dim); text-align:right;">
      Source : ${sourceLabel}
    </div>
  `;
}

function populateEcoDiagnostic(sp) {
  const container = document.getElementById('sheetEcoDiag');
  container.innerHTML = `
    <div class="sheet-info-card">
      <span class="sheet-info-lbl">Grand Pôle Biologique</span>
      <span class="sheet-info-val" style="color:var(--accent-cyan);">${vernMap[sp.taxonomy.kingdom] || sp.taxonomy.kingdom}</span>
    </div>
    <div class="sheet-info-card">
      <span class="sheet-info-lbl">Ordre naturaliste</span>
      <span class="sheet-info-val">${vernMap[sp.taxonomy.order] || sp.taxonomy.order || '—'}</span>
    </div>
    <div class="sheet-info-card">
      <span class="sheet-info-lbl">Famille</span>
      <span class="sheet-info-val">${sp.taxonomy.family || '—'}</span>
    </div>
    <div class="sheet-info-card">
      <span class="sheet-info-lbl">Fréquence de contact</span>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.2rem;">
        <span class="sheet-info-val" style="color:var(--accent-emerald);">${sp.obs_count || 1} relevé(s)</span>
        <button class="btn-open-photos-modal" onclick="openSpeciesPhotosModal('${sp.id}')">📷 Clichés (${sp.obs_count || 1})</button>
      </div>
    </div>
  `;
}

function populateTaxoLineage(sp) {
  const container = document.getElementById('sheetTaxoLineage');
  container.innerHTML = '';

  const ranks = [
    { key: 'kingdom', label: 'Règne' },
    { key: 'phylum', label: 'Embranchement' },
    { key: 'class', label: 'Classe' },
    { key: 'order', label: 'Ordre' },
    { key: 'family', label: 'Famille' },
    { key: 'genus', label: 'Genre' }
  ];

  ranks.forEach(r => {
    const val = sp.taxonomy[r.key];
    if (val) {
      const row = document.createElement('div');
      row.className = 'sheet-lineage-row';
      row.innerHTML = `
        <span class="sheet-lineage-rank">${r.label}</span>
        <span class="sheet-lineage-name">${val}</span>
        <span class="sheet-lineage-vern">${vernMap[val] || ''}</span>
      `;
      container.appendChild(row);
    }
  });

  const spRow = document.createElement('div');
  spRow.className = 'sheet-lineage-row';
  spRow.style.borderColor = 'var(--accent-cyan)';
  spRow.innerHTML = `
    <span class="sheet-lineage-rank" style="color:var(--accent-cyan);">Espèce</span>
    <span class="sheet-lineage-name" style="color:var(--accent-cyan); font-weight:800;">${sp.scientific_name}</span>
    <span class="sheet-lineage-vern" style="color:#fff;">${sp.common_name || ''}</span>
  `;
  container.appendChild(spRow);
}

function populateFieldData(sp) {
  const container = document.getElementById('sheetFieldData');
  container.innerHTML = `
    <div class="sheet-info-card">
      <span class="sheet-info-lbl">Dernière station observée</span>
      <span class="sheet-info-val">${sp.place || 'Station non géolocalisée'}</span>
    </div>
    <div class="sheet-info-card">
      <span class="sheet-info-lbl">Date du relevé</span>
      <span class="sheet-info-val">${sp.last_observed || 'Non datée'}</span>
    </div>
    <div class="sheet-info-card">
      <span class="sheet-info-lbl">Coordonnées GPS</span>
      <span class="sheet-info-val" style="font-family:monospace; font-size:0.85rem;">
        ${sp.coordinates && sp.coordinates.lat ? `${sp.coordinates.lat.toFixed(4)}°N,${sp.coordinates.lng.toFixed(4)}°E` : '—'}
      </span>
    </div>
    <div class="sheet-info-card">
      <span class="sheet-info-lbl">Total des relevés</span>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.2rem;">
        <span class="sheet-info-val" style="color:var(--accent-emerald);">${sp.obs_count || 1} fois</span>
        <button class="btn-open-photos-modal" onclick="openSpeciesPhotosModal('${sp.id}')">📷 Clichés (${sp.obs_count || 1})</button>
      </div>
    </div>
  `;
}

function populateRelatedSpecies(sp) {
  const container = document.getElementById('sheetRelatedGrid');
  container.innerHTML = '';

  const genus = sp.taxonomy.genus;
  const family = sp.taxonomy.family;

  let related = globalSpeciesData.filter(s => s.id !== sp.id && s.taxonomy.genus === genus);
  let titleText = `Autres espèces du genre ${genus}`;

  if (related.length === 0 && family) {
    related = globalSpeciesData.filter(s => s.id !== sp.id && s.taxonomy.family === family);
    titleText = `Autres espèces de la famille des ${family}`;
  }

  document.getElementById('sheetRelatedTitle').innerText = `${titleText} (${related.length} dans la collection)`;

  if (related.length === 0) {
    container.innerHTML = `<div style="color:var(--text-dim); padding:1rem;">Seul représentant de cette lignée dans la collection.</div>`;
    return;
  }

  related.slice(0, 12).forEach(relSp => {
    container.appendChild(createOriginalGalleryCard(relSp));
  });
}

// ========================================================
// 7. MODALE DE MOSAÏQUE DES PHOTOS DE L'ESPÈCE & SWITCH EN GRAND
// ========================================================
function openSpeciesPhotosModal(speciesId) {
  if (!globalSpeciesData) return;
  const sp = globalSpeciesData.find(s => String(s.id) === String(speciesId));
  if (!sp) return;

  const modal = document.getElementById('obsPhotosModal');
  document.getElementById('obsPhotosModalTitle').innerText = `${sp.scientific_name} (cliquer pour afficher en grand)`;

  const grid = document.getElementById('obsPhotosModalGrid');
  grid.innerHTML = '';

  // Trouve toutes les observations répertoriées sous ce même nom scientifique
  const allSightings = globalSpeciesData.filter(s => s.scientific_name === sp.scientific_name);

  allSightings.forEach((sighting, idx) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    const thumb = sighting.photo_url || sp.photo_url || 'https://via.placeholder.com/200x200/080c14/475569?text=?';

    // AU CLIC : BASCULE DE LA PHOTO DU VOLET GAUCHE EN GRAND FORMAT
    card.onclick = () => {
      document.getElementById('sheetHeroImg').src = thumb;
      // Met à jour la station et la date dans l'onglet terrain si dispo
      populateFieldData(sighting);
      closeObsPhotosModal();
    };

    card.innerHTML = `
      <img class="gallery-photo" src="${thumb}" alt="" loading="lazy" />
      <div class="gallery-overlay"></div>
      <div class="gallery-text">
        <span class="gallery-latin">Cliché #${idx + 1}</span>
        <span class="gallery-vern">${sighting.place ? sighting.place.split(',')[0] : 'Station'}</span>
        <span class="gallery-meta">${sighting.last_observed || 'Non daté'}</span>
      </div>
    `;
    grid.appendChild(card);
  });

  modal.classList.add('open');
}

function closeObsPhotosModal() {
  document.getElementById('obsPhotosModal').classList.remove('open');
}
