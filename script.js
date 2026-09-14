const DOM = {
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    suggestions: document.getElementById('suggestions'),
    unitToggle: document.getElementById('unitToggle'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    errorMessage: document.getElementById('errorMessage'),
    weatherCurrent: document.getElementById('weatherCurrent'),
    cityName: document.getElementById('cityName'),
    currentDate: document.getElementById('currentDate'),
    weatherIcon: document.getElementById('weatherIcon'),
    tempValue: document.getElementById('tempValue'),
    weatherDesc: document.getElementById('weatherDesc'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    uvIndex: document.getElementById('uvIndex'),
    forecast: document.getElementById('forecast'),
    forecastList: document.getElementById('forecastList')
};

let currentUnit = 'metric';
let currentLat = null;
let currentLon = null;
let searchedCityName = '';

const WMO_CODES = {
    0: { desc: 'Ciel dégagé', icon: '01d' },
    1: { desc: 'Principalement dégagé', icon: '02d' },
    2: { desc: 'Partiellement nuageux', icon: '03d' },
    3: { desc: 'Nuageux', icon: '04d' },
    45: { desc: 'Brumeux', icon: '50d' },
    48: { desc: 'Brouillard givrant', icon: '50d' },
    51: { desc: 'Faible bruine', icon: '09d' },
    53: { desc: 'Bruine modérée', icon: '09d' },
    55: { desc: 'Bruine dense', icon: '09d' },
    56: { desc: 'Faible bruine verglaçante', icon: '09d' },
    57: { desc: 'Bruine verglaçante dense', icon: '09d' },
    61: { desc: 'Faible pluie', icon: '10d' },
    63: { desc: 'Pluie modérée', icon: '10d' },
    65: { desc: 'Forte pluie', icon: '10d' },
    66: { desc: 'Faible pluie verglaçante', icon: '13d' },
    67: { desc: 'Forte pluie verglaçante', icon: '13d' },
    71: { desc: 'Faible neige', icon: '13d' },
    73: { desc: 'Neige modérée', icon: '13d' },
    75: { desc: 'Forte neige', icon: '13d' },
    77: { desc: 'Grésil', icon: '13d' },
    80: { desc: 'Faibles averses', icon: '09d' },
    81: { desc: 'Averses modérées', icon: '09d' },
    82: { desc: 'Fortes averses', icon: '09d' },
    85: { desc: 'Faibles averses de neige', icon: '13d' },
    86: { desc: 'Fortes averses de neige', icon: '13d' },
    95: { desc: 'Orage', icon: '11d' },
    96: { desc: 'Orage avec faible grêle', icon: '11d' },
    99: { desc: 'Orage avec forte grêle', icon: '11d' }
};

function getWeatherInfo(code) {
    return WMO_CODES[code] || { desc: 'Inconnu', icon: '01d' };
}

function isNight() {
    const hour = new Date().getHours();
    return hour < 6 || hour >= 20;
}

function getIconUrl(iconCode) {
    if (isNight()) iconCode = iconCode.replace('d', 'n');
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

function showLoading() {
    DOM.loading.classList.remove('hidden');
    DOM.weatherCurrent.classList.add('hidden');
    DOM.forecast.classList.add('hidden');
    DOM.error.classList.add('hidden');
}

function hideLoading() {
    DOM.loading.classList.add('hidden');
}

function showError(message) {
    DOM.error.classList.remove('hidden');
    DOM.errorMessage.textContent = message;
    hideLoading();
    DOM.weatherCurrent.classList.add('hidden');
    DOM.forecast.classList.add('hidden');
}

function updateUnitToggle() {
    const spans = DOM.unitToggle.querySelectorAll('span');
    if (currentUnit === 'metric') {
        spans[0].className = 'unit-active';
        spans[1].className = 'unit-inactive';
    } else {
        spans[0].className = 'unit-inactive';
        spans[1].className = 'unit-active';
    }
}

function formatDate(timestamp) {
    const date = new Date((timestamp || Date.now()) * 1000);
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

function formatShortDay(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return 'Demain';
    return date.toLocaleDateString('fr-FR', { weekday: 'long' });
}

function getWindDirection(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return dirs[Math.round(deg / 45) % 8];
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

let suggestionIndex = -1;
let suggestionResults = [];

function hideSuggestions() {
    DOM.suggestions.classList.remove('show');
    DOM.suggestions.innerHTML = '';
    suggestionIndex = -1;
    suggestionResults = [];
}

function selectSuggestion(city) {
    hideSuggestions();
    searchedCityName = city.admin1 ? `${city.name}, ${city.admin1}` : city.name;
    DOM.cityName.textContent = searchedCityName;
    fetchWeather(city.latitude, city.longitude);
}

function showSuggestions(results) {
    suggestionResults = results;
    DOM.suggestions.innerHTML = results.map((r, i) => {
        const name = escapeHtml(r.admin1 ? `${r.name}, ${r.admin1}` : r.name);
        const country = escapeHtml(r.country || '');
        return `<li role="option" data-index="${i}" class="${i === 0 ? 'highlighted' : ''}">${name} <span class="suggestion-sub">${country}</span></li>`;
    }).join('');
    DOM.suggestions.classList.add('show');
    suggestionIndex = results.length > 0 ? 0 : -1;
}

async function fetchFromNominatim(query) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&accept-language=fr&addressdetails=1`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'MeteoApp/1.0' } });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || data.length === 0) return null;
        return data.map(r => ({
            name: r.display_name?.split(',')[0] || r.name || query,
            latitude: parseFloat(r.lat),
            longitude: parseFloat(r.lon),
            admin1: r.address?.state || r.address?.region || '',
            country: r.address?.country || ''
        }));
    } catch {
        return null;
    }
}

async function fetchSuggestions(query) {
    const q = query.trim();
    if (q.length < 3) { hideSuggestions(); return; }
    try {
        const url = `${CONFIG.GEOCODING_URL}/search?name=${encodeURIComponent(q)}&count=15&language=fr&format=json`;
        const resp = await fetch(url);
        if (!resp.ok) { hideSuggestions(); return; }
        const data = await resp.json();
        if (data.results && data.results.length > 0) { showSuggestions(data.results); return; }
        const fallback = await fetchFromNominatim(q);
        if (fallback && fallback.length > 0) { showSuggestions(fallback); return; }
        hideSuggestions();
    } catch {
        hideSuggestions();
    }
}

const debouncedSuggest = debounce(fetchSuggestions, 250);

DOM.searchInput.addEventListener('input', e => {
    suggestionIndex = -1;
    debouncedSuggest(e.target.value);
});

DOM.searchInput.addEventListener('keydown', e => {
    const items = DOM.suggestions.querySelectorAll('li');
    if (!DOM.suggestions.classList.contains('show') || items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[suggestionIndex]?.classList.remove('highlighted');
        suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
        items[suggestionIndex]?.classList.add('highlighted');
        items[suggestionIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[suggestionIndex]?.classList.remove('highlighted');
        suggestionIndex = Math.max(suggestionIndex - 1, 0);
        items[suggestionIndex]?.classList.add('highlighted');
        items[suggestionIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && suggestionIndex >= 0) {
        e.preventDefault();
        const city = suggestionResults[suggestionIndex];
        if (city) selectSuggestion(city);
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
});

DOM.suggestions.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const city = suggestionResults[parseInt(li.dataset.index)];
    if (city) selectSuggestion(city);
});

DOM.searchInput.addEventListener('blur', () => setTimeout(hideSuggestions, 200));

async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=fr`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'MeteoApp/1.0' } });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data && data.address) {
            const { city, town, village, county, state } = data.address;
            const cityName = city || town || village || county;
            if (cityName && state) return `${cityName}, ${state}`;
            return cityName || null;
        }
        return null;
    } catch {
        return null;
    }
}

async function fetchWeather(lat, lon) {
    showLoading();
    currentLat = lat;
    currentLon = lon;

    try {
        const tempUnit = currentUnit === 'imperial' ? 'fahrenheit' : 'celsius';
    const params = `latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=${tempUnit}&timezone=auto&forecast_days=6`;
        const resp = await fetch(`${CONFIG.API_BASE_URL}/forecast?${params}`);
        if (!resp.ok) throw new Error('Erreur de récupération des données météo.');
        const data = await resp.json();
        displayCurrent(data);
        displayDaily(data.daily);
    } catch {
        showError('Erreur de récupération des données météo.');
    }
}

function displayCurrent(data) {
    const c = data.current;
    const weather = getWeatherInfo(c.weather_code);
    const temp = Math.round(c.temperature_2m);
    const feelsLike = Math.round(c.apparent_temperature);

    DOM.currentDate.textContent = formatDate(c.time ? new Date(c.time).getTime() / 1000 : Date.now() / 1000);
    DOM.weatherIcon.src = getIconUrl(weather.icon);
    DOM.weatherIcon.alt = weather.desc;
    DOM.tempValue.textContent = temp;
    DOM.weatherDesc.textContent = `${weather.desc} — Ressenti ${feelsLike}°`;

    DOM.humidity.textContent = `${c.relative_humidity_2m}%`;
    const speed = currentUnit === 'metric'
        ? `${Math.round(c.wind_speed_10m * 3.6)} km/h`
        : `${Math.round(c.wind_speed_10m)} mph`;
    DOM.windSpeed.textContent = `${speed} ${getWindDirection(c.wind_direction_10m)}`;
    DOM.uvIndex.textContent = 'N/A';

    hideLoading();
    DOM.weatherCurrent.classList.remove('hidden');
}

function displayDaily(daily) {
    DOM.forecastList.innerHTML = daily.time.slice(1, 6).map((date, i) => {
        const idx = i + 1;
        const weather = getWeatherInfo(daily.weather_code[idx]);
        const max = Math.round(daily.temperature_2m_max[idx]);
        const min = Math.round(daily.temperature_2m_min[idx]);
        return `
            <div class="forecast-card">
                <div class="forecast-day">${formatShortDay(date)}</div>
                <img class="forecast-icon" src="${getIconUrl(weather.icon)}" alt="${weather.desc}" loading="lazy">
                <div class="forecast-temps">
                    <span class="forecast-max">${max}</span>
                    <span class="forecast-min">${min}</span>
                </div>
            </div>
        `;
    }).join('');
    DOM.forecast.classList.remove('hidden');
}

async function searchCity(query) {
    const q = query.trim();
    if (!q) {
        showError('Veuillez entrer un nom de ville.');
        return;
    }
    showLoading();
    try {
        const url = `${CONFIG.GEOCODING_URL}/search?name=${encodeURIComponent(q)}&count=15&language=fr&format=json`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Erreur de recherche.');
        const data = await resp.json();
        let city = data.results?.[0] || null;
        if (!city) {
            const fallback = await fetchFromNominatim(q);
            if (fallback && fallback.length > 0) city = fallback[0];
        }
        if (!city) {
            showError(`Ville "${q}" introuvable.`);
            return;
        }
        searchedCityName = city.admin1 ? `${city.name}, ${city.admin1}` : city.name;
        DOM.cityName.textContent = searchedCityName;
        await fetchWeather(city.latitude, city.longitude);
    } catch {
        showError('Erreur lors de la recherche de la ville.');
    }
}

function getWeatherByCoords(lat, lon) {
    searchedCityName = '';
    DOM.cityName.textContent = 'Position actuelle';
    fetchWeather(lat, lon);
    reverseGeocode(lat, lon).then(name => {
        if (name) {
            searchedCityName = name;
            DOM.cityName.textContent = name;
        }
    });
}

function handleGeolocation() {
    if (!navigator.geolocation) {
        DOM.cityName.textContent = 'Paris';
        fetchWeather(48.8566, 2.3522);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => {
            DOM.cityName.textContent = 'Paris';
            fetchWeather(48.8566, 2.3522);
        },
        { timeout: 5000, enableHighAccuracy: false }
    );
}

function toggleUnit() {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    updateUnitToggle();
    if (currentLat && currentLon) fetchWeather(currentLat, currentLon);
}

DOM.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    searchCity(DOM.searchInput.value);
});

DOM.unitToggle.addEventListener('click', toggleUnit);
updateUnitToggle();
handleGeolocation();
