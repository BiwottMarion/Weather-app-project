/*
  OliveSky - a small browser-only weather dashboard.
  This is a learning/demo project, not secure production authentication.
*/

const USERS_KEY = "olivesky_demo_users";
const SESSION_KEY = "olivesky_demo_session";

// All browser storage is handled in this one small object.
// Each user's saved places have their own key containing that user's ID.
const storage = {
  readUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (error) {
      console.error("Could not read the user list:", error);
      return [];
    }
  },
  writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },
  readSession() {
    return localStorage.getItem(SESSION_KEY);
  },
  writeSession(userId) {
    if (userId) {
      localStorage.setItem(SESSION_KEY, userId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },
  readUserData(userId) {
    try {
      return JSON.parse(localStorage.getItem(`olivesky_user_${userId}`)) || { saved: [] };
    } catch (error) {
      console.error("Could not read this user's saved places:", error);
      return { saved: [] };
    }
  },
  writeUserData(userId, data) {
    localStorage.setItem(`olivesky_user_${userId}`, JSON.stringify(data));
  }
};

let appData = {
  users: storage.readUsers(),
  currentUser: storage.readSession()
};
let currentWeather = null;

const app = document.getElementById("app");
const modalRoot = document.getElementById("modalRoot");
const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function currentUser() {
  const user = appData.users.find(item => item.id === appData.currentUser);
  if (!user) return null;

  // Load only this signed-in user's information.
  user.saved = storage.readUserData(user.id).saved || [];
  return user;
}

function updateHeader() {
  const user = currentUser();
  document.getElementById("welcomeText").textContent = user ? `Hello, ${user.name}` : "Welcome, guest";
  const button = document.getElementById("accountButton");
  button.textContent = user ? "Sign out" : "Sign in";
  button.onclick = user ? signOut : () => openAuthModal("login");
}

function setActiveNav() {
  const route = location.hash || "#/";
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === route);
  });
}

function render() {
  const route = (location.hash || "#/").replace("#", "");
  setActiveNav();
  updateHeader();

  if (route === "/" || route === "") {
    renderHome();
  } else if (route === "/dashboard") {
    renderDashboard();
  } else if (route === "/saved") {
    renderSaved();
  } else if (route === "/about") {
    renderAbout();
  } else {
    app.innerHTML = `<section class="page-section"><div class="empty-state"><h2>Page not found</h2><p>That page does not exist.</p><a class="button button-dark" href="#/">Return home</a></div></section>`;
  }
}

function renderHome() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">A CLEARER VIEW OF YOUR DAY</p>
        <h1>Make every day<br><span>a little brighter.</span></h1>
        <p class="hero-description">A calm, simple weather dashboard that helps you check the forecast, explore places and keep the locations that matter to you.</p>
        <div class="hero-actions">
          <a class="button button-gold" href="#/dashboard">Explore dashboard <span>→</span></a>
          <a class="text-link" href="#/about">How it works</a>
        </div>
        <div class="hero-note"><span class="status-dot"></span> Live weather information from Open-Meteo</div>
      </div>
      <div class="hero-art" aria-label="Decorative weather illustration">
        <div class="sun"></div><div class="cloud cloud-one"></div><div class="cloud cloud-two"></div>
        <div class="art-label"><span>☀</span><div><strong>Fresh perspective</strong><small>One forecast at a time</small></div></div><div class="art-ring"></div>
      </div>
    </section>
    <section class="feature-strip">
      <article><span class="feature-icon">⌕</span><div><h3>Explore places</h3><p>Search for a town or city.</p></div></article>
      <article><span class="feature-icon">☼</span><div><h3>Live forecasts</h3><p>Fetch current weather details.</p></div></article>
      <article><span class="feature-icon">♡</span><div><h3>Keep favourites</h3><p>Save places to your account.</p></div></article>
    </section>
    <section class="home-bottom">
      <div><p class="eyebrow">BUILT FOR LEARNING</p><h2>Small steps.<br>Useful features.</h2></div>
      <p>OliveSky is a browser-based learning project. It brings together HTML structure, CSS styling, JavaScript screens, account demonstrations, browser storage and an external weather API.</p>
      <a class="button button-dark" href="#/about">View project details</a>
    </section>`;
}

function renderDashboard() {
  app.innerHTML = `
    <section class="page-section">
      <div class="page-heading"><p class="eyebrow">YOUR WEATHER SPACE</p><h1>Weather dashboard</h1><p>Search for a place to see its latest available weather information.</p></div>
      <div class="panel">
        <form id="weatherForm" class="search-row">
          <input id="cityInput" type="text" placeholder="Enter a city, e.g. Nairobi" aria-label="City name" required>
          <button class="button button-gold" type="submit">Search weather →</button>
        </form>
        <div id="weatherResult"><p class="loading">Try searching for a city to get started.</p></div>
      </div>
    </section>`;

  document.getElementById("weatherForm").addEventListener("submit", async event => {
    event.preventDefault(); // Stops the browser from reloading the page.
    const city = document.getElementById("cityInput").value.trim();
    if (city) await searchWeather(city);
  });
}

// Fetch errors are separated into connection errors and service response errors.
async function getJSON(url, serviceErrorMessage) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("No connection. Check your internet.");
  }

  if (!response.ok) {
    throw new Error(serviceErrorMessage);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error("The service returned information that could not be read.");
  }
}

async function searchWeather(city) {
  const result = document.getElementById("weatherResult");
  result.innerHTML = `<p class="loading">Finding ${escapeHTML(city)} and checking the forecast...</p>`;

  try {
    // Step 1: find the latitude and longitude for the typed city.
    const placeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const placeData = await getJSON(placeUrl, "The location service is not answering.");

    if (!placeData.results || placeData.results.length === 0) {
      throw new Error("We could not find that place. Check the spelling and try again.");
    }

    const place = placeData.results[0];

    // Step 2: use the coordinates to ask the weather service for current conditions.
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`;
    const weatherData = await getJSON(weatherUrl, "The weather service is not answering.");

    if (!weatherData.current) {
      throw new Error("The weather service did not send current weather information.");
    }

    currentWeather = {
      name: place.name,
      country: place.country || "",
      latitude: place.latitude,
      longitude: place.longitude,
      current: weatherData.current
    };
    showWeather(currentWeather);
  } catch (error) {
    console.error("Weather search problem:", error);
    result.innerHTML = `<p class="error-message">${escapeHTML(error.message || "Something went wrong. Please try again.")}</p>`;
  }
}

function weatherDescription(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Mainly clear / cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather update";
}

function showWeather(data) {
  const c = data.current;
  document.getElementById("weatherResult").innerHTML = `
    <div class="weather-grid">
      <div class="weather-main">
        <div class="city">${escapeHTML(data.name)}, ${escapeHTML(data.country)}</div>
        <div class="temperature">${Math.round(c.temperature_2m)}°</div>
        <div class="weather-condition">${weatherDescription(c.weather_code)}</div>
        <p style="color:#c4d0d8;font-size:11px;margin-top:20px">Feels like ${Math.round(c.apparent_temperature)}°C</p>
      </div>
      <div class="weather-stats">
        <div class="stat"><span>Humidity</span><strong>${c.relative_humidity_2m}%</strong></div>
        <div class="stat"><span>Wind speed</span><strong>${c.wind_speed_10m} <small>km/h</small></strong></div>
        <div class="stat"><span>Latitude</span><strong>${Number(data.latitude).toFixed(2)}</strong></div>
        <div class="stat"><span>Longitude</span><strong>${Number(data.longitude).toFixed(2)}</strong></div>
      </div>
    </div>
    <p style="color:var(--muted);font-size:10px;margin:14px 2px 0">Updated: ${escapeHTML(c.time)} · Source: Open-Meteo</p>
    <button data-action="save-place" class="button button-dark" style="margin-top:18px">♡ Save this place</button>`;
}

function saveCurrentPlace() {
  const user = currentUser();
  if (!user) {
    showToast("Please sign in before saving a place.");
    openAuthModal("login");
    return;
  }
  if (!currentWeather) return;

  const alreadySaved = user.saved.some(place => place.name.toLowerCase() === currentWeather.name.toLowerCase());
  if (alreadySaved) {
    showToast("That place is already in your saved list.");
    return;
  }

  user.saved.push({
    name: currentWeather.name,
    country: currentWeather.country,
    latitude: currentWeather.latitude,
    longitude: currentWeather.longitude
  });

  storage.writeUserData(user.id, { saved: user.saved });
  showToast("Place saved to your account.");
}

function renderSaved() {
  const user = currentUser();
  if (!user) {
    app.innerHTML = `<section class="page-section"><div class="page-heading"><p class="eyebrow">YOUR COLLECTION</p><h1>Saved places</h1><p>Sign in to keep a personal list of places.</p></div><div class="empty-state"><p>You need an account to view saved places.</p><button data-action="open-login" class="button button-gold">Sign in</button></div></section>`;
    return;
  }

  const cards = user.saved.map((place, index) => `
    <article class="saved-card">
      <h3>${escapeHTML(place.name)}</h3><p>${escapeHTML(place.country)} · ${Number(place.latitude).toFixed(2)}, ${Number(place.longitude).toFixed(2)}</p>
      <button data-action="remove-place" data-index="${index}">Remove from saved</button>
    </article>`).join("");

  app.innerHTML = `
    <section class="page-section">
      <div class="page-heading"><p class="eyebrow">YOUR COLLECTION</p><h1>Saved places</h1><p>Your saved locations are stored separately for your demo account.</p></div>
      ${cards ? `<div class="saved-list">${cards}</div>` : `<div class="empty-state"><h3>No saved places yet</h3><p>Search for a city on the dashboard and save it here.</p><a class="button button-gold" href="#/dashboard">Find a place</a></div>`}
    </section>`;
}

function renderAbout() {
  app.innerHTML = `
    <section class="page-section">
      <div class="page-heading"><p class="eyebrow">BEHIND THE PROJECT</p><h1>Simple by design.</h1><p>OliveSky demonstrates the main ideas from the project instructions.</p></div>
      <div class="info-grid">
        <article class="info-card"><span class="feature-icon">▤</span><h3>Separate screens</h3><p>The home, dashboard, saved places and about pages are shown by JavaScript when the address after # changes. The browser does not reload the whole page.</p></article>
        <article class="info-card"><span class="feature-icon">↗</span><h3>External information</h3><p>The app uses the free Open-Meteo geocoding and forecast APIs. It displays a loading message and explains errors if a request fails.</p></article>
        <article class="info-card"><span class="feature-icon">▣</span><h3>Account and storage</h3><p>Demo account details are kept in browser storage. Each user's saved places use a separate key containing that user's ID.</p></article>
      </div>
      <div class="panel" style="margin-top:18px">
        <h2 style="font-family:'Playfair Display',serif;color:var(--navy)">A note about SQL and real SaaS</h2>
        <p style="color:var(--muted);font-size:13px;line-height:1.8">SQL is not required for this version because it runs entirely in the browser and uses browser storage. A real SaaS product should have a backend server and a database such as MySQL or PostgreSQL. The server should handle passwords, sessions, user permissions and plan limits. Never put database passwords or secret API keys in browser JavaScript.</p>
        <h3 style="color:var(--navy)">Testing and troubleshooting</h3>
        <p style="color:var(--muted);font-size:13px;line-height:1.8">Test the page while data is loading, when no place is found, when the internet is disconnected and when the API does not respond successfully. If something does not appear, open the browser developer console (usually F12) and check the Console tab for errors.</p>
      </div>
    </section>`;
}

function openAuthModal(mode) {
  showAuthForm(mode);
}

function showAuthForm(mode) {
  const isSignup = mode === "signup";
  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button class="modal-close" data-action="close-modal" aria-label="Close">×</button>
        <p class="eyebrow">OLIVESKY ACCOUNT</p>
        <h2 id="modalTitle">${isSignup ? "Create an account" : "Welcome back"}</h2>
        <p>${isSignup ? "Create a demo account to save your favourite places." : "Sign in to see your saved weather locations."}</p>
        <form id="authForm">
          ${isSignup ? `<label class="field-label" for="nameInput">Your name</label><input id="nameInput" required maxlength="35" placeholder="e.g. Amina">` : ""}
          <label class="field-label" for="emailInput">Email address</label>
          <input id="emailInput" type="email" required placeholder="you@example.com">
          <label class="field-label" for="passwordInput">Password</label>
          <input id="passwordInput" type="password" required minlength="4" placeholder="At least 4 characters">
          <button class="button button-gold" type="submit">${isSignup ? "Create account" : "Sign in"}</button>
        </form>
        <p>${isSignup ? "Already registered?" : "New to OliveSky?"} <span class="modal-switch" data-action="switch-auth" data-mode="${isSignup ? "login" : "signup"}">${isSignup ? "Sign in" : "Create an account"}</span></p>
        <p class="error-message" style="background:#f5e8c6;color:#66501e">Learning demo only: do not use a real password.</p>
      </section>
    </div>`;

  document.getElementById("modalBackdrop").addEventListener("click", event => {
    if (event.target.id === "modalBackdrop") closeModal();
  });
  document.getElementById("authForm").addEventListener("submit", handleAuth);
}

async function handleAuth(event) {
  event.preventDefault();
  const isSignup = Boolean(document.getElementById("nameInput"));
  const email = document.getElementById("emailInput").value.trim().toLowerCase();
  const password = document.getElementById("passwordInput").value;
  const name = isSignup ? document.getElementById("nameInput").value.trim() : "";

  if (isSignup) {
    if (appData.users.some(user => user.email === email)) {
      showToast("An account with this email already exists.");
      return;
    }

    // Hashing is included as a learning exercise; client-side accounts are still not secure.
    const passwordHash = await makeHash(password);
    const user = { id: Date.now().toString(), name, email, passwordHash, plan: "Free" };
    appData.users.push(user);
    storage.writeUsers(appData.users);
    storage.writeUserData(user.id, { saved: [] });
    appData.currentUser = user.id;
    storage.writeSession(user.id);
    closeModal();
    render();
    showToast("Your demo account has been created.");
  } else {
    const user = appData.users.find(item => item.email === email);
    const passwordHash = await makeHash(password);

    if (!user || user.passwordHash !== passwordHash) {
      showToast("Email or password is not correct.");
      return;
    }

    appData.currentUser = user.id;
    storage.writeSession(user.id);
    closeModal();
    render();
    showToast("You are now signed in.");
  }
}

async function makeHash(value) {
  // Web Crypto is available on localhost and secure websites.
  if (window.crypto && crypto.subtle) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for local practice environments only.
  return btoa(unescape(encodeURIComponent(value)));
}

function signOut() {
  appData.currentUser = null;
  storage.writeSession(null);
  render();
  showToast("You have signed out.");
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

// One click listener handles buttons that are created again when screens are redrawn.
// This avoids attaching a fresh click listener to every new dynamic button.
document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const action = actionButton.dataset.action;

  if (action === "save-place") {
    saveCurrentPlace();
  } else if (action === "remove-place") {
    const user = currentUser();
    const index = Number(actionButton.dataset.index);
    if (user && Number.isInteger(index) && index >= 0 && index < user.saved.length) {
      user.saved.splice(index, 1);
      storage.writeUserData(user.id, { saved: user.saved });
      renderSaved();
      showToast("Saved place removed.");
    }
  } else if (action === "open-login") {
    openAuthModal("login");
  } else if (action === "close-modal") {
    closeModal();
  } else if (action === "switch-auth") {
    showAuthForm(actionButton.dataset.mode);
  }
});

// Hash-based routing: the part after # changes screens without a full page reload.
window.addEventListener("hashchange", render);

document.getElementById("menuButton").addEventListener("click", () => {
  document.querySelector(".main-nav").classList.toggle("open");
});

document.querySelectorAll(".main-nav a").forEach(link => {
  link.addEventListener("click", () => document.querySelector(".main-nav").classList.remove("open"));
});

updateHeader();
render();
