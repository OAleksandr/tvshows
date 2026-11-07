"use strict";

/*---------------------------------------------------------------------------------------------------------
  Config & DOM references
---------------------------------------------------------------------------------------------------------*/
const API = "https://api.tvmaze.com";
const FAV_KEY = "fav";
const NO_IMAGE = "img/no-img-available.png"; // relative so it also works on GitHub Pages (/tvshows/)
const POPULAR_COUNT = 10;

const showsHeaderContainer = document.querySelector(".header-container .shows");
const showsList = document.querySelector(".show-list-container .show-list");
const resultsTitle = document.querySelector(".results-title");
const searchForm = document.querySelector("#search-form");
const searchValue = document.querySelector("#search-input");
const searchBTN = document.querySelector("#search");
const clearBTN = document.querySelector("#clear-search");
const messages = document.querySelector(".messages");
const modalEl = document.querySelector("#detail");
const modalTitle = document.querySelector("#detail-title");
const modalBody = document.querySelector(".modal-details");
const addToFavoriteBTN = document.querySelector("#add-to-favorite");
const offcanvasEl = document.querySelector("#offcanvasFavorites");
const preloader = document.querySelector(".preloader");

const detailModal = new bootstrap.Modal(modalEl);
let currentShow = null;

/*---------------------------------------------------------------------------------------------------------
  Helpers
---------------------------------------------------------------------------------------------------------*/
const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Plain text version of an HTML summary (used for card excerpts)
const stripHTML = (html) => new DOMParser().parseFromString(html || "", "text/html").body.textContent.trim();

// Keep only a few harmless formatting tags from API-provided HTML
const sanitizeHTML = (html) => {
  const allowed = new Set(["P", "B", "STRONG", "I", "EM", "BR", "UL", "OL", "LI"]);
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        clean(child);
        if (allowed.has(child.tagName)) {
          [...child.attributes].forEach((a) => child.removeAttribute(a.name));
        } else {
          child.replaceWith(...child.childNodes);
        }
      } else if (child.nodeType !== Node.TEXT_NODE) {
        child.remove();
      }
    });
  };
  clean(doc.body);
  return doc.body.innerHTML;
};

const safeUrl = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const fetchJSON = async (url) => {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
};

const starsHTML = (rating) => {
  if (rating == null) return `<span class="rating rating-none">No rating</span>`;
  const percent = Math.round(((rating / 10) * 100) / 5) * 5;
  return `
    <span class="rating" title="Rated ${rating} out of 10">
      <span class="stars-outer" aria-hidden="true"><span class="stars-inner" style="width:${percent}%"></span></span>
      <span class="rating-value">${rating}</span>
      <span class="visually-hidden">Rated ${rating} out of 10</span>
    </span>`;
};

/*---------------------------------------------------------------------------------------------------------
  Notifications
---------------------------------------------------------------------------------------------------------*/
const TOAST_STYLES = {
  success: { icon: "bi-check-circle-fill", title: "Success" },
  warning: { icon: "bi-exclamation-triangle-fill", title: "Warning" },
  danger: { icon: "bi-x-circle-fill", title: "Error" },
};

// `message` must already be escaped / trusted HTML
const ShowToast = (type, message) => {
  const style = TOAST_STYLES[type] || TOAST_STYLES.warning;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", type === "danger" ? "alert" : "status");
  toast.innerHTML = `
    <div class="toast-header">
      <i class="bi ${style.icon} toast-icon me-2" aria-hidden="true"></i>
      <strong class="me-auto toast-title">${style.title}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">${message}</div>`;
  messages.appendChild(toast);
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  new bootstrap.Toast(toast, { animation: true, delay: 6000, autohide: true }).show();
};

const DisplayError = (err) => {
  console.error(err);
  const msg = err instanceof TypeError ? "Network error — please check your connection and try again." : err.message || String(err);
  ShowToast("danger", escapeHTML(msg));
};

/*---------------------------------------------------------------------------------------------------------
  Popular shows slider
---------------------------------------------------------------------------------------------------------*/
const InitSlider = () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  $(showsHeaderContainer).slick({
    dots: true,
    arrows: true,
    infinite: true,
    autoplay: !reduceMotion,
    autoplaySpeed: 4000,
    pauseOnHover: true,
    pauseOnFocus: true,
    centerMode: true,
    centerPadding: "60px",
    slidesToShow: 5,
    speed: 700,
    responsive: [
      { breakpoint: 1400, settings: { slidesToShow: 4 } },
      { breakpoint: 1100, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2, centerPadding: "40px" } },
      { breakpoint: 520, settings: { slidesToShow: 1, centerPadding: "56px", dots: false } },
    ],
  });
};

const DisplayShowsData = (shows) => {
  const popular = shows.filter((s) => s.rating?.average > 8 && s.image);
  const randomShows = shuffle(popular).slice(0, POPULAR_COUNT);
  const placeholderShow = shuffle(shows)[0];

  if (placeholderShow) searchValue.placeholder = `e.g. ${placeholderShow.name}`;

  showsHeaderContainer.innerHTML = randomShows
    .map((s) => `
      <div class="slide-item">
        <a href="#" class="card show-card" data-show-id="${s.id}" aria-label="${escapeHTML(s.name)} — view details">
          <div class="poster">
            <img src="${escapeHTML(s.image.medium || s.image.original)}" alt="">
          </div>
          <div class="card-body">
            <span class="show-title" title="${escapeHTML(s.name)}">${escapeHTML(s.name)}</span>
            ${starsHTML(s.rating.average)}
          </div>
        </a>
      </div>`)
    .join("");

  InitSlider();
};

const LoadShowsData = async () => {
  try {
    const shows = await fetchJSON(`${API}/shows`);
    DisplayShowsData(shows || []);
  } catch (err) {
    showsHeaderContainer.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center gap-2 mb-0" role="alert">
        <i class="bi bi-x-circle-fill" aria-hidden="true"></i>
        <div>Could not load popular shows. Please refresh the page to try again.</div>
      </div>`;
    DisplayError(err);
  } finally {
    HidePreloader();
  }
};

/*---------------------------------------------------------------------------------------------------------
  Search
---------------------------------------------------------------------------------------------------------*/
const SetSearching = (isSearching) => {
  searchBTN.disabled = isSearching;
  searchBTN.querySelector(".spinner-border").classList.toggle("hidden", !isSearching);
};

const SearchShow = async (query) => {
  const searchOption = document.querySelector('input[name="search-options"]:checked').value;
  const q = encodeURIComponent(query);
  const url = searchOption === "single" ? `${API}/singlesearch/shows?q=${q}` : `${API}/search/shows?q=${q}`;

  SetSearching(true);
  try {
    let showData = await fetchJSON(url);
    if (searchOption === "single" && showData != null) showData = [{ show: showData }];
    DisplayShowsFromSearch(showData, query);
  } catch (err) {
    DisplayError(err);
  } finally {
    SetSearching(false);
  }
};

const DisplayShowsFromSearch = (showData, query) => {
  if (!showData || showData.length === 0) {
    showsList.innerHTML = "";
    resultsTitle.classList.add("hidden");
    clearBTN.classList.add("hidden");
    ShowToast("warning", `No results found for <b>${escapeHTML(query)}</b>.`);
    return;
  }

  resultsTitle.innerHTML = `${showData.length} result${showData.length === 1 ? "" : "s"} for “${escapeHTML(query)}”`;
  resultsTitle.classList.remove("hidden");

  showsList.innerHTML = showData
    .map(({ show }) => {
      const image = show.image ? show.image.medium || show.image.original : NO_IMAGE;
      const summary = stripHTML(show.summary);
      const year = show.premiered ? show.premiered.slice(0, 4) : "";
      return `
        <div class="col">
          <a href="#" class="card h-100 card-show-list" data-show-id="${show.id}">
            <div class="poster">
              <img src="${escapeHTML(image)}" alt="" loading="lazy">
              ${show.rating?.average ? `<span class="poster-rating"><i class="bi bi-star-fill" aria-hidden="true"></i> ${show.rating.average}</span>` : ""}
            </div>
            <div class="card-body">
              <h3 class="card-title h6" title="${escapeHTML(show.name)}">${escapeHTML(show.name)}</h3>
              ${year || show.genres?.length ? `<p class="card-meta">${[year, ...(show.genres || []).slice(0, 2)].filter(Boolean).map(escapeHTML).join(" · ")}</p>` : ""}
              ${summary ? `<p class="card-summary">${escapeHTML(summary)}</p>` : ""}
            </div>
          </a>
        </div>`;
    })
    .join("");

  clearBTN.classList.remove("hidden");
  resultsTitle.scrollIntoView({ behavior: "smooth", block: "start" });
};

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchValue.value.trim();

  if (query.length > 0) {
    SearchShow(query);
  } else {
    ShowToast("warning", "Please enter a show name.");
    searchValue.focus();
  }
});

clearBTN.addEventListener("click", () => {
  showsList.innerHTML = "";
  resultsTitle.classList.add("hidden");
  searchValue.value = "";
  clearBTN.classList.add("hidden");
  searchValue.focus();
});

// One delegated listener for every show card (slider + search results)
document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-show-id]");
  if (!card) return;
  e.preventDefault();
  GetSingleShowDetails(Number(card.dataset.showId));
});

/*---------------------------------------------------------------------------------------------------------
  Show details modal
---------------------------------------------------------------------------------------------------------*/
const GetSingleShowDetails = async (id) => {
  try {
    const show = await fetchJSON(`${API}/shows/${id}`);
    if (!show) throw new Error("Show not found.");
    DisplayShowDetailsModal(show);
  } catch (err) {
    DisplayError(err);
  }
};

const StatusBadge = (status) => {
  if (!status) return `<span class="text-white-50">Not available</span>`;
  const cls = status === "Running" ? "bg-success" : status === "To Be Determined" || status === "In Development" ? "bg-warning text-dark" : "bg-danger";
  return `<span class="badge ${cls}">${escapeHTML(status)}</span>`;
};

const DisplayShowDetailsModal = (data) => {
  currentShow = data;
  const image = data.image ? data.image.original : NO_IMAGE;
  const network = data.network || data.webChannel;
  const country = network?.country;
  const officialSite = safeUrl(data.officialSite);
  const na = `<span class="text-white-50">Not available</span>`;
  const schedule = data.schedule || { days: [], time: "" };

  const info = [
    ["Status", StatusBadge(data.status)],
    ["Language", data.language ? escapeHTML(data.language) : na],
    ["Premiered", data.premiered ? escapeHTML(data.premiered) : na],
    data.ended ? ["Ended", escapeHTML(data.ended)] : null,
    ["Rating", data.rating?.average != null ? `<i class="bi bi-star-fill text-warning" aria-hidden="true"></i> ${data.rating.average} / 10` : na],
    ["Runtime", data.runtime || data.averageRuntime ? `${data.runtime || data.averageRuntime} min` : na],
    network ? ["Network", escapeHTML(network.name)] : null,
    country
      ? ["Country", `<img src="https://flagcdn.com/w40/${escapeHTML(country.code.toLowerCase())}.png" class="flag" alt="" width="24" height="16"> ${escapeHTML(country.name)}`]
      : null,
    officialSite
      ? ["Official site", `<a href="${escapeHTML(officialSite)}" target="_blank" rel="noopener">Visit <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>`]
      : null,
  ].filter(Boolean);

  modalTitle.textContent = data.name;
  modalEl.querySelector(".modal-content").style.setProperty("--detail-bg", `url("${image}")`);

  modalBody.innerHTML = `
    <div class="row g-3">
      <div class="col-sm-5 col-md-4">
        <img src="${escapeHTML(image)}" class="detail-poster" alt="${escapeHTML(data.name)} poster">
        ${data.genres?.length ? `<div class="genres mt-3">${data.genres.map((g) => `<span class="badge rounded-pill">${escapeHTML(g)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="col-sm-7 col-md-8">
        <dl class="modal-show-info">
          ${info.map(([k, v]) => `<div class="info-row"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
        </dl>
      </div>
      ${data.summary ? `<div class="col-12"><div class="detail-panel summary">${sanitizeHTML(data.summary)}</div></div>` : ""}
      ${schedule.days.length > 0
        ? `<div class="col-12">
            <div class="detail-panel">
              <h3 class="h6 detail-panel-title"><i class="bi bi-calendar-week" aria-hidden="true"></i> Schedule</h3>
              <table class="table table-dark table-sm mb-0">
                <thead><tr><th scope="col">Day</th><th scope="col">Time</th></tr></thead>
                <tbody>
                  ${schedule.days.map((d) => `<tr><td>${escapeHTML(d)}</td><td>${schedule.time ? escapeHTML(schedule.time) : "—"}</td></tr>`).join("")}
                </tbody>
              </table>
            </div>
          </div>`
        : ""}
      <div class="col-12 images-col hidden">
        <div class="detail-panel">
          <h3 class="h6 detail-panel-title modal-shows-images-h"><i class="bi bi-images" aria-hidden="true"></i> Images <span></span></h3>
          <div class="modal-shows-images"></div>
        </div>
      </div>
    </div>`;

  UpdateFavoriteButton();
  ShowImagesCarousel(data.id);

  // Opening from the favorites panel: close it so the modal is not stacked on top of it
  bootstrap.Offcanvas.getInstance(offcanvasEl)?.hide();
  detailModal.show();
  modalBody.scrollTop = 0;
};

const ShowImagesCarousel = async (id) => {
  try {
    const images = await fetchJSON(`${API}/shows/${id}/images`);
    // Ignore late responses for a show that is no longer displayed
    if (!images || images.length === 0 || currentShow?.id !== id) return;

    const container = modalBody.querySelector(".modal-shows-images");
    modalBody.querySelector(".modal-shows-images-h span").textContent = `(${images.length})`;
    modalBody.querySelector(".images-col").classList.remove("hidden");

    const items = images
      .map((img, pos) => {
        const res = img.resolutions;
        const src = (res.medium || res.original).url;
        return `
          <div class="carousel-item ${pos === 0 ? "active" : ""}">
            <img src="${escapeHTML(src)}" class="d-block" alt="${escapeHTML(currentShow.name)} image ${pos + 1} of ${images.length}" ${pos > 0 ? 'loading="lazy"' : ""}>
          </div>`;
      })
      .join("");

    container.innerHTML = `
      <div id="carouselImagesIndicators" class="carousel slide">
        <div class="carousel-inner">${items}</div>
        ${images.length > 1
          ? `<button class="carousel-control-prev" type="button" data-bs-target="#carouselImagesIndicators" data-bs-slide="prev">
              <span class="carousel-control-prev-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#carouselImagesIndicators" data-bs-slide="next">
              <span class="carousel-control-next-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Next</span>
            </button>`
          : ""}
      </div>`;
  } catch (err) {
    console.error(err); // images are optional — fail quietly
  }
};

/*---------------------------------------------------------------------------------------------------------
  Favorites (stored in localStorage under "fav")
---------------------------------------------------------------------------------------------------------*/
const GetFavorites = () => {
  try {
    const list = JSON.parse(localStorage.getItem(FAV_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const SaveFavorites = (list) => {
  try {
    if (list.length > 0) localStorage.setItem(FAV_KEY, JSON.stringify(list));
    else localStorage.removeItem(FAV_KEY);
  } catch (err) {
    DisplayError(new Error("Could not save favorites in this browser."));
  }
  RenderFavorites();
  UpdateFavoriteButton();
};

const IsFavorite = (id) => GetFavorites().some((f) => f.id === id);

const AddToFavoriteList = (show) => {
  const list = GetFavorites().filter((f) => f.id !== show.id);
  list.push({ id: show.id, name: show.name, image: show.image });
  SaveFavorites(list);
  ShowToast("success", `<b>${escapeHTML(show.name)}</b> was added to your favorites.`);
};

const RemoveFromFavoriteList = (id) => {
  SaveFavorites(GetFavorites().filter((f) => f.id !== id));
};

const UpdateFavoriteButton = () => {
  if (!currentShow) return;
  const fav = IsFavorite(currentShow.id);
  addToFavoriteBTN.value = fav ? "remove" : "add";
  addToFavoriteBTN.setAttribute("aria-pressed", String(fav));
  addToFavoriteBTN.innerHTML = fav
    ? '<i class="bi bi-heart-fill text-danger" aria-hidden="true"></i> In favorites'
    : '<i class="bi bi-heart text-danger" aria-hidden="true"></i> Add to favorites';
};

addToFavoriteBTN.addEventListener("click", () => {
  if (!currentShow) return;
  if (addToFavoriteBTN.value === "add") AddToFavoriteList(currentShow);
  else RemoveFromFavoriteList(currentShow.id);
});

const RenderFavorites = () => {
  const favorites = GetFavorites();
  const notificationBTN = document.querySelector("#notification-btn");
  const offcanvasCard = document.querySelector(".offcanvas-card");
  const clearFavBTN = document.querySelector(".clear-fav-list");

  notificationBTN.classList.toggle("hidden", favorites.length === 0);
  document.querySelector(".notification-count").textContent = favorites.length;
  clearFavBTN.classList.toggle("hidden", favorites.length === 0);

  if (favorites.length === 0) {
    offcanvasCard.innerHTML = `
      <li class="fav-empty text-center">
        <i class="bi bi-heart" aria-hidden="true"></i>
        <p class="mb-0">No favorites yet. Open a show and tap “Add to favorites”.</p>
      </li>`;
    return;
  }

  offcanvasCard.innerHTML = favorites
    .map((fd) => {
      const image = fd.image ? fd.image.medium || fd.image.original : NO_IMAGE;
      return `
        <li class="fav-item">
          <a href="#" class="fav-link" data-show-id="${fd.id}">
            <img src="${escapeHTML(image)}" alt="" loading="lazy">
            <span class="fav-name">${escapeHTML(fd.name)}</span>
          </a>
          <button type="button" class="btn btn-sm btn-outline-danger fav-remove" data-remove-id="${fd.id}" aria-label="Remove ${escapeHTML(fd.name)} from favorites">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </li>`;
    })
    .join("");
};

document.querySelector(".offcanvas-card").addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-id]");
  if (removeBtn) RemoveFromFavoriteList(Number(removeBtn.dataset.removeId));
});

document.querySelector(".clear-fav-list").addEventListener("click", () => {
  if (confirm("Do you want to clear your favorites list?")) SaveFavorites([]);
});

// Keep several open tabs in sync
window.addEventListener("storage", (e) => {
  if (e.key === FAV_KEY || e.key === null) {
    RenderFavorites();
    UpdateFavoriteButton();
  }
});

/*---------------------------------------------------------------------------------------------------------
  Trailer
---------------------------------------------------------------------------------------------------------*/
const newMovieTrailers = [
  "mqqft2x_Aa4",
  "yDDw4AG-TX8",
  "GBNKXNLm6ug",
  "CwpHlcb0G2s",
  "aJACneSF580",
  "cOv3Hk-6kt8",
];
document.querySelector("#trailer").src = `https://www.youtube-nocookie.com/embed/${shuffle(newMovieTrailers)[0]}?rel=0`;

/*---------------------------------------------------------------------------------------------------------
  Preloader & init
---------------------------------------------------------------------------------------------------------*/
const HidePreloader = () => {
  preloader.classList.add("is-hidden");
  preloader.addEventListener("transitionend", () => preloader.remove(), { once: true });
  setTimeout(() => preloader.remove(), 800); // fallback if transitions are disabled
};
setTimeout(HidePreloader, 8000); // never keep the user waiting on a slow API

RenderFavorites();
LoadShowsData();
