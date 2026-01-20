const EDIT_MODE_ENABLED = false;

const listEl = document.querySelector('[data-records]');
const countEl = document.querySelector('[data-count]');
const searchEl = document.querySelector('[data-search]');
const clearSearchEl = document.querySelector('[data-clear-search]');
const photoOnlyEl = document.querySelector('[data-photo-only]');
const totalCountEl = document.querySelector('[data-total-count]');
const photoCountEl = document.querySelector('[data-photo-count]');
const modalEl = document.querySelector('[data-modal]');
const modalImg = modalEl ? modalEl.querySelector('img') : null;
const modalName = modalEl ? modalEl.querySelector('[data-modal-name]') : null;
const modalDates = modalEl ? modalEl.querySelector('[data-modal-dates]') : null;
const modalInscription = modalEl ? modalEl.querySelector('[data-modal-inscription]') : null;
const modalClose = modalEl ? modalEl.querySelector('[data-modal-close]') : null;
const modalPrev = modalEl ? modalEl.querySelector('[data-modal-prev]') : null;
const modalNext = modalEl ? modalEl.querySelector('[data-modal-next]') : null;
const modalCounter = modalEl ? modalEl.querySelector('[data-modal-counter]') : null;
const mapModalEl = document.querySelector('[data-map-modal]');
const mapModalName = mapModalEl ? mapModalEl.querySelector('[data-map-modal-name]') : null;
const mapModalImg = mapModalEl ? mapModalEl.querySelector('[data-map-image]') : null;
const mapModalMarker = mapModalEl ? mapModalEl.querySelector('[data-map-marker]') : null;
const mapModalClose = mapModalEl ? mapModalEl.querySelector('[data-map-modal-close]') : null;
const mapEl = document.querySelector('#cemetery-map');

let currentPhotos = [];
let currentPhotoIndex = 0;

const revealEls = document.querySelectorAll('[data-reveal]');
let records = [];
let mapInstance = null;
let activeMarker = null;
const markersById = new Map();
let editMode = false;
const modifiedCoords = new Map();
let mapModalRecord = null;
let mapModalObserver = null;

const mapConfig = {
  imageUrl: 'images/basemap.png',
  editImageUrl: 'images/aerial-map.png',
  imageSize: { width: 4096, height: 3073 },
  fenceGps: {
    nw: { lat: 29.9407406334, lon: -97.7061823844 },
    ne: { lat: 29.9407144995, lon: -97.7045817688 },
    sw: { lat: 29.9397086824, lon: -97.7061914305 },
    se: { lat: 29.9396825485, lon: -97.7045908149 }
  },
  fencePixels: {
    nw: { x: 0, y: 0 },
    ne: { x: 4095, y: 0 },
    sw: { x: 0, y: 3072 },
    se: { x: 4095, y: 3072 }
  }
};

const gpsToImage = (lat, lon) => {
  const { fenceGps, fencePixels } = mapConfig;
  const lonMin = Math.min(fenceGps.nw.lon, fenceGps.ne.lon, fenceGps.se.lon, fenceGps.sw.lon);
  const lonMax = Math.max(fenceGps.nw.lon, fenceGps.ne.lon, fenceGps.se.lon, fenceGps.sw.lon);
  const latMin = Math.min(fenceGps.nw.lat, fenceGps.ne.lat, fenceGps.se.lat, fenceGps.sw.lat);
  const latMax = Math.max(fenceGps.nw.lat, fenceGps.ne.lat, fenceGps.se.lat, fenceGps.sw.lat);

  const xRange = fencePixels.ne.x - fencePixels.nw.x;
  const yRange = fencePixels.sw.y - fencePixels.nw.y;
  const x = fencePixels.nw.x + ((lon - lonMin) / (lonMax - lonMin)) * xRange;
  const y = fencePixels.nw.y + ((latMax - lat) / (latMax - latMin)) * yRange;

  return { x, y };
};

const imageToGps = (x, y) => {
  const { fenceGps, fencePixels } = mapConfig;
  const lonMin = Math.min(fenceGps.nw.lon, fenceGps.ne.lon, fenceGps.se.lon, fenceGps.sw.lon);
  const lonMax = Math.max(fenceGps.nw.lon, fenceGps.ne.lon, fenceGps.se.lon, fenceGps.sw.lon);
  const latMin = Math.min(fenceGps.nw.lat, fenceGps.ne.lat, fenceGps.se.lat, fenceGps.sw.lat);
  const latMax = Math.max(fenceGps.nw.lat, fenceGps.ne.lat, fenceGps.se.lat, fenceGps.sw.lat);

  const xRange = fencePixels.ne.x - fencePixels.nw.x;
  const yRange = fencePixels.sw.y - fencePixels.nw.y;

  const lon = lonMin + ((x - fencePixels.nw.x) / xRange) * (lonMax - lonMin);
  const lat = latMax - ((y - fencePixels.nw.y) / yRange) * (latMax - latMin);

  return { lat, lon };
};

const updateMapHeight = () => {
  const { width, height } = mapConfig.imageSize;
  const containerWidth = mapEl.clientWidth || width;
  const containerHeight = Math.round(containerWidth * (height / width));
  mapEl.style.height = `${containerHeight}px`;
};

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.01 }
  );

  revealEls.forEach((el, index) => {
    el.style.setProperty('--delay', `${Math.min(index * 90, 600)}ms`);
    observer.observe(el);
  });
} else {
  revealEls.forEach((el, index) => {
    el.style.setProperty('--delay', `${Math.min(index * 90, 600)}ms`);
    el.classList.add('is-visible');
  });
}

const normalize = (value) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const getDisplayName = (record) => {
  if (record.first_name && record.last_name) {
    return `${record.last_name}, ${record.first_name}`;
  }
  return record.last_name || record.first_name || '';
};
const updateClearState = () => {
  if (!clearSearchEl) return;
  const hasValue = searchEl.value.trim().length > 0;
  clearSearchEl.hidden = !hasValue;
};

const loadRecords = () => {
  const data = window.POLONIA_RECORDS;
  if (!Array.isArray(data)) {
    throw new Error('Records data not found. Check assets/records.js.');
  }
  return data.map((record, index) => {
    const photos = Array.isArray(record.photos)
      ? record.photos
      : record.image
        ? [record.image]
        : [];
    return {
      ...record,
      photos,
      coords: record.coords || null,
      id: record.id || `record-${index}`
    };
  });
};

const updateCounts = () => {
  const totalCount = records.length;
  const photoCount = records.filter((record) => record.photos.length).length;

  if (totalCountEl) totalCountEl.textContent = totalCount;
  if (photoCountEl) photoCountEl.textContent = photoCount;
};

const showPhoto = (index) => {
  if (!currentPhotos.length || !modalImg) return;
  currentPhotoIndex = index;
  modalImg.src = `images/${currentPhotos[currentPhotoIndex]}`;

  if (modalCounter) {
    if (currentPhotos.length > 1) {
      modalCounter.textContent = `${currentPhotoIndex + 1} of ${currentPhotos.length}`;
      modalCounter.hidden = false;
    } else {
      modalCounter.hidden = true;
    }
  }

  if (modalPrev) modalPrev.hidden = currentPhotos.length <= 1;
  if (modalNext) modalNext.hidden = currentPhotos.length <= 1;
};

const openPhoto = (record) => {
  if (!record.photos.length || !modalEl || !modalImg || !modalName) return;
  currentPhotos = record.photos;
  currentPhotoIndex = 0;

  const displayName = getDisplayName(record);
  modalImg.alt = `Headstone photo for ${displayName}`;
  modalName.textContent = displayName;

  if (modalDates) {
    if (record.birth_date || record.death_date) {
      const birth = record.birth_date || '?';
      const death = record.death_date || '?';
      modalDates.textContent = `${birth} – ${death}`;
      modalDates.hidden = false;
    } else {
      modalDates.textContent = '';
      modalDates.hidden = true;
    }
  }

  if (modalInscription) {
    const lines = Array.isArray(record.inscription) ? record.inscription : [];
    modalInscription.replaceChildren();
    if (lines.length) {
      lines.forEach((line) => {
        const lineEl = document.createElement('p');
        lineEl.textContent = line;
        modalInscription.appendChild(lineEl);
      });
      modalInscription.hidden = false;
    } else {
      modalInscription.hidden = true;
    }
  }

  showPhoto(0);

  modalEl.classList.add('is-open');
  modalEl.setAttribute('aria-hidden', 'false');
};

const nextPhoto = () => {
  if (currentPhotos.length <= 1) return;
  const newIndex = (currentPhotoIndex + 1) % currentPhotos.length;
  showPhoto(newIndex);
};

const prevPhoto = () => {
  if (currentPhotos.length <= 1) return;
  const newIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length;
  showPhoto(newIndex);
};

const buildCard = (record) => {
  const card = document.createElement('div');
  card.className = record.photos.length ? 'record-card has-photo' : 'record-card';

  const nameEl = document.createElement('span');
  nameEl.className = 'record-name';
  nameEl.textContent = getDisplayName(record);

  card.appendChild(nameEl);

  if (record.birth_date || record.death_date) {
    const datesEl = document.createElement('span');
    datesEl.className = 'record-dates';
    const birth = record.birth_date || '?';
    const death = record.death_date || '?';
    datesEl.textContent = `${birth} – ${death}`;
    card.appendChild(datesEl);
  }

  if (record.inscription && record.inscription.length > 0) {
    const inscriptionEl = document.createElement('div');
    inscriptionEl.className = 'record-inscription';
    record.inscription.forEach(line => {
      const lineEl = document.createElement('p');
      lineEl.textContent = line;
      inscriptionEl.appendChild(lineEl);
    });
    card.appendChild(inscriptionEl);
  }

  const metaEl = document.createElement('span');
  metaEl.className = 'record-meta';
  if (record.photos.length) {
    metaEl.textContent = `${record.photos.length} photo${record.photos.length > 1 ? 's' : ''}`;
  } else {
    metaEl.textContent = 'No photo yet';
  }
  card.appendChild(metaEl);

  const actions = document.createElement('div');
  actions.className = 'record-actions';

  const photoButton = document.createElement('button');
  photoButton.className = 'record-button';
  photoButton.type = 'button';
  if (record.photos.length > 1) {
    photoButton.textContent = 'View photos';
  } else if (record.photos.length === 1) {
    photoButton.textContent = 'View photo';
  } else {
    photoButton.textContent = 'No photo';
  }
  photoButton.disabled = !record.photos.length;
  if (record.photos.length) {
    photoButton.addEventListener('click', () => openPhoto(record));
  }
  actions.appendChild(photoButton);

  if (record.coords) {
    const mapButton = document.createElement('button');
    mapButton.className = 'record-button ghost';
    mapButton.type = 'button';
    mapButton.textContent = 'View on map';
    mapButton.addEventListener('click', () => locateOnMap(record));
    actions.appendChild(mapButton);
  }

  card.appendChild(actions);
  return card;
};

const render = () => {
  if (!listEl || !searchEl || !photoOnlyEl) return;

  const query = normalize(searchEl.value);
  const photoOnly = photoOnlyEl.checked;

  const filtered = records.filter((record) => {
    if (photoOnly && !record.photos.length) return false;
    if (!query) return true;
    const fullName = getDisplayName(record);
    return normalize(fullName).includes(query);
  });

  listEl.innerHTML = '';
  filtered.forEach((record) => {
    listEl.appendChild(buildCard(record));
  });

  if (countEl) countEl.textContent = `${filtered.length} of ${records.length} records`;
  updateClearState();
};

const setActiveMarker = (marker) => {
  if (activeMarker) {
    activeMarker.setStyle({
      radius: 6,
      color: '#6f2b1c',
      weight: 2,
      fillColor: '#d38b62',
      fillOpacity: 0.9
    });
  }
  activeMarker = marker;
  if (activeMarker) {
    activeMarker.setStyle({
      radius: 8,
      color: '#3b1b12',
      weight: 2,
      fillColor: '#e1a67d',
      fillOpacity: 1
    });
  }
};

const createEditControls = () => {
  const mapSection = mapEl.closest('.section');
  const mapFrame = mapEl.closest('.map-frame');

  const controls = document.createElement('div');
  controls.className = 'map-controls';
  controls.innerHTML = `
    <button class="edit-toggle" type="button">Edit Mode</button>
    <button class="export-btn" type="button" disabled>Export Changes</button>
    <span class="edit-status"></span>
  `;
  mapFrame.parentNode.insertBefore(controls, mapFrame);

  const exportModal = document.createElement('div');
  exportModal.className = 'export-modal';
  exportModal.innerHTML = `
    <div class="export-card">
      <h3>Export Updated Coordinates</h3>
      <p>Copy this JSON and replace the contents of assets/records.js (keep the "window.POLONIA_RECORDS = " prefix).</p>
      <textarea readonly></textarea>
      <div class="export-actions">
        <button class="copy-btn" type="button">Copy to Clipboard</button>
        <button class="close-export-btn" type="button">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(exportModal);

  return {
    toggleBtn: controls.querySelector('.edit-toggle'),
    exportBtn: controls.querySelector('.export-btn'),
    statusEl: controls.querySelector('.edit-status'),
    exportModal,
    exportTextarea: exportModal.querySelector('textarea'),
    copyBtn: exportModal.querySelector('.copy-btn'),
    closeExportBtn: exportModal.querySelector('.close-export-btn')
  };
};

const updateEditStatus = (statusEl, exportBtn) => {
  const count = modifiedCoords.size;
  if (count === 0) {
    statusEl.textContent = '';
    exportBtn.disabled = true;
  } else {
    statusEl.innerHTML = `<strong>${count}</strong> marker${count === 1 ? '' : 's'} modified`;
    exportBtn.disabled = false;
  }
};

const generateExport = () => {
  const updatedRecords = records.map(record => {
    const modified = modifiedCoords.get(record.id);
    const exportRecord = {
      last_name: record.last_name,
      first_name: record.first_name,
      birth_date: record.birth_date || null,
      death_date: record.death_date || null,
      photos: record.photos,
      coords: modified ? { lat: modified.lat, lon: modified.lon } : record.coords,
      inscription: record.inscription || []
    };
    return exportRecord;
  });
  return JSON.stringify(updatedRecords, null, 2);
};

const initMap = (recordsData) => {
  if (!mapEl) return;
  if (!window.L) {
    mapEl.textContent = 'Map failed to load. Please check your connection.';
    return;
  }
  updateMapHeight();

  const { width, height } = mapConfig.imageSize;
  const bounds = L.latLngBounds([0, 0], [height, width]);

  mapInstance = L.map(mapEl, {
    crs: L.CRS.Simple,
    maxBounds: bounds,
    zoomControl: true,
    scrollWheelZoom: true,
    attributionControl: false,
    zoomSnap: 0.1,
    minZoom: -2
  });

  let imageOverlay = L.imageOverlay(mapConfig.imageUrl, bounds).addTo(mapInstance);
  mapInstance.fitBounds(bounds, { padding: [20, 20] });
  mapInstance.setMinZoom(mapInstance.getZoom());

  const controls = EDIT_MODE_ENABLED ? createEditControls() : null;

  const swapImageOverlay = (useEditImage) => {
    const url = useEditImage ? mapConfig.editImageUrl : mapConfig.imageUrl;
    imageOverlay.remove();
    imageOverlay = L.imageOverlay(url, bounds).addTo(mapInstance);
    imageOverlay.bringToBack();
  };

  recordsData.forEach((record) => {
    if (!record.coords) return;
    const point = gpsToImage(record.coords.lat, record.coords.lon);
    const marker = L.circleMarker([height - point.y, point.x], {
      radius: 6,
      color: '#6f2b1c',
      weight: 2,
      fillColor: '#d38b62',
      fillOpacity: 0.9
    }).addTo(mapInstance);

    marker.bindTooltip(getDisplayName(record), {
      direction: 'top',
      offset: [0, -8],
      opacity: 0.9
    });

    marker.on('click', () => {
      setActiveMarker(marker);
      if (!editMode) {
        openPhoto(record);
      }
    });

    if (EDIT_MODE_ENABLED) {
      marker.on('drag', (e) => {
        const latlng = e.target.getLatLng();
        const newGps = imageToGps(latlng.lng, height - latlng.lat);
        modifiedCoords.set(record.id, newGps);
        updateEditStatus(controls.statusEl, controls.exportBtn);
      });
    }

    marker.recordId = record.id;
    markersById.set(record.id, marker);
  });

  if (EDIT_MODE_ENABLED && controls) {
    controls.toggleBtn.addEventListener('click', () => {
      editMode = !editMode;
      controls.toggleBtn.classList.toggle('is-active', editMode);
      controls.toggleBtn.textContent = editMode ? 'Exit Edit Mode' : 'Edit Mode';
      swapImageOverlay(editMode);

      markersById.forEach((marker) => {
        if (editMode) {
          marker.options.draggable = true;
          marker.dragging = new L.Handler.CircleMarkerDrag(marker);
          marker.dragging.enable();
        } else if (marker.dragging) {
          marker.dragging.disable();
        }
      });
    });

    controls.exportBtn.addEventListener('click', () => {
      controls.exportTextarea.value = generateExport();
      controls.exportModal.classList.add('is-open');
    });

    controls.copyBtn.addEventListener('click', () => {
      controls.exportTextarea.select();
      navigator.clipboard.writeText(controls.exportTextarea.value).then(() => {
        controls.copyBtn.textContent = 'Copied!';
        setTimeout(() => { controls.copyBtn.textContent = 'Copy to Clipboard'; }, 2000);
      });
    });

    controls.closeExportBtn.addEventListener('click', () => {
      controls.exportModal.classList.remove('is-open');
    });

    controls.exportModal.addEventListener('click', (e) => {
      if (e.target === controls.exportModal) {
        controls.exportModal.classList.remove('is-open');
      }
    });
  }

  mapInstance.invalidateSize();
  window.addEventListener('resize', () => {
    updateMapHeight();
    mapInstance.invalidateSize();
  });
};

if (window.L) {
  L.Handler.CircleMarkerDrag = L.Handler.extend({
    initialize: function (marker) {
      this._marker = marker;
    },
    addHooks: function () {
      var icon = this._marker._path;
      L.DomEvent.on(icon, 'mousedown', this._onDragStart, this);
      L.DomEvent.on(icon, 'touchstart', this._onDragStart, this);
    },
    removeHooks: function () {
      var icon = this._marker._path;
      L.DomEvent.off(icon, 'mousedown', this._onDragStart, this);
      L.DomEvent.off(icon, 'touchstart', this._onDragStart, this);
    },
    _onDragStart: function (e) {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      this._marker._map.dragging.disable();
      L.DomEvent.on(document, 'mousemove', this._onDrag, this);
      L.DomEvent.on(document, 'touchmove', this._onDrag, this);
      L.DomEvent.on(document, 'mouseup', this._onDragEnd, this);
      L.DomEvent.on(document, 'touchend', this._onDragEnd, this);
    },
    _onDrag: function (e) {
      var event = e.touches ? e.touches[0] : e;
      var newLatLng = this._marker._map.containerPointToLatLng(
        L.point(event.clientX, event.clientY).subtract(
          L.DomUtil.getPosition(this._marker._map._container)
        ).add(
          L.point(this._marker._map._container.getBoundingClientRect().left,
                  this._marker._map._container.getBoundingClientRect().top)
        ).subtract(
          L.point(this._marker._map._container.getBoundingClientRect().left,
                  this._marker._map._container.getBoundingClientRect().top)
        )
      );
      var containerPoint = L.point(
        event.clientX - this._marker._map._container.getBoundingClientRect().left,
        event.clientY - this._marker._map._container.getBoundingClientRect().top
      );
      newLatLng = this._marker._map.containerPointToLatLng(containerPoint);
      this._marker.setLatLng(newLatLng);
      this._marker.fire('drag', { target: this._marker });
    },
    _onDragEnd: function () {
      this._marker._map.dragging.enable();
      L.DomEvent.off(document, 'mousemove', this._onDrag, this);
      L.DomEvent.off(document, 'touchmove', this._onDrag, this);
      L.DomEvent.off(document, 'mouseup', this._onDragEnd, this);
      L.DomEvent.off(document, 'touchend', this._onDragEnd, this);
    }
  });
}

const locateOnMap = (record) => {
  if (!record || !record.coords) return;
  if (mapInstance) {
    const marker = markersById.get(record.id);
    if (!marker) return;
    const targetZoom = Math.max(mapInstance.getZoom(), 1);
    mapInstance.setView(marker.getLatLng(), targetZoom, { animate: true });
    setActiveMarker(marker);
    return;
  }
  if (mapModalEl) {
    openMapModal(record);
  }
};

const closeModal = () => {
  if (!modalEl) return;
  modalEl.classList.remove('is-open');
  modalEl.setAttribute('aria-hidden', 'true');
};

const closeMapModal = () => {
  if (!mapModalEl) return;
  mapModalEl.classList.remove('is-open');
  mapModalEl.setAttribute('aria-hidden', 'true');
  if (mapModalObserver) {
    mapModalObserver.disconnect();
    mapModalObserver = null;
  }
};

const positionMapMarker = () => {
  if (!mapModalRecord || !mapModalImg || !mapModalMarker) return;
  const preview = mapModalImg.closest('.map-preview');
  if (!preview) return;
  const imageWidth = mapModalImg.offsetWidth;
  const imageHeight = mapModalImg.offsetHeight;
  if (!imageWidth || !imageHeight) return;
  const offsetX = mapModalImg.offsetLeft;
  const offsetY = mapModalImg.offsetTop;
  const point = gpsToImage(mapModalRecord.coords.lat, mapModalRecord.coords.lon);
  const x = offsetX + (point.x / mapConfig.imageSize.width) * imageWidth;
  const y = offsetY + (point.y / mapConfig.imageSize.height) * imageHeight;
  mapModalMarker.style.left = `${x}px`;
  mapModalMarker.style.top = `${y}px`;
};

const openMapModal = (record) => {
  if (!mapModalEl || !mapModalMarker) return;
  mapModalRecord = record;
  const displayName = getDisplayName(record);
  if (mapModalName) mapModalName.textContent = displayName;
  if (mapModalImg) {
    mapModalImg.src = mapConfig.imageUrl;
    mapModalImg.alt = `Cemetery map for ${displayName}`;
  }

  mapModalEl.classList.add('is-open');
  mapModalEl.setAttribute('aria-hidden', 'false');
  if (mapModalImg) {
    if (mapModalImg.complete) {
      positionMapMarker();
    } else {
      mapModalImg.onload = () => {
        positionMapMarker();
      };
    }
  }
  if ('ResizeObserver' in window && mapModalImg) {
    if (mapModalObserver) {
      mapModalObserver.disconnect();
    }
    mapModalObserver = new ResizeObserver(() => {
      positionMapMarker();
    });
    mapModalObserver.observe(mapModalImg);
  }
  requestAnimationFrame(positionMapMarker);
};

if (modalClose) {
  modalClose.addEventListener('click', closeModal);
}
if (modalPrev) {
  modalPrev.addEventListener('click', prevPhoto);
}
if (modalNext) {
  modalNext.addEventListener('click', nextPhoto);
}
if (modalEl) {
  modalEl.addEventListener('click', (event) => {
    if (event.target === modalEl) {
      closeModal();
    }
  });
}
if (mapModalClose) {
  mapModalClose.addEventListener('click', closeMapModal);
}
if (mapModalEl) {
  mapModalEl.addEventListener('click', (event) => {
    if (event.target === mapModalEl) {
      closeMapModal();
    }
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
    closeMapModal();
  }
  if (modalEl && modalEl.classList.contains('is-open')) {
    if (event.key === 'ArrowRight') {
      nextPhoto();
    } else if (event.key === 'ArrowLeft') {
      prevPhoto();
    }
  }
});

window.addEventListener('resize', () => {
  if (mapModalEl && mapModalEl.classList.contains('is-open')) {
    positionMapMarker();
  }
});

if (searchEl) {
  searchEl.addEventListener('input', render);
}
if (photoOnlyEl) {
  photoOnlyEl.addEventListener('change', render);
}
if (clearSearchEl && searchEl) {
  clearSearchEl.addEventListener('click', () => {
    searchEl.value = '';
    render();
    searchEl.focus();
  });
}

const init = () => {
  try {
    records = loadRecords();
  } catch (error) {
    console.error(error);
    if (countEl) countEl.textContent = '0 records';
    return;
  }
  updateCounts();
  render();
  initMap(records);
};

init();
