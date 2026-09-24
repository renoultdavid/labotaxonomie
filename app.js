/* ==========================================================================
   OBSERVATOIRE DU VIVANT • app.js
   Alignement taxons terminaux (is_terminal_leaf) & navigation synchronisée
   ========================================================================== */

let rawData = [];
let filteredData = [];
let activeTaxon = null;
let map = null;
let markersLayer = null;

// Initialisation au chargement du document
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    rawData = await response.json();
    
    // Détermination stricte des taxons terminaux
    filteredData = rawData.filter(isSpeciesTerminal);
    
    updateGlobalCounters();
    initMap();
    renderGallery(filteredData);
    setupSearch();
    setupFilters();
  } catch (error) {
    console.error("Impossible de charger data.json :", error);
  }
}

// Règle d'alignement avec iNaturalist
function isSpeciesTerminal(sp) {
  if (!sp) return false;
  // S'appuie sur le flag calculé dans le CSV
  if (typeof sp.is_terminal_leaf !== 'undefined') {
    return sp.is_terminal_leaf === true;
  }
  // Secours au cas où la propriété manque
  const name = (sp.scientific_name || '').trim();
  const broadRoots = ['Animalia', 'Plantae', 'Fungi', 'Arthropoda', 'Chordata', 'Insecta', 'Aves', 'Reptilia', 'Amphibia', 'Mammalia'];
  if (broadRoots.includes(name)) return false;
  
  const parts = name.split(/\s+/);
  if (parts.length === 1) return false;
  if (parts.length === 2 && ['sp.', 'sp', 'indet.'].includes(parts[1].toLowerCase())) {
    return false;
  }
  return true;
}

// Mise à jour des compteurs du tableau de bord
function updateGlobalCounters() {
  const speciesCountEl = document.getElementById('stat-species-count') || document.getElementById('speciesCount');
  const obsCountEl = document.getElementById('stat-obs-count') || document.getElementById('obsCount');

  const totalTerminalSpecies = filteredData.length;
  const totalObs = rawData.reduce((acc, curr) => acc + (curr.obs_count || 1), 0);

  if (speciesCountEl) {
    speciesCountEl.textContent = totalTerminalSpecies.toLocaleString('fr-FR');
  }
  if (obsCountEl) {
    obsCountEl.textContent = totalObs.toLocaleString('fr-FR');
  }
}

// Rendu de la galerie de vignettes
function renderGallery(items) {
  const container = document.getElementById('galleryContainer') || document.getElementById('speciesList');
  if (!container) return;

  container.innerHTML = '';
  const slice = items.slice(0, 100); // Rendu des 100 premiers éléments pour fluidité

  slice.forEach(item => {
    const card = document.createElement('div');
    card.className = 'species-card';
    card.innerHTML = `
      <div class="card-thumb" style="background-image: url('${item.photo_url || ''}')"></div>
      <div class="card-info">
        <div class="card-sci-name">${item.scientific_name}</div>
        <div class="card-com-name">${item.common_name || ''}</div>
        <div class="card-obs-count">${item.obs_count || 1} obs.</div>
      </div>
    `;
    card.addEventListener('click', () => selectTaxon(item));
    container.appendChild(card);
  });
}

// Sélection d'un taxon et synchronisation carte / volet latéral
function selectTaxon(item) {
  activeTaxon = item;

  const panel = document.getElementById('detailPanel');
  if (panel) {
    panel.innerHTML = `
      <h2>${item.scientific_name}</h2>
      <h3>${item.common_name || ''}</h3>
      <p><strong>Dernière observation :</strong> ${item.last_observed || 'N/C'}</p>
      <p><strong>Lieu :</strong> ${item.place || 'N/C'}</p>
      <p><strong>Observations :</strong> ${item.obs_count || 1}</p>
      ${item.photo_url ? `<img src="${item.photo_url}" style="width:100%; border-radius:8px; margin-top:10px;" />` : ''}
    `;
  }

  if (map && item.coordinates && item.coordinates.lat && item.coordinates.lng) {
    map.setView([item.coordinates.lat, item.coordinates.lng], 9);
    L.popup()
      .setLatLng([item.coordinates.lat, item.coordinates.lng])
      .setContent(`<b>${item.scientific_name}</b><br>${item.place || ''}`)
      .openOn(map);
  }
}

// Initialisation de la carte Leaflet
function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  map = L.map('map').setView([42.15, 9.35], 8); // Coordonnées centrées par défaut (ex. Corse)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  plotMarkers();
}

// Placement des marqueurs
function plotMarkers() {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  filteredData.forEach(item => {
    if (item.coordinates && item.coordinates.lat && item.coordinates.lng) {
      const marker = L.circleMarker([item.coordinates.lat, item.coordinates.lng], {
        radius: 4,
        fillColor: '#38bdf8',
        color: '#0284c7',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6
      });

      marker.bindPopup(`<b>${item.scientific_name}</b><br>${item.common_name || ''}<br>${item.place || ''}`);
      marker.on('click', () => selectTaxon(item));
      markersLayer.addLayer(marker);
    }
  });
}

// Recherche instantanée
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) {
      renderGallery(filteredData);
      return;
    }

    const filtered = filteredData.filter(item => {
      const sci = (item.scientific_name || '').toLowerCase();
      const com = (item.common_name || '').toLowerCase();
      const pl = (item.place || '').toLowerCase();
      return sci.includes(val) || com.includes(val) || pl.includes(val);
    });

    renderGallery(filtered);
  });
}

// Filtres taxonomiques
function setupFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const realm = btn.dataset.realm;
      if (!realm || realm === 'all') {
        renderGallery(filteredData);
      } else {
        const filtered = filteredData.filter(item => {
          return item.taxonomy && item.taxonomy.kingdom && item.taxonomy.kingdom.toLowerCase() === realm.toLowerCase();
        });
        renderGallery(filtered);
      }
    });
  });
}
