const form = document.getElementById('search-form');
const queryInput = document.getElementById('query');
const suggestionsList = document.getElementById('postcode-suggestions');
const statusEl = document.getElementById('status');

const map = L.map('map').setView([-25.2744, 133.7751], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

let resultMarker;
let suggestionTimer;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b42318' : '#526170';
}

function isPostcodeQuery(query) {
  return /^\d{2,4}$/.test(query);
}

function extractSuggestionLabel(result) {
  const address = result.address || {};
  const suburb = address.suburb || address.town || address.city || address.village || address.hamlet || 'Unknown suburb';
  const postcode = address.postcode || '';

  if (!postcode) {
    return null;
  }

  return `${postcode} - ${suburb}`;
}

function clearSuggestions() {
  suggestionsList.innerHTML = '';
}

function openSuggestionDropdown() {
  if (document.activeElement !== queryInput) {
    return;
  }

  if (typeof queryInput.showPicker === 'function') {
    queryInput.showPicker();
  }
}

async function geocodeLocation(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'au');

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

async function fetchPostcodeSuggestions(postcodeFragment) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', postcodeFragment);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '8');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'au');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Suggestion lookup failed (${response.status})`);
  }

  const results = await response.json();
  return Array.isArray(results) ? results : [];
}

queryInput.addEventListener('input', () => {
  const query = queryInput.value.trim();

  if (suggestionTimer) {
    window.clearTimeout(suggestionTimer);
  }

  if (!isPostcodeQuery(query)) {
    clearSuggestions();
    return;
  }

  suggestionTimer = window.setTimeout(async () => {
    try {
      const results = await fetchPostcodeSuggestions(query);
      const seen = new Set();
      const suggestions = [];

      for (const result of results) {
        const label = extractSuggestionLabel(result);
        if (!label || seen.has(label)) {
          continue;
        }

        seen.add(label);
        const [postcode, suburb] = label.split(' - ');
        suggestions.push({ postcode, suburb: suburb || '' });
      }

      suggestionsList.innerHTML = '';
      for (const suggestion of suggestions) {
        const option = document.createElement('option');
        option.value = suggestion.postcode;
        option.label = suggestion.suburb ? `${suggestion.postcode} - ${suggestion.suburb}` : suggestion.postcode;
        suggestionsList.appendChild(option);
      }

      if (suggestions.length > 0) {
        openSuggestionDropdown();
      }
    } catch (error) {
      console.error(error);
      clearSuggestions();
    }
  }, 250);
});

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
