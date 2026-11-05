const albumContainer = document.querySelector("#album-library");
const trackContainer = document.querySelector("#track-list");
const statsStatus = document.querySelector("#stats-status");
const statsPeriod = document.querySelector("#stats-period");
const profileLink = document.querySelector("#lastfm-profile");

const featuredAlbum = document.querySelector("#featured-album");
const featuredStage = document.querySelector("#featured-stage");
const featuredCover = document.querySelector("#featured-cover");
const featuredCoverCode = document.querySelector("#featured-cover-code");
const featuredArtist = document.querySelector("#featured-artist");
const featuredTitle = document.querySelector("#featured-title");
const featuredYear = document.querySelector("#featured-year");
const featuredTrackCount = document.querySelector("#featured-track-count");
const featuredTracklist = document.querySelector("#featured-tracklist");
const featuredSpotify = document.querySelector("#featured-spotify");
const featuredCurrent = document.querySelector("#featured-current");
const featuredTotal = document.querySelector("#featured-total");
const featuredProgress = document.querySelector("#featured-progress");
const featuredPrev = document.querySelector("#featured-prev");
const featuredNext = document.querySelector("#featured-next");
const featuredToggle = document.querySelector("#featured-toggle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const player = document.querySelector("#audio-player");
const playerCover = document.querySelector("#player-cover");
const playerTitle = document.querySelector("#player-title");
const playerArtist = document.querySelector("#player-artist");
const playerToggle = document.querySelector("#player-toggle");
const playerClose = document.querySelector("#player-close");
const playerProgress = document.querySelector("#player-progress");
const playerTime = document.querySelector("#player-time");
const playerAnnouncement = document.querySelector("#player-announcement");
const audio = new Audio();
audio.preload = "metadata";

let albums = [];
let currentAlbum = 0;
let rotationTimer = null;
let transitionInProgress = false;
let pausedByUser = false;
let activePreviewButton = null;
let closeTimer = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function spotifySearch(artist, title) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`;
}

function trackWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "трек";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "трека";
  return "треков";
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
  return response.json();
}

function updateLibraryCurrent() {
  albumContainer.querySelectorAll(".library-item").forEach((item, index) => {
    const current = index === currentAlbum;
    item.classList.toggle("is-current", current);
    item.querySelector("button")?.setAttribute("aria-pressed", String(current));
  });
}

function renderFeatured(index) {
  const album = albums[index];
  if (!album) return;
  currentAlbum = index;
  const number = String(index + 1).padStart(2, "0");
  const tracks = Array.isArray(album.tracks) ? album.tracks : [];

  featuredCover.src = safeUrl(album.cover) || "./assets/favicon.svg";
  featuredCover.alt = `Обложка: ${album.artist} — ${album.title}`;
  featuredCoverCode.textContent = `${number} / ${String(albums.length).padStart(2, "0")}`;
  featuredArtist.textContent = album.artist;
  featuredTitle.textContent = album.title;
  featuredYear.textContent = String(album.year);
  featuredTrackCount.textContent = `${tracks.length} ${trackWord(tracks.length)}`;
  featuredCurrent.textContent = number;
  featuredTotal.textContent = String(albums.length).padStart(2, "0");
  featuredSpotify.href = spotifySearch(album.artist, album.title);
  featuredSpotify.setAttribute("aria-label", `${album.artist} — ${album.title}: найти в Spotify`);
  featuredAlbum.setAttribute("aria-label", `Альбом на витрине: ${album.artist} — ${album.title}`);

  const fragment = document.createDocumentFragment();
  tracks.forEach((track) => {
    const item = element("li");
    item.append(element("span", "", track));
    fragment.append(item);
  });
  featuredTracklist.replaceChildren(fragment);
  updateLibraryCurrent();
}

function restartProgress() {
  featuredProgress.classList.remove("is-running", "is-paused");
  void featuredProgress.offsetWidth;
  if (!pausedByUser && !document.hidden) featuredProgress.classList.add("is-running");
}

function scheduleRotation() {
  window.clearTimeout(rotationTimer);
  restartProgress();
  if (pausedByUser || document.hidden || albums.length < 2) return;
  rotationTimer = window.setTimeout(() => {
    goToFeatured(currentAlbum + 1, 1);
  }, 5000);
}

async function goToFeatured(index, direction = 1, fromLibrary = false) {
  if (!albums.length || transitionInProgress) return;
  const nextIndex = (index + albums.length) % albums.length;
  transitionInProgress = true;
  window.clearTimeout(rotationTimer);
  featuredProgress.classList.add("is-paused");

  if (!reducedMotion.matches && featuredStage.animate) {
    featuredStage.style.transformOrigin = direction > 0 ? "0% 50%" : "100% 50%";
    const leaving = featuredStage.animate([
      { opacity: 1, transform: "translateX(0) rotateY(0deg) scale(1)" },
      { opacity: 0, transform: `translateX(${-44 * direction}px) rotateY(${-9 * direction}deg) scale(.965)` }
    ], { duration: 280, easing: "cubic-bezier(.55,0,.8,.35)", fill: "forwards" });
    await leaving.finished.catch(() => {});
  }

  renderFeatured(nextIndex);

  if (!reducedMotion.matches && featuredStage.animate) {
    const entering = featuredStage.animate([
      { opacity: 0, transform: `translateX(${54 * direction}px) rotateY(${11 * direction}deg) scale(.96)` },
      { opacity: 1, transform: "translateX(0) rotateY(0deg) scale(1)" }
    ], { duration: 440, easing: "cubic-bezier(.16,.8,.24,1)", fill: "forwards" });
    await entering.finished.catch(() => {});
  }

  transitionInProgress = false;
  if (fromLibrary) {
    featuredAlbum.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
  }
  scheduleRotation();
}

function renderLibrary(data) {
  albumContainer.replaceChildren();
  albums = Array.isArray(data.albums) ? data.albums : [];
  if (!albums.length) {
    albumContainer.append(element("p", "error-state", "В коллекции пока нет альбомов."));
    featuredTracklist.replaceChildren(element("li", "error-state", "Треклист пока недоступен."));
    return;
  }

  const fragment = document.createDocumentFragment();
  albums.forEach((album, index) => {
    const article = element("article", "library-item");
    article.id = `album-${slugify(album.title)}`;

    const select = element("button", "library-select");
    select.type = "button";
    select.setAttribute("aria-label", `Показать на витрине: ${album.artist} — ${album.title}`);
    select.setAttribute("aria-pressed", "false");
    select.addEventListener("click", () => {
      const direction = index >= currentAlbum ? 1 : -1;
      if (index === currentAlbum) {
        featuredAlbum.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
        scheduleRotation();
      } else {
        goToFeatured(index, direction, true);
      }
    });

    const coverWrap = element("span", "library-cover-wrap");
    const cover = element("img", "library-cover");
    cover.src = safeUrl(album.cover) || "./assets/favicon.svg";
    cover.alt = `Обложка: ${album.artist} — ${album.title}`;
    cover.width = 700;
    cover.height = 700;
    cover.loading = index < 4 ? "eager" : "lazy";
    coverWrap.append(
      cover,
      element("span", "library-index", String(index + 1).padStart(2, "0")),
      element("span", "library-active", "На витрине")
    );
    select.append(coverWrap);

    const meta = element("div", "library-meta");
    meta.append(element("span", "library-artist", album.artist));
    meta.append(element("span", "library-year", String(album.year)));
    meta.append(element("h3", "", album.title));
    article.append(select, meta);
    fragment.append(article);
  });
  albumContainer.append(fragment);
  renderFeatured(0);
  scheduleRotation();

  if (window.location.hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (target?.closest(".album-library")) target.scrollIntoView({ block: "start" });
    });
  }
}

featuredPrev.addEventListener("click", () => goToFeatured(currentAlbum - 1, -1));
featuredNext.addEventListener("click", () => goToFeatured(currentAlbum + 1, 1));
featuredToggle.addEventListener("click", () => {
  pausedByUser = !pausedByUser;
  featuredToggle.textContent = pausedByUser ? "Старт" : "Пауза";
  featuredToggle.setAttribute("aria-pressed", String(pausedByUser));
  featuredToggle.setAttribute("aria-label", pausedByUser ? "Возобновить смену альбомов" : "Приостановить смену альбомов");
  scheduleRotation();
});
document.addEventListener("visibilitychange", scheduleRotation);

function formatTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function clearActivePreview() {
  if (activePreviewButton) {
    activePreviewButton.setAttribute("aria-pressed", "false");
    activePreviewButton.textContent = "▶";
    activePreviewButton.setAttribute("aria-label", "Слушать фрагмент трека");
  }
  activePreviewButton = null;
}

function updatePlayerToggle() {
  const playing = !audio.paused && !audio.ended;
  playerToggle.textContent = playing ? "Пауза" : "Слушать";
  playerToggle.setAttribute("aria-label", playing ? "Поставить на паузу" : "Продолжить воспроизведение");
  if (activePreviewButton) {
    activePreviewButton.setAttribute("aria-pressed", String(playing));
    activePreviewButton.textContent = playing ? "Ⅱ" : "▶";
    activePreviewButton.setAttribute("aria-label", playing ? "Поставить фрагмент на паузу" : "Продолжить фрагмент");
  }
}

function openPlayer(track, button) {
  clearTimeout(closeTimer);
  if (activePreviewButton === button && audio.src) {
    if (audio.paused) audio.play().catch(handleAudioError);
    else audio.pause();
    return;
  }

  clearActivePreview();
  activePreviewButton = button;
  audio.src = track.previewUrl;
  audio.load();
  playerCover.src = safeUrl(track.image) || "./assets/favicon.svg";
  playerCover.alt = "";
  playerTitle.textContent = track.name;
  playerArtist.textContent = track.artist;
  playerProgress.max = 30;
  playerProgress.value = 0;
  playerTime.textContent = "0:00";
  player.hidden = false;
  requestAnimationFrame(() => player.classList.add("is-open"));
  playerAnnouncement.textContent = `Загружается фрагмент: ${track.artist} — ${track.name}`;
  audio.play().then(() => {
    playerAnnouncement.textContent = `Играет фрагмент: ${track.artist} — ${track.name}`;
  }).catch(handleAudioError);
  updatePlayerToggle();
}

function handleAudioError() {
  playerAnnouncement.textContent = "Не удалось загрузить фрагмент. Попробуйте ещё раз или откройте трек на Last.fm.";
  updatePlayerToggle();
}

function closePlayer() {
  audio.pause();
  clearActivePreview();
  player.classList.remove("is-open");
  playerAnnouncement.textContent = "Плеер закрыт";
  closeTimer = setTimeout(() => {
    player.hidden = true;
    audio.removeAttribute("src");
    audio.load();
  }, reducedMotion.matches ? 0 : 280);
}

function renderTracks(data) {
  trackContainer.replaceChildren();
  const tracks = Array.isArray(data.tracks) ? data.tracks.slice(0, 10) : [];
  statsPeriod.textContent = data.periodLabel || "Последние 30 дней";

  const username = data.username || "qKsury";
  const profileUrl = `https://www.last.fm/user/${encodeURIComponent(username)}`;
  if (data.demo) {
    statsStatus.textContent = `Демо · это не статистика @${username}`;
    profileLink.textContent = `Профиль @${username} ↗`;
    profileLink.href = profileUrl;
  } else {
    const updated = data.updatedAt
      ? new Intl.DateTimeFormat("ru", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(data.updatedAt))
      : "недавно";
    statsStatus.textContent = `Last.fm · @${username} · обновлено ${updated}`;
    profileLink.textContent = `Профиль @${username} ↗`;
    profileLink.href = profileUrl;
  }

  if (!tracks.length) {
    trackContainer.append(element("li", "error-state", "За этот месяц пока нет прослушиваний. Новые треки появятся после следующего обновления."));
    return;
  }

  const maximumPlays = Math.max(...tracks.map((track) => Number(track.playcount) || 0), 1);
  const fragment = document.createDocumentFragment();
  tracks.forEach((track, index) => {
    const item = element("li", "track-item");
    item.append(element("span", "track-rank", String(index + 1).padStart(2, "0")));

    const cover = element("img", "track-cover");
    cover.src = safeUrl(track.image) || "./assets/favicon.svg";
    cover.alt = "";
    cover.width = 72;
    cover.height = 72;
    cover.loading = "lazy";
    item.append(cover);

    const titleWrap = element("div", "track-title-wrap");
    const title = element("a", "track-title", track.name);
    title.href = safeUrl(track.url) || `https://www.last.fm/search?q=${encodeURIComponent(`${track.artist} ${track.name}`)}`;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    const meter = element("span", "track-meter");
    meter.style.setProperty("--meter", `${Math.max(4, ((Number(track.playcount) || 0) / maximumPlays) * 100)}%`);
    titleWrap.append(title, meter);
    item.append(titleWrap);

    item.append(element("span", "track-artist", track.artist));
    item.append(element("span", "track-plays", `${data.demo ? "демо · " : ""}${track.playcount || 0} просл.`));

    if (track.previewUrl) {
      const preview = element("button", "preview-button", "▶");
      preview.type = "button";
      preview.setAttribute("aria-label", `Слушать фрагмент: ${track.artist} — ${track.name}`);
      preview.setAttribute("aria-pressed", "false");
      preview.addEventListener("click", () => openPlayer(track, preview));
      item.append(preview);
    }
    fragment.append(item);
  });
  trackContainer.append(fragment);
}

playerToggle.addEventListener("click", () => {
  if (!audio.src) return;
  if (audio.paused) audio.play().catch(handleAudioError);
  else audio.pause();
});
playerClose.addEventListener("click", closePlayer);
audio.addEventListener("play", updatePlayerToggle);
audio.addEventListener("pause", updatePlayerToggle);
audio.addEventListener("ended", () => {
  playerAnnouncement.textContent = "Фрагмент закончился";
  updatePlayerToggle();
});
audio.addEventListener("error", handleAudioError);
audio.addEventListener("loadedmetadata", () => {
  if (Number.isFinite(audio.duration)) playerProgress.max = audio.duration;
});
audio.addEventListener("timeupdate", () => {
  playerProgress.value = audio.currentTime;
  playerTime.textContent = formatTime(audio.currentTime);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !player.hidden) closePlayer();
});

Promise.allSettled([loadJson("./data/albums.json"), loadJson("./data/top-tracks.json")]).then(([albumsResult, tracksResult]) => {
  if (albumsResult.status === "fulfilled") renderLibrary(albumsResult.value);
  else {
    albumContainer.replaceChildren(element("p", "error-state", "Не удалось загрузить альбомы. Обновите страницу или проверьте data/albums.json."));
    featuredTracklist.replaceChildren(element("li", "error-state", "Не удалось загрузить треклист."));
  }
  if (tracksResult.status === "fulfilled") renderTracks(tracksResult.value);
  else {
    trackContainer.replaceChildren(element("li", "error-state", "Не удалось загрузить статистику. Обновите страницу или проверьте data/top-tracks.json."));
    statsStatus.textContent = "Ошибка загрузки данных";
  }
});
