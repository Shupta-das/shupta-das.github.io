const DATA_PATHS = {
  site: "data/site.json",
  bio: "data/bio.json",
  research: "data/research.json",
  awards: "data/awards.json",
  teaching: "data/teaching.json",
  publications: "data/publications.json"
};

const DEFAULT_SITE = {
  title: "Shupta Das",
  description: "Academic research website.",
  sections: {},
  navigation: []
};

const DEFAULT_BIO = {
  lab: {},
  portrait: {},
  favicon: {},
  bio: [],
  socials: []
};

const DEFAULT_RESEARCH = { categories: [] };
const DEFAULT_AWARDS = { awards: [] };
const DEFAULT_TEACHING = { courses: [] };
const DEFAULT_PUBLICATION_CONFIG = { sourceUrl: "", note: "", publications: [], pdfs: {}, duplicateAliases: {} };
const DATA_LOAD_ERROR_MESSAGE = "Some site data could not be loaded. If you opened index.html directly, run: python3 -m http.server 8000";

let allPublications = [];
let hadDataLoadError = false;
let publicationConfig = DEFAULT_PUBLICATION_CONFIG;

function setStatusMessage(message) {
  const status = document.getElementById("publicationStatus");
  if (status) status.textContent = message;
}

async function fetchJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    return await response.json();
  } catch (error) {
    hadDataLoadError = true;
    setStatusMessage(DATA_LOAD_ERROR_MESSAGE);
    console.warn(`Using fallback for ${path}:`, error);
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeTitle(value).replace(/\s+/g, "-");
}

function renderLinkedSegments(segments) {
  if (typeof segments === "string") return escapeHtml(segments);
  if (!Array.isArray(segments)) return "";
  return segments.map(segment => {
    if (segment.url) {
      return `<a href="${htmlAttr(segment.url)}">${escapeHtml(segment.text)}</a>`;
    }
    return escapeHtml(segment.text);
  }).join("");
}

function renderSite(site) {
  document.title = site.title || DEFAULT_SITE.title;
  document.getElementById("pageTitle").textContent = site.title || DEFAULT_SITE.title;
  document.getElementById("brandName").textContent = site.title || DEFAULT_SITE.title;
  document.getElementById("metaDescription").setAttribute("content", site.description || DEFAULT_SITE.description);

  const sections = { ...DEFAULT_SITE.sections, ...(site.sections || {}) };
  document.getElementById("researchLabel").textContent = sections.research;
  document.getElementById("publicationsHeading").textContent = sections.publications;
  document.getElementById("awardsHeading").textContent = sections.awards;
  document.getElementById("teachingHeading").textContent = sections.teaching;

  const navItems = Array.isArray(site.navigation) ? site.navigation : DEFAULT_SITE.navigation;
  const nav = document.getElementById("mainNav");
  const themeButton = document.getElementById("themeToggle");
  nav.innerHTML = navItems.map(item => `<a href="${htmlAttr(item.href)}">${escapeHtml(item.label)}</a>`).join("");
  nav.appendChild(themeButton);
}

function renderBio(bio) {
  const identity = document.getElementById("identityBlock");
  const portrait = bio.portrait || {};
  const lab = bio.lab || {};
  const socials = Array.isArray(bio.socials) ? bio.socials : [];
  const favicon = bio.favicon || {};
  const faviconLink = document.getElementById("faviconLink");

  if (faviconLink && favicon.src) {
    faviconLink.setAttribute("href", favicon.src);
    faviconLink.setAttribute("type", favicon.type || "image/png");
  }

  identity.innerHTML = `
    <img class="portrait" src="${htmlAttr(portrait.src || "")}" alt="${htmlAttr(portrait.alt || bio.name || "Portrait")}" />
    <p><strong>${escapeHtml(bio.role || "")}</strong></p>
    <p>${escapeHtml(bio.affiliation || "")}</p>
    ${lab.name ? `<p><a href="${htmlAttr(lab.url || "#")}">${escapeHtml(lab.name)}</a></p>` : ""}
    ${bio.email ? `<p><a href="mailto:${htmlAttr(bio.email)}">${escapeHtml(bio.email)}</a></p>` : ""}
    <div class="socials" aria-label="Academic and social links">
      ${socials.map(item => `
        <a class="icon-btn" href="${htmlAttr(item.url)}" aria-label="${htmlAttr(item.label)}" title="${htmlAttr(item.label)}">
          <i class="${htmlAttr(item.iconClass)}"></i>
        </a>
      `).join("")}
    </div>
  `;

  document.getElementById("bioText").innerHTML = renderLinkedSegments(bio.bio);
}

function renderResearch(research) {
  const grid = document.getElementById("researchGrid");
  const categories = Array.isArray(research.categories) ? research.categories : [];
  grid.classList.toggle("has-two-cards", categories.length === 2);
  grid.innerHTML = categories.map(category => {
    const topics = Array.isArray(category.topics) ? category.topics : [];
    return `
      <article class="research-card">
        <h3>${escapeHtml(category.name)}</h3>
        <p class="topic-line">
          ${topics.map(renderResearchTopicLink).join(", ")}
        </p>
      </article>
    `;
  }).join("");
}

function publicationTargets(topic) {
  if (Array.isArray(topic.hrefs)) return topic.hrefs.filter(Boolean);
  return topic.href ? [topic.href] : [];
}

function renderResearchTopicLink(topic) {
  const targets = publicationTargets(topic);
  const href = targets[0] || "#";
  const targetData = targets.length > 1 ? ` data-publication-targets="${htmlAttr(targets.join(" "))}"` : "";
  return `<a href="${htmlAttr(href)}"${targetData}>${escapeHtml(topic.label)}</a>`;
}

function renderAwards(data) {
  const list = document.getElementById("awardsList");
  const awards = Array.isArray(data.awards) ? data.awards : [];
  list.innerHTML = awards.map(award => `
    <li class="award-item">
      <span class="item-title">${escapeHtml(award.title)}</span>
      <span class="item-meta">${escapeHtml(award.institution)}</span>
    </li>
  `).join("");
}

function renderCompanyLink(experience) {
  const company = escapeHtml(experience.company || "");
  if (!company) return "";
  if (experience.url) return `<a href="${htmlAttr(experience.url)}">${company}</a>`;
  return company;
}

function renderTeaching(data) {
  const container = document.getElementById("teachingList");
  const experiences = Array.isArray(data.experiences) ? data.experiences : [];

  if (experiences.length) {
    container.innerHTML = experiences.map(experience => {
      const company = renderCompanyLink(experience);
      const period = experience.period ? `<span class="experience-period">${escapeHtml(experience.period)}</span>` : "";
      const description = experience.description ? `: ${escapeHtml(experience.description)}` : "";

      return `
        <article class="course">
          <h3 class="experience-title">${escapeHtml(experience.title)}</h3>
          ${period}
          <p>${company}${description}</p>
        </article>
      `;
    }).join("");
    return;
  }

  const courses = Array.isArray(data.courses) ? data.courses : [];
  container.innerHTML = courses.map(course => `
    <article class="course">
      <h3>${escapeHtml(course.code)} &mdash; ${escapeHtml(course.title)}</h3>
      <ul>
        <li><strong>${escapeHtml(course.role || data.defaultRole || "Lecturer")}</strong> (${escapeHtml(course.institution || data.institutionFullName || "")}): ${escapeHtml(course.years)}</li>
      </ul>
    </article>
  `).join("");
}

function renderPublicationNote(config) {
  const note = document.getElementById("publicationNote");
  if (note) note.textContent = config.note || "";
}

function aliasMatchFromConfig(normalizedTitle) {
  const aliases = publicationConfig.duplicateAliases || {};
  for (const [canonicalKey, aliasList] of Object.entries(aliases)) {
    if ((aliasList || []).some(alias => normalizeTitle(alias) === normalizedTitle)) return canonicalKey;
  }
  return null;
}

function canonicalize(pub) {
  const normalized = normalizeTitle(pub.title);
  const defaultRules = [
    {
      canonicalKey: "monocular-depth-estimation",
      match: title => title.includes("depth estimation") && title.includes("encoder")
    },
    {
      canonicalKey: "assistive-navigation-visually-impaired",
      match: title => title.includes("wayfinding") || title.includes("assistive navigation") || title.includes("visually impaired")
    }
  ];
  const defaultRule = defaultRules.find(rule => rule.match(normalized));
  return pub.canonicalKey || aliasMatchFromConfig(normalized) || (defaultRule && defaultRule.canonicalKey) || slugify(pub.title);
}

function inferType(pub) {
  const venue = normalizeTitle(pub.venue || "");
  if (/journal|visual computer|data in brief/.test(venue)) return "journal";
  if (/conference|iccit|eict|iceee|big data|iot|machine learning|ieee/.test(venue)) return "conference";
  if (/arxiv|preprint|ssrn/.test(venue)) return "preprint";
  return pub.type || "conference";
}

function scorePublication(pub) {
  const venue = normalizeTitle(pub.venue || "");
  let score = 0;
  if (pub.doi) score += 4;
  if (/journal|conference|ieee|springer|elsevier|visual computer|data in brief/.test(venue)) score += 3;
  if (/arxiv|preprint|ssrn/.test(venue)) score -= 2;
  if (/ssrn/.test(venue)) score -= 3;
  return score;
}

function applyPublicationConfig(pub) {
  const canonicalKey = pub.canonicalKey || canonicalize(pub);
  const pdfs = publicationConfig.pdfs || {};
  return {
    ...pub,
    canonicalKey,
    pdf: pub.pdf || pdfs[pub.id] || pdfs[canonicalKey] || pdfs[normalizeTitle(pub.title)] || ""
  };
}

function dedupePublications(publications) {
  const best = new Map();
  publications.forEach(pub => {
    const enriched = applyPublicationConfig({
      ...pub,
      type: pub.type || inferType(pub),
      canonicalKey: pub.canonicalKey || canonicalize(pub)
    });
    const existing = best.get(enriched.canonicalKey);
    if (!existing || scorePublication(enriched) > scorePublication(existing)) {
      best.set(enriched.canonicalKey, enriched);
    }
  });
  return Array.from(best.values()).sort((a, b) => {
    if (Number(b.year) !== Number(a.year)) return Number(b.year) - Number(a.year);
    return String(a.title).localeCompare(String(b.title));
  });
}

async function loadPublications(config) {
  const status = document.getElementById("publicationStatus");
  publicationConfig = { ...DEFAULT_PUBLICATION_CONFIG, ...(config || {}) };
  const localPublications = Array.isArray(publicationConfig.publications) ? publicationConfig.publications : [];

  if (!publicationConfig.sourceUrl) {
    if (!hadDataLoadError) {
      status.textContent = localPublications.length ? "" : "No publication data available.";
    }
    return dedupePublications(localPublications);
  }

  try {
    const response = await fetch(publicationConfig.sourceUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Publication endpoint returned ${response.status}`);
    const data = await response.json();
    status.textContent = hadDataLoadError ? DATA_LOAD_ERROR_MESSAGE : "";
    return dedupePublications(Array.isArray(data) ? data : data.publications || []);
  } catch (error) {
    status.textContent = localPublications.length
      ? "Could not load the publication endpoint; showing publications from data/publications.json."
      : DATA_LOAD_ERROR_MESSAGE;
    return dedupePublications(localPublications);
  }
}

function groupByYear(publications) {
  return publications.reduce((groups, pub) => {
    const year = pub.year || "Other";
    groups[year] = groups[year] || [];
    groups[year].push(pub);
    return groups;
  }, {});
}

function isArxivLink(link) {
  return /arxiv\.org/i.test(link || "");
}

function actionLinks(pub) {
  const links = [];
  if (pub.doi) links.push(`<a class="pub-action" href="https://doi.org/${htmlAttr(pub.doi)}">DOI</a>`);
  else if (pub.arxiv) links.push(`<a class="pub-action" href="https://arxiv.org/abs/${htmlAttr(pub.arxiv)}">arXiv</a>`);
  else if (pub.link && !isArxivLink(pub.link)) links.push(`<a class="pub-action" href="${htmlAttr(pub.link)}">Link</a>`);

  if (pub.pdf) links.push(`<a class="pub-action" href="${htmlAttr(pub.pdf)}">PDF</a>`);
  return links.join("");
}

function publicationTitleHref(pub) {
  if (pub.doi) return `https://doi.org/${pub.doi}`;
  if (pub.arxiv) return `https://arxiv.org/abs/${pub.arxiv}`;
  return pub.link || "#";
}

function formatAuthorName(name) {
  const escaped = escapeHtml(name);
  return escaped === "Shupta Das" ? `<strong>${escaped}</strong>` : escaped;
}

function formatAuthors(pub) {
  const authors = String(pub.authors || "").split(",").map(author => author.trim()).filter(Boolean);
  const equalContributionCount = Number(pub.equalContributionAuthorCount || 0);

  if (!authors.length) return "";

  return authors.map((author, index) => {
    const marker = index < equalContributionCount ? `<sup class="equal-marker">*</sup>` : "";
    return `${formatAuthorName(author)}${marker}`;
  }).join(", ");
}

function renderPublications(publications, filter = "all") {
  const container = document.getElementById("publicationList");
  const filtered = filter === "all" ? publications : publications.filter(pub => pub.type === filter);
  const groups = groupByYear(filtered);
  const years = Object.keys(groups).sort((a, b) => Number(b) - Number(a));

  container.innerHTML = years.map(year => `
    <section class="pub-year" aria-label="Publications from ${escapeHtml(year)}">
      <div class="year-label">${escapeHtml(year)}</div>
      <div class="pub-list">
        ${groups[year].map(pub => `
          <article class="pub-item" id="${htmlAttr(pub.id || pub.canonicalKey)}" data-type="${htmlAttr(pub.type)}">
            <p class="pub-title"><a href="${htmlAttr(publicationTitleHref(pub))}">${escapeHtml(pub.title)}</a></p>
            <p class="authors">${formatAuthors(pub)}</p>
            <p class="venue">${escapeHtml(pub.venue)}</p>
            <div class="pub-actions">${actionLinks(pub)}</div>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");

  attachPublicationInteractions();
  highlightPublicationFromHash();
}

function flashPublication(item) {
  if (!item) return;
  item.classList.remove("is-highlighted");
  void item.offsetWidth;
  item.classList.add("is-highlighted");
}

function highlightPublicationFromHash() {
  if (!location.hash) return;
  const item = document.querySelector(location.hash);
  if (item && item.classList.contains("pub-item")) flashPublication(item);
}

function attachPublicationInteractions() {
  document.querySelectorAll(".pub-item").forEach(item => {
    item.addEventListener("click", () => flashPublication(item));
  });
}

function attachPublicationFilters() {
  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      renderPublications(allPublications, button.dataset.filter);
    });
  });
}

function attachResearchPublicationLinks() {
  document.addEventListener("click", event => {
    const link = event.target.closest('a[data-publication-targets], a[href^="#pub-"]');
    if (!link) return;
    const targetIds = (link.dataset.publicationTargets || link.getAttribute("href") || "")
      .split(/\s+/)
      .filter(Boolean);
    if (!targetIds.length) return;

    event.preventDefault();
    const allButton = document.querySelector('[data-filter="all"]');
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("is-active"));
    if (allButton) allButton.classList.add("is-active");
    renderPublications(allPublications, "all");

    const targets = targetIds
      .map(targetId => document.querySelector(targetId))
      .filter(target => target && target.classList.contains("pub-item"));
    if (targets.length) {
      targets[0].scrollIntoView({ behavior: "smooth", block: "center" });
      window.history.replaceState(null, "", targetIds[0]);
      window.setTimeout(() => targets.forEach(flashPublication), 280);
    }
  });
}

const THEME_ICONS = {
  sun: `<svg class="theme-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2.25M12 19.25v2.25M4.75 4.75l1.6 1.6M17.65 17.65l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.75 19.25l1.6-1.6M17.65 6.35l1.6-1.6"></path></svg>`,
  moon: `<svg class="theme-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.4 8.4 0 0 1 8.8 4 8.4 8.4 0 1 0 20 15.2Z"></path></svg>`
};

function setThemeIcon(theme) {
  const button = document.getElementById("themeToggle");
  button.innerHTML = theme === "dark" ? THEME_ICONS.sun : THEME_ICONS.moon;
  button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
}

function initTheme() {
  const button = document.getElementById("themeToggle");
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  setThemeIcon(currentTheme);
  button.addEventListener("click", () => {
    const root = document.documentElement;
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", nextTheme);
    setThemeIcon(nextTheme);
  });
}

async function init() {
  const [site, bio, research, awards, teaching, publicationSettings] = await Promise.all([
    fetchJson(DATA_PATHS.site, DEFAULT_SITE),
    fetchJson(DATA_PATHS.bio, DEFAULT_BIO),
    fetchJson(DATA_PATHS.research, DEFAULT_RESEARCH),
    fetchJson(DATA_PATHS.awards, DEFAULT_AWARDS),
    fetchJson(DATA_PATHS.teaching, DEFAULT_TEACHING),
    fetchJson(DATA_PATHS.publications, DEFAULT_PUBLICATION_CONFIG)
  ]);

  renderSite({ ...DEFAULT_SITE, ...site });
  renderBio({ ...DEFAULT_BIO, ...bio });
  renderResearch({ ...DEFAULT_RESEARCH, ...research });
  renderAwards({ ...DEFAULT_AWARDS, ...awards });
  renderTeaching({ ...DEFAULT_TEACHING, ...teaching });
  renderPublicationNote({ ...DEFAULT_PUBLICATION_CONFIG, ...publicationSettings });

  initTheme();
  allPublications = await loadPublications(publicationSettings);
  renderPublications(allPublications);
  attachPublicationFilters();
  attachResearchPublicationLinks();
  window.addEventListener("hashchange", highlightPublicationFromHash);
}

init();
