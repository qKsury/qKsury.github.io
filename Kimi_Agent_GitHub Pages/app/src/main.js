function setupTheme() {
  const root = document.documentElement;
  const buttons = [...document.querySelectorAll("[data-theme-toggle]")];
  if (!buttons.length) return;

  function applyTheme(theme, persist = false) {
    const light = theme === "light";
    root.dataset.theme = light ? "light" : "dark";
    root.style.colorScheme = light ? "light" : "dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#fafafa" : "#171717");
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(light));
      button.setAttribute("aria-label", light ? "Включить тёмную тему" : "Включить светлую тему");
      button.querySelector("[data-theme-label]").textContent = light ? "Светлая" : "Тёмная";
    });
    if (persist) {
      try { localStorage.setItem("ksury-editorial-theme", light ? "light" : "dark"); } catch { /* Хранилище может быть недоступно. */ }
    }
  }

  applyTheme(root.dataset.theme);
  buttons.forEach((button) => button.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "light" ? "dark" : "light", true);
  }));
}

setupTheme();
document.querySelectorAll("[data-current-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

function setupHomeInteractions() {
  if (!document.querySelector(".lower-world")) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const starCooldown = 10_000;
  let lastStarAt = -starCooldown;

  // Вспышка доступа на всей главной, включая подвал.
  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("a, button, input, textarea, select, summary")) return;
    if (reducedMotion.matches) return;

    const now = Date.now();
    if (now - lastStarAt < starCooldown) return;
    lastStarAt = now;

    const star = document.createElement("span");
    star.className = "click-star";
    star.style.left = `${event.clientX}px`;
    star.style.top = `${event.clientY}px`;
    star.setAttribute("aria-hidden", "true");
    document.body.append(star);
    star.addEventListener("animationend", () => star.remove(), { once: true });
    window.setTimeout(() => star.remove(), 1100);
  });

  // Первый экран работает как единая композиция, нижние объекты — независимо.
  const backgroundObjects = [
    ...document.querySelectorAll(".cosmic-scene > g > g, .cosmic-scene > g > path, .cosmic-scene > g > circle"),
    ...document.querySelectorAll(".lower-constellation > g"),
    ...document.querySelectorAll(".relic-pyramid, .dinosaur-art"),
  ];
  backgroundObjects.forEach((object) => object.setAttribute("data-background-object", ""));
  const heroObjects = backgroundObjects.filter((object) => object.closest(".hero"));

  function toggleArtifact(artifact) {
    artifact.classList.toggle("artifact-lit");
  }

  function toggleHero() {
    const turnOn = !heroObjects[0]?.classList.contains("artifact-lit");
    heroObjects.forEach((object) => object.classList.toggle("artifact-lit", turnOn));
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, textarea, select, summary")) return;

    const directArtifact = event.target.closest("[data-background-object]");
    if (directArtifact) {
      if (directArtifact.closest(".hero")) toggleHero();
      else toggleArtifact(directArtifact);
      return;
    }

    // Планеты частично перекрыты текстом первого экрана.
    if (event.target.closest(".hero")) {
      const planets = [...document.querySelectorAll(".cosmic-scene .planet")];
      const planet = planets.find((item) => {
        const rect = item.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        return x * x + y * y <= 1;
      });
      if (planet) {
        toggleHero();
        return;
      }
    }

    // Птеродактиль лежит под текстовой колонкой: учитываем клик по его видимой области.
    const dinosaur = document.querySelector(".dinosaur-art");
    if (dinosaur && event.target.closest("#stack")) {
      const rect = dinosaur.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
        toggleArtifact(dinosaur);
      }
    }
  });
}

setupHomeInteractions();
