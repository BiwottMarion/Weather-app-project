const app = document.getElementById("app");
const modalRoot = document.getElementById("modalRoot");
const toast = document.getElementById("toast");

const USERS_KEY = "olivesky_users";
const SESSION_KEY = "olivesky_session";
let users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
let currentUserId = localStorage.getItem(SESSION_KEY);
let currentWeather = null;

// Small functions for saving and loading information.
function saveUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getUser() {
  return users.find(user => user.id === currentUserId);
}

function savePlaces(user) {
  localStorage.setItem(`olivesky_places_${user.id}`, JSON.stringify(user.places));
}

function showMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function updateHeader() {
  const user = getUser();
  document.getElementById("welcomeText").textContent = user ? `Hello, ${user.name}` : "Welcome, guest";
  const button = document.getElementById("accountButton");
  button.textContent = user ? "Sign out" : "Sign in";
  button.onclick = user ? signOut : () => openAccount("login");
}

// Change pages without reloading the whole website.
function render() {
  const page = location.hash || "#/";
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === page);
  });

  updateHeader();
  if (page === "#/dashboard") showDashboard();
  else if (page === "#/saved") showSaved();
  else if (page === "#/about") showAbout();
  else showHome();
}

function showHome() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">A CLEARER VIEW OF YOUR DAY</p>
        <h1>Make every day<br><span>a little brighter.</span></h1>
        <p class="hero-description">Check the weather, explore places and save the locations that matter to you.</p>
        <div class="hero-actions">
          <a class="button button-gold" href="#/dashboard">Explore dashboard →</a>
          <a class="text-link" href="#/about">How it works</a>
        </div>
        <div class="hero-note"><span class="status-dot"></span> Live weather information from Open-Meteo</div>
      </div>
      <div class="hero-art"><div class="sun"></div><div class="cloud cloud-one"></div><div class="cloud cloud-two"></div>
        <div class="art-label"><span>☀</span><div><strong>Fresh perspective</strong><small>One forecast at a time</small></div></div><div class="art-ring"></div>
      </div>
    </section>
    <section class="feature-strip">
      <article><span class="feature-icon">⌕</span><div><h3>Explore places</h3><p>Search for a town or city.</p></div></article>
      <article><span class="feature-icon">☼</span><div><h3>Live forecasts</h3><p>Get current weather details.</p></div></article>
      <article><span class="feature-icon">♡</span><div><h3>Keep favourites</h3><p>Save your favourite places.</p></div></article>
    </section>
    <section class="home-bottom">
      <div><p class="eyebrow">BUILT FOR LEARNING</p><h2>Small steps.<br>Useful features.</h2></div>
      <p>OliveSky is a browser-based project made with HTML, CSS and JavaScript. It uses an outside weather API and browser storage.</p>
      <a class="button button-dark" href="#/about">View project details</a>
    </section>`;
}

function showDashboard() {
  app.innerHTML = `
    <section class="page-section">
      <div class="page-heading"><p class="eyebrow">YOUR WEATHER SPACE</p><h1>Weather dashboard</h1><p>Search for a place to see its latest weather.</p></div>
      <div class="panel">
        <form id="weatherForm" class="search-row">
          <input id="cityInput" placeholder="Enter a city, e.g. Nairobi" required>
          <button class="button button-gold">Search weather →</button>
        </form>
        <div id="weatherResult"><p class="loading">Search for a city to get started.</p></div>
      </div>
    </section>`;

  document.getElementById("weatherForm").addEventListener("submit", event => {
    event.preventDefault(); // Stop the form from refreshing the page.
    findWeather(document.getElementById("cityInput").value.trim());
  });
}

// Get information from the weather API and handle connection errors.
async function getData(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("No connection. Check your internet.");
  }
  if (!response.ok) throw new Error("The weather service is not answering.");
  return response.json();
}

async function findWeather(city) {
  const result = document.getElementById("weatherResult");
  result.innerHTML = `<p class="loading">Searching for ${escapeText(city)}...</p>`;

  try {
    const placeData = await getData(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    if (!placeData.results || placeData.results.length === 0) {
      throw new Error("Place not found. Check the spelling and try again.");
    }

    const place = placeData.results[0];
    const weatherData = await getData(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`
    );

    currentWeather = {
      name: place.name, country: place.country || "",
      latitude: place.latitude, longitude: place.longitude,
      current: weatherData.current
    };
    showWeather(currentWeather);
  } catch (error) {
    console.error(error);
    result.innerHTML = `<p class="error-message">${escapeText(error.message)}</p>`;
  }
}

function showWeather(place) {
  const weather = place.current;
  document.getElementById("weatherResult").innerHTML = `
    <div class="weather-grid">
      <div class="weather-main">
        <div class="city">${escapeText(place.name)}, ${escapeText(place.country)}</div>
        <div class="temperature">${Math.round(weather.temperature_2m)}°</div>
        <div class="weather-condition">Feels like ${Math.round(weather.apparent_temperature)}°C</div>
      </div>
      <div class="weather-stats">
        <div class="stat"><span>Humidity</span><strong>${weather.relative_humidity_2m}%</strong></div>
        <div class="stat"><span>Wind speed</span><strong>${weather.wind_speed_10m} km/h</strong></div>
        <div class="stat"><span>Latitude</span><strong>${place.latitude.toFixed(2)}</strong></div>
        <div class="stat"><span>Longitude</span><strong>${place.longitude.toFixed(2)}</strong></div>
      </div>
    </div>
    <p style="color:var(--muted);font-size:10px">Updated: ${escapeText(weather.time)} · Open-Meteo</p>
    <button class="button button-dark" data-action="save">♡ Save this place</button>`;
}

function savePlace() {
  const user = getUser();
  if (!user) {
    showMessage("Please sign in before saving a place.");
    openAccount("login");
    return;
  }
  if (user.places.some(place => place.name === currentWeather.name)) {
    showMessage("This place is already saved.");
    return;
  }
  user.places.push(currentWeather);
  savePlaces(user);
  showMessage("Place saved!");
}

function showSaved() {
  const user = getUser();
  if (!user) {
    app.innerHTML = `<section class="page-section"><div class="page-heading"><h1>Saved places</h1><p>Sign in to see your saved locations.</p></div><div class="empty-state"><button class="button button-gold" data-action="login">Sign in</button></div></section>`;
    return;
  }

  const cards = user.places.map((place, index) => `
    <article class="saved-card"><h3>${escapeText(place.name)}</h3><p>${escapeText(place.country)}</p>
      <button data-action="remove" data-index="${index}">Remove</button></article>`).join("");

  app.innerHTML = `<section class="page-section"><div class="page-heading"><h1>Saved places</h1><p>Your favourite locations.</p></div>
    ${cards ? `<div class="saved-list">${cards}</div>` : `<div class="empty-state"><p>You have not saved any places yet.</p><a class="button button-gold" href="#/dashboard">Find a place</a></div>`}
    </section>`;
}

function showAbout() {
  app.innerHTML = `
    <section class="page-section">
      <div class="page-heading"><p class="eyebrow">BEHIND THE PROJECT</p><h1>About OliveSky</h1><p>A simple weather application made for learning.</p></div>
      <div class="info-grid">
        <article class="info-card"><h3>Separate screens</h3><p>JavaScript changes pages using the address after the # sign.</p></article>
        <article class="info-card"><h3>Weather API</h3><p>Open-Meteo provides location and weather information.</p></article>
        <article class="info-card"><h3>Browser storage</h3><p>Demo accounts and saved places are stored in localStorage.</p></article>
      </div>
      <div class="panel" style="margin-top:18px"><h2>About SQL and security</h2>
        <p>SQL is not needed in this version because the app runs in the browser. A real SaaS application needs a backend and a database such as MySQL. Browser-only login is for practice and is not secure enough for real users.</p>
      </div>
    </section>`;
}

// Show the sign-up or sign-in form.
function openAccount(mode) {
  const signup = mode === "signup";
  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop"><section class="modal">
      <button class="modal-close" data-action="close">×</button>
      <p class="eyebrow">OLIVESKY ACCOUNT</p><h2>${signup ? "Create an account" : "Welcome back"}</h2>
      <p>${signup ? "Create an account to save places." : "Sign in to view your saved places."}</p>
      <form id="accountForm">
        ${signup ? `<label class="field-label">Your name</label><input id="nameInput" required>` : ""}
        <label class="field-label">Email address</label><input id="emailInput" type="email" required>
        <label class="field-label">Password</label><input id="passwordInput" type="password" required minlength="4">
        <button class="button button-gold">${signup ? "Create account" : "Sign in"}</button>
      </form>
      <p>${signup ? "Already registered?" : "New to OliveSky?"}
        <span class="modal-switch" data-action="switch" data-mode="${signup ? "login" : "signup"}">${signup ? "Sign in" : "Create an account"}</span></p>
      <p class="error-message">Demo only: do not use a real password.</p>
    </section></div>`;

  document.getElementById("accountForm").addEventListener("submit", handleAccount);
  document.getElementById("modalBackdrop").addEventListener("click", event => {
    if (event.target.id === "modalBackdrop") closeModal();
  });
}

async function handleAccount(event) {
  event.preventDefault();
  const name = document.getElementById("nameInput")?.value.trim();
  const email = document.getElementById("emailInput").value.trim().toLowerCase();
  const password = await makeHash(document.getElementById("passwordInput").value);

  if (name) {
    if (users.some(user => user.email === email)) {
      showMessage("This email is already registered.");
      return;
    }
    const user = { id: Date.now().toString(), name, email, password, places: [] };
    users.push(user);
    saveUsers();
    currentUserId = user.id;
    localStorage.setItem(SESSION_KEY, currentUserId);
    savePlaces(user);
  } else {
    const user = users.find(item => item.email === email && item.passwordHash === password);
    if (!user) {
      showMessage("Email or password is incorrect.");
      return;
    }
    currentUserId = user.id;
    user.places = JSON.parse(localStorage.getItem(`olivesky_places_${user.id}`) || "[]");
    localStorage.setItem(SESSION_KEY, currentUserId);
  }

  closeModal();
  render();
  showMessage("You are signed in.");
}

function signOut() {
  currentUserId = null;
  localStorage.removeItem(SESSION_KEY);
  render();
  showMessage("You have signed out.");
}

function closeModal() {
  modalRoot.innerHTML = "";
}


// A small hash for this practice project. It does not make browser login secure.
async function makeHash(value) {
  if (window.crypto && crypto.subtle) {
    const bytes = new TextEncoder().encode(value);
    const result = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(result)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  return btoa(value);
}

// Keep user-entered text from being treated as HTML code.
function escapeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

// One click listener also works for buttons added later by JavaScript.
document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  if (button.dataset.action === "save") savePlace();
  if (button.dataset.action === "login") openAccount("login");
  if (button.dataset.action === "close") closeModal();
  if (button.dataset.action === "switch") openAccount(button.dataset.mode);

  if (button.dataset.action === "remove") {
    const user = getUser();
    user.places.splice(Number(button.dataset.index), 1);
    savePlaces(user);
    showSaved();
  }
});

window.addEventListener("hashchange", render);
document.getElementById("menuButton").addEventListener("click", () => {
  document.querySelector(".main-nav").classList.toggle("open");
});
document.querySelectorAll(".main-nav a").forEach(link => {
  link.addEventListener("click", () => document.querySelector(".main-nav").classList.remove("open"));
});

// Restore the last signed-in account's saved places.
if (getUser()) {
  const user = getUser();
  user.places = JSON.parse(localStorage.getItem(`olivesky_places_${user.id}`) || "[]");
}
render();
