const form = document.getElementById('search-form');
const queryInput = document.getElementById('query');
const statusEl = document.getElementById('status');

const map = L.map('map').setView([-25.2744, 133.7751], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

let resultMarker;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b42318' : '#526170';
}

async function geocodeLocation(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed (${response.status})`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  return results[0];
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const query = queryInput.value.trim();
  if (!query) {
    setStatus('Please enter a suburb or postcode.', true);
    return;
  }

  setStatus(`Searching for "${query}"...`);

  try {
    const result = await geocodeLocation(query);

    if (!result) {
      setStatus(`No map location found for "${query}". Try a different suburb or postcode.`, true);
      return;
    }

    const lat = Number(result.lat);
    const lon = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setStatus('Location data was invalid. Please try another search.', true);
      return;
    }

    if (resultMarker) {
      map.removeLayer(resultMarker);
    }

    resultMarker = L.marker([lat, lon]).addTo(map);
    resultMarker.bindPopup(`<strong>${result.display_name}</strong>`).openPopup();
    map.setView([lat, lon], 12);

    setStatus(`Showing result for "${query}".`);
  } catch (error) {
    console.error(error);
    setStatus('Something went wrong while searching. Please try again shortly.', true);
  }
});
