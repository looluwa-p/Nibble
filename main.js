const $ = (id) => document.getElementById(id);
const MEALDB = "https://www.themealdb.com/api/json/v1/1";
const PAGE_SIZE = 8;

const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2l.9-12.5M10 11v5M14 11v5"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5"/>',
  pot: '<path d="M4 10.5h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zM2.5 10.5h19M9.5 7c0-1.4 1-1.6 1-3M14 7c0-1.4 1-1.6 1-3"/>',
};

const ART = {
  pot: `<svg viewBox="0 0 200 150" aria-hidden="true" focusable="false">
    <path d="M70 26c-6 8 6 12 0 20M100 16c-6 8 6 12 0 20M130 26c-6 8 6 12 0 20" fill="none" stroke="#f3d9bd" stroke-width="5" stroke-linecap="round"/>
    <path d="M60 72c-5-18 7-31 25-31 3 18-7 31-25 31z" fill="#3ad966"/>
    <circle cx="100" cy="64" r="17" fill="#c72720"/>
    <path d="M93 48l7 5 7-5" fill="none" stroke="#2e9e57" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M124 74l26-40-10 42z" fill="#f07243"/>
    <path d="M150 34l3-12M150 34l12-3M150 34l10-9" fill="none" stroke="#2e9e57" stroke-width="4" stroke-linecap="round"/>
    <rect x="12" y="82" width="26" height="11" rx="5.5" fill="#95301a"/>
    <rect x="162" y="82" width="26" height="11" rx="5.5" fill="#95301a"/>
    <path d="M34 74h132v16a42 42 0 0 1-42 42H76a42 42 0 0 1-42-42z" fill="#95301a"/>
    <rect x="26" y="68" width="148" height="12" rx="6" fill="#f07243"/>
    <path d="M54 94c2 12 10 21 22 25" fill="none" stroke="#feefd0" stroke-width="5" stroke-linecap="round" opacity=".45"/>
  </svg>`,
  bag: `<svg viewBox="0 0 140 140" aria-hidden="true" focusable="false">
    <rect x="76" y="10" width="18" height="62" rx="9" transform="rotate(16 85 41)" fill="#e9b872"/>
    <path d="M42 58c-9-16-3-33 14-37 6 17 0 31-14 37z" fill="#3ad966"/>
    <path d="M54 60c0-14 10-25 25-25 0 14-10 25-25 25z" fill="#2e9e57"/>
    <circle cx="100" cy="54" r="14" fill="#c72720"/>
    <path d="M26 60h88l-8 68H34z" fill="#feefd0" stroke="#95301a" stroke-width="4" stroke-linejoin="round"/>
    <path d="M70 112s-15-8.6-15-19a7.5 7.5 0 0 1 15-2.5 7.5 7.5 0 0 1 15 2.5c0 10.4-15 19-15 19z" fill="#f07243"/>
  </svg>`,
};

const LINKS = {
  foodBank: { label: "Find a food bank near me", url: "https://www.google.com/maps/search/food+bank+near+me" },
  fridge: { label: "Find a community fridge", url: "https://www.google.com/maps/search/community+fridge+near+me" },
  feedingAmerica: { label: "Feeding America food bank finder", url: "https://www.feedingamerica.org/find-your-local-foodbank" },
};

const STATUS_LABEL = { fresh: "Fresh", soon: "Use soon", now: "Use now", expired: "Expired" };
const URGENCY = { expired: 3, now: 3, soon: 2, fresh: 1 };

const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
const img = (src, alt) => `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" data-fallback>`;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const linkItem = (l) => `<li><a href="${l.url}" target="_blank" rel="noopener"><span>${l.label}</span>${icon("external")}</a></li>`;


function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

let items = load("nibble-items", []);
items.forEach((it) => { if (!it.id) it.id = newId(); });

let stats = load("nibble-stats", null);
if (!stats) {
  const old = Number(localStorage.getItem("nibble-saved") || 0);
  stats = { items: old, lb: old * ESTIMATES.other.lb, money: old * ESTIMATES.other.price };
}

const deselected = new Set();

function save() {
  try {
    localStorage.setItem("nibble-items", JSON.stringify(items));
    localStorage.setItem("nibble-stats", JSON.stringify(stats));
  } catch {
    toast("Couldn't save your changes on this device. They'll be lost when you close the page.");
  }
}


function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function singular(w) {
  if (w.length <= 3) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("oes")) return w.slice(0, -2);
  if (/(ch|sh|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
  return w;
}

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).map(singular).join(" ");
}

const lastWord = (n) => n.split(" ").pop();
const hasWord = (text, word) => ` ${text} `.includes(` ${word} `);

const GROUPS_N = Object.entries(FOOD_GROUPS).map(([group, words]) => [group, words.map(norm)]);
const FOOD_WORDS = new Set(GROUPS_N.flatMap(([, words]) => words).filter((w) => !w.includes(" ")));
const STAPLES_N = new Set(STAPLES.map(norm));
const ALIASES_N = Object.fromEntries(Object.entries(ALIASES).map(([k, v]) => [norm(k), v.map(norm)]));

function groupOf(name) {
  const n = norm(name);
  const hit = GROUPS_N.find(([, words]) => words.some((w) => hasWord(n, w)));
  return hit ? hit[0] : "other";
}


function daysLeft(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr + "T00:00:00");
  return Math.round((exp - today) / 86400000);
}

const status = (d) => d < 0 ? "expired" : d <= 1 ? "now" : d <= 3 ? "soon" : "fresh";
const statusOf = (item) => status(daysLeft(item.expiry));
const weight = (item) => URGENCY[statusOf(item)];

function expiryText(item) {
  const d = daysLeft(item.expiry);
  if (d < -1) return `Expired ${-d} days ago`;
  if (d === -1) return "Expired yesterday";
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  const date = new Date(item.expiry + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${d} days left · ${date}`;
}

function isoDate(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function valueOf(item) {
  const est = ESTIMATES[groupOf(item.name)];
  return { lb: est.lb, price: item.price ?? est.price, estimated: item.price == null };
}

function fmtMoney(n) {
  const digits = n >= 100 ? 0 : 2;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const approx = (v) => `${v.estimated ? "about " : ""}${fmtMoney(v.price)}`;

function listNames(list) {
  const names = list.map((it) => it.name);
  if (names.length <= 3) return names.join(names.length === 2 ? " and " : ", ").replace(/, ([^,]*)$/, ", and $1");
  return `${names.slice(0, 2).join(", ")}, and ${names.length - 2} more`;
}


function itemRow(item) {
  const s = statusOf(item), v = valueOf(item), name = esc(item.name);
  return `<li class="item" data-id="${item.id}">
    <div>
      <p class="item__name">${name}</p>
      <p class="item__meta">
        <span class="status status--${s}">${STATUS_LABEL[s]}</span>
        <span>${expiryText(item)}</span>
        <span class="item__price"${v.estimated ? ' title="Estimated price"' : ""}>${v.estimated ? "~" : ""}${fmtMoney(v.price)}</span>
      </p>
    </div>
    <div class="item__actions">
      <button type="button" class="btn btn--sm btn--success" data-act="use" aria-label="Used ${name}">Used</button>
      <button type="button" class="btn btn--sm btn--secondary" data-act="donate" aria-label="Donate ${name}">Donate</button>
      <button type="button" class="btn btn--sm btn--ghost btn--icon" data-act="toss" aria-label="Toss ${name}" title="Toss">${icon("trash")}</button>
    </div>
  </li>`;
}

function chipInner(item) {
  return `${deselected.has(item.id) ? "" : icon("check")}${esc(item.name)}`;
}

const chosenItems = () => items.filter((it) => !deselected.has(it.id));

function updateIdeasButton() {
  const n = chosenItems().length;
  $("ideas-btn").disabled = !n;
  $("ideas-btn-label").textContent = n ? `Find recipes with ${plural(n, "food")}` : "Find recipes";
}

function render() {
  items.sort((a, b) => daysLeft(a.expiry) - daysLeft(b.expiry));

  $("list").innerHTML = items.map(itemRow).join("");
  $("empty").hidden = items.length > 0;
  $("key").hidden = items.length === 0;
  $("item-count").textContent = items.length ? `(${items.length})` : "";

  $("chips").innerHTML = items.map((item) =>
    `<button type="button" class="chip" data-id="${item.id}" aria-pressed="${!deselected.has(item.id)}">${chipInner(item)}</button>`).join("");

  updateIdeasButton();
  renderStats();
  if (ideasState === "idle") renderIdle();
}

function renderStats() {
  const lb = stats.lb < 10 ? stats.lb.toFixed(1) : Math.round(stats.lb).toLocaleString("en-US");
  const values = {
    "stat-items": stats.items.toLocaleString("en-US"),
    "stat-money": fmtMoney(stats.money),
    "stat-weight": `${lb}<span class="stats__unit">lb</span>`,
  };
  for (const [id, html] of Object.entries(values)) {
    const el = $(id);
    el.innerHTML = html;
  }
}

function rescue(id) {
  const item = items.find((it) => it.id === id);
  if (!item) return null;
  const v = valueOf(item);
  items = items.filter((it) => it !== item);
  stats.items++; stats.lb += v.lb; stats.money += v.price;
  return v;
}

function focusRow(index) {
  const rows = $("list").querySelectorAll(".item");
  const row = rows[Math.min(index, rows.length - 1)];
  if (row) row.querySelector("button").focus({ preventScroll: true });
  else $("name").focus();
}

function tossItem(item) {
  const index = items.indexOf(item);
  items = items.filter((it) => it !== item);
  save(); render();
  focusRow(index);
  toast(`Removed ${item.name}.`, {
    label: "Undo",
    run: () => {
      items.push(item);
          save(); render();
      toast(`${item.name} is back in your fridge.`);
    },
  });
}

function setError(field, on) {
  const input = $(field);
  input.setAttribute("aria-invalid", on);
  if (on) input.setAttribute("aria-describedby", `${field}-error`);
  else input.removeAttribute("aria-describedby");
  $(`${field}-error`).hidden = !on;
}

function setQuickDate(active) {
  document.querySelectorAll(".quick-dates .pill-btn").forEach((b) => b.setAttribute("aria-pressed", b === active));
}

$("add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("name").value.trim(), expiry = $("expiry").value;
  setError("name", !name);
  setError("expiry", !expiry);
  if (!name || !expiry) return (!name ? $("name") : $("expiry")).focus();

  const price = parseFloat($("price").value);
  const item = { id: newId(), name, expiry, price: isNaN(price) || price < 0 ? null : price };
  items.push(item);

  e.target.reset();
  setQuickDate(null);
  closeScan();
  save(); render();
  toast(`Added ${name}.`);
  $("name").focus();
});

$("name").addEventListener("input", () => setError("name", false));
$("expiry").addEventListener("input", () => { setQuickDate(null); setError("expiry", false); });

document.querySelectorAll(".quick-dates .pill-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    $("expiry").value = isoDate(Number(btn.dataset.days));
    setQuickDate(btn);
    setError("expiry", false);
  }));

$("list").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const item = items.find((it) => it.id === btn.closest(".item").dataset.id);
  if (!item) return;

  if (btn.dataset.act === "use") {
    const index = items.indexOf(item);
    const v = rescue(item.id);
    save(); render();
    focusRow(index);
    toast(`${item.name} used. You saved ${approx(v)}.`);
  } else if (btn.dataset.act === "donate") {
    openDonate(item, btn);
  } else {
    tossItem(item);
  }
});

$("chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const id = chip.dataset.id;
  deselected.has(id) ? deselected.delete(id) : deselected.add(id);
  chip.setAttribute("aria-pressed", !deselected.has(id));
  chip.innerHTML = chipInner(items.find((it) => it.id === id));
  updateIdeasButton();
});


const recipes = new Map();
const score = (r) => r.used.reduce((s, it) => s + weight(it), 0);
let search = null;
let searchId = 0;
let ideasState = "idle";

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

let mealdbNames = null;
async function getMealdbNames() {
  if (mealdbNames) return mealdbNames;
  const cached = load("nibble-mealdb-ingredients", null);
  let names = cached && Date.now() - cached.at < 7 * 86400000 ? cached.names : null;
  if (!names) {
    const data = await getJSON(`${MEALDB}/list.php?i=list`);
    names = (data.meals || []).map((m) => m.strIngredient).filter(Boolean);
    try { localStorage.setItem("nibble-mealdb-ingredients", JSON.stringify({ at: Date.now(), names })); } catch {}
  }
  return (mealdbNames = names.map((name) => [name, norm(name)]));
}

function resolveIngredient(name, names) {
  const n = norm(name), words = n.split(" ");
  const tries = [n];
  for (let i = 1; i < words.length; i++) tries.push(words.slice(i).join(" "));
  words.filter((w) => FOOD_WORDS.has(w)).reverse().forEach((w) => tries.push(w));
  for (const t of tries) {
    const wanted = ALIASES_N[t] || [t];
    const hits = names.filter(([, x]) => wanted.includes(x)).map(([orig]) => orig);
    if (hits.length) return hits;
  }
  return names.filter(([, x]) => x.endsWith(" " + n)).map(([orig]) => orig).slice(0, 4);
}

const filterCache = new Map();
function mealsWith(ingredient) {
  if (!filterCache.has(ingredient)) {
    const req = getJSON(`${MEALDB}/filter.php?i=${encodeURIComponent(ingredient.replace(/ /g, "_"))}`)
      .then((d) => d.meals || [])
      .catch((err) => { filterCache.delete(ingredient); throw err; });
    filterCache.set(ingredient, req);
  }
  return filterCache.get(ingredient);
}

async function rankMealDB(pantry) {
  const names = await getMealdbNames();
  const resolved = new Map();
  const tally = new Map();

  await Promise.all(pantry.map(async (it) => {
    const ings = resolveIngredient(it.name, names);
    resolved.set(it.id, ings.map(norm));
    const lists = await Promise.all(ings.map(mealsWith));
    lists.flat().forEach((meal) => {
      if (!tally.has(meal.idMeal)) tally.set(meal.idMeal, { meal, used: new Set(), tie: Math.random() });
      tally.get(meal.idMeal).used.add(it.id);
    });
  }));

  const ranked = [...tally.values()]
    .map((t) => ({ ...t, used: pantry.filter((it) => t.used.has(it.id)) }))
    .sort((a, b) => score(b) - score(a) || a.tie - b.tie);
  return { pantry, resolved, ranked, shown: 0 };
}

async function nextPage(s) {
  const batch = s.ranked.slice(s.shown, s.shown + PAGE_SIZE);
  s.shown += batch.length;
  const full = await Promise.all(batch.map((t) =>
    getJSON(`${MEALDB}/lookup.php?i=${t.meal.idMeal}`).then((d) => d.meals && d.meals[0]).catch(() => null)));
  return full.filter(Boolean).map((meal) => buildMeal(meal, s.pantry, s.resolved)).sort((a, b) => score(b) - score(a));
}

function buildMeal(m, pantry, resolved) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (m[`strIngredient${i}`] || "").trim();
    if (!ing) continue;
    const measure = (m[`strMeasure${i}`] || "").trim();
    const n = norm(ing);
    const mine = pantry.filter((it) => resolved.get(it.id).includes(n) ||
      (!STAPLES_N.has(n) && lastWord(n) === lastWord(norm(it.name))));
    ingredients.push({ text: measure ? `${measure} ${ing}` : ing, mine, kind: mine.length ? "have" : STAPLES_N.has(n) ? "staple" : "need" });
  }
  const used = pantry.filter((it) => ingredients.some((ing) => ing.mine.includes(it)));
  const links = [];
  if (m.strSource) links.push({ label: "Original recipe", url: m.strSource });
  if (m.strYoutube) links.push({ label: "Watch the video", url: m.strYoutube });
  return {
    id: "m-" + m.idMeal, source: "TheMealDB", name: m.strMeal.trim(), thumb: m.strMealThumb,
    meta: [m.strArea, m.strCategory].filter((x) => x && x !== "Unknown").join(" · "),
    used, ingredients, steps: splitSteps(m.strInstructions), links,
  };
}

function splitSteps(text) {
  let steps = (text || "").split(/\r?\n+/)
    .map((s) => s.replace(/^\s*(step\s*\d+\s*[:.)-]?|\d+\s*[.)])\s*/i, "").trim())
    .filter((s) => s.length > 2);
  if (steps.length === 1) steps = steps[0].split(/(?<=[.!?])\s+(?=[A-Z])/);
  return steps;
}


function announce(msg) { $("ideas-status").textContent = msg; }

function renderIdle() {
  const ready = items.length > 0;
  $("ideas").innerHTML = `<div class="empty">
    <div class="empty__art">${ART.pot}</div>
    <p class="empty__title">${ready ? "Let's get cooking" : "Nothing to cook with yet"}</p>
    <p class="empty__text">${ready
      ? "Pick a few foods above and hit Find recipes."
      : "Add a few foods to your fridge and Nibble will suggest recipes that use them."}</p>
    ${ready ? "" : `<button type="button" class="btn btn--secondary" data-act="focus-add">Add food</button>`}
  </div>`;
}

function donateTip(pantry) {
  const urgent = pantry.filter((it) => statusOf(it) === "now");
  if (!urgent.length) return "";
  return `<div class="notice"><p>Won't get to the ${esc(listNames(urgent))} in time? <a href="#donate" data-act="jump-donate">Share it instead</a>.</p></div>`;
}

function webSearch(pantry) {
  const q = encodeURIComponent(pantry.map((it) => it.name).join(" "));
  return `<div class="web-search">
    <h3 class="web-search__title">Want more ideas?</h3>
    <p>Search other recipe sites for the same foods. They open in a new tab.</p>
    <div class="web-search__links">
      <a class="btn btn--secondary btn--sm" href="https://www.allrecipes.com/search?q=${q}" target="_blank" rel="noopener">Allrecipes${icon("external")}</a>
      <a class="btn btn--secondary btn--sm" href="https://www.myrecipes.com/search?q=${q}" target="_blank" rel="noopener">MyRecipes${icon("external")}</a>
    </div>
  </div>`;
}

function recipeCard(r) {
  recipes.set(r.id, r);
  const need = r.ingredients.filter((x) => x.kind === "need").length;
  return `<button type="button" class="recipe-card" data-recipe="${esc(r.id)}">
    <span class="media">${img(`${r.thumb}/preview`, "")}</span>
    <span class="recipe-card__body">
      <span class="recipe-card__title">${esc(r.name)}</span>
      <span class="recipe-card__uses"><span class="match">Uses ${r.used.length}</span> · ${esc(r.used.map((it) => it.name).join(", "))}</span>
      <span class="recipe-card__meta">${need ? `${need} to buy` : "Nothing to buy"}${r.meta ? ` · ${esc(r.meta)}` : ""}</span>
    </span>
  </button>`;
}

function moreButton() {
  const left = search.ranked.length - search.shown;
  return left > 0 ? `<button type="button" class="btn btn--secondary btn--block" data-act="more">Show more recipes (${left.toLocaleString("en-US")} more)</button>` : "";
}

async function runSearch() {
  const pantry = chosenItems();
  if (!pantry.length) return;
  const mySearch = ++searchId, box = $("ideas");
  recipes.clear();
  ideasState = "loading";
  box.setAttribute("aria-busy", "true");
  box.innerHTML = `<p class="ideas__summary"><span>Looking for recipes with ${esc(listNames(pantry))}…</span></p>`;
  announce("Searching recipes…");

  let s, first;
  try {
    s = await rankMealDB(pantry);
    first = await nextPage(s);
  } catch {
    if (mySearch !== searchId) return;
    ideasState = "error";
    box.removeAttribute("aria-busy");
    box.innerHTML = `<div class="notice notice--error"><div>
        <p class="notice__title">Couldn't load recipes</p>
        <p>The recipe service didn't respond. Check your connection, then try again.</p>
        <button type="button" class="btn btn--secondary btn--sm" data-act="retry">Try again</button>
      </div></div>${webSearch(pantry)}`;
    announce("Couldn't load recipes. Check your connection, then try again.");
    return;
  }
  if (mySearch !== searchId) return;

  search = s;
  ideasState = "results";
  box.removeAttribute("aria-busy");
  const count = s.ranked.length;

  if (!count) {
    box.innerHTML = `${donateTip(pantry)}<div class="empty">
        <div class="empty__art">${ART.pot}</div>
        <p class="empty__title">No recipes use these foods yet</p>
        <p class="empty__text">Try a different mix above, or search other recipe sites below.</p>
      </div>${webSearch(pantry)}`;
    announce("No recipes found for these foods.");
    return;
  }

  box.innerHTML = `${donateTip(pantry)}
    <p class="ideas__summary"><span><strong>${count.toLocaleString("en-US")} ${count === 1 ? "recipe uses" : "recipes use"}</strong> your food</span><span>Best matches first</span></p>
    <div id="results" class="results">${first.map((r) => recipeCard(r)).join("")}</div>
    <div class="ideas__more">${moreButton()}</div>
    ${webSearch(pantry)}`;
  announce(`Found ${plural(count, "recipe")}.`);
}

async function showMore(btn) {
  const mySearch = searchId;
  btn.disabled = true;
  btn.textContent = "Loading more recipes…";
  const page = await nextPage(search);
  if (mySearch !== searchId) return;
  const results = $("results"), start = results.children.length;
  results.insertAdjacentHTML("beforeend", page.map((r) => recipeCard(r)).join(""));
  btn.parentElement.innerHTML = moreButton();
  results.children[start]?.focus();
  announce(`Showing ${results.children.length} recipes.`);
}

$("ideas-btn").addEventListener("click", runSearch);

$("ideas").addEventListener("click", (e) => {
  const card = e.target.closest(".recipe-card");
  if (card) return openRecipe(recipes.get(card.dataset.recipe), card);
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "more") showMore(e.target.closest("button"));
  if (act === "retry") runSearch();
  if (act === "focus-add") {
    $("name").scrollIntoView({ behavior: "smooth", block: "center" });
    $("name").focus({ preventScroll: true });
  }
  if (act === "jump-donate") {
    e.preventDefault();
    $("donate").scrollIntoView({ behavior: "smooth" });
    $("donate").querySelector("a")?.focus({ preventScroll: true });
  }
});

document.addEventListener("error", (e) => {
  const el = e.target;
  if (el.tagName !== "IMG" || !el.hasAttribute("data-fallback")) return;
  const box = el.closest(".media");
  if (!box) return;
  box.classList.add("media--fallback");
  box.innerHTML = icon("pot");
}, true);


const sheet = $("sheet");
let opener = null;

$("sheet-close").addEventListener("click", () => sheet.close());
sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });
sheet.addEventListener("close", () => {
  if (opener?.isConnected) opener.focus();
  opener = null;
});

function openSheet(html, { wide = false, from = null } = {}) {
  opener = from || document.activeElement;
  $("sheet-body").innerHTML = html;
  sheet.classList.toggle("dialog--wide", wide);
  sheet.showModal();
  sheet.scrollTop = 0;
  $("sheet-close").focus();
}

function closeSheetQuietly() {
  opener = null;
  sheet.close();
}

function openRecipe(r, from) {
  const by = (kind) => r.ingredients.filter((i) => i.kind === kind);
  const have = by("have"), need = by("need"), basics = by("staple");
  const stillHave = r.used.filter((it) => items.includes(it));
  const li = (ing) => `<li>${esc(ing.text)}${ing.mine.length ? `<small>Your ${esc(ing.mine.map((it) => it.name).join(", "))}</small>` : ""}</li>`;
  const group = (kind, label, list, extra = "") => list.length
    ? `<div class="ing-group ing-group--${kind}"><p class="ing-group__label">${label} (${list.length})</p><ul class="ings">${list.map(li).join("")}</ul>${extra}</div>`
    : "";

  openSheet(`
    <div class="media sheet__hero">${img(r.thumb, `Photo of ${r.name}`)}</div>
    <div class="sheet__content">
      <p class="sheet__eyebrow">Recipe from ${esc(r.source)}</p>
      <h2 id="sheet-title" class="sheet__title">${esc(r.name)}</h2>
      <div class="sheet__meta">
        <span class="tag tag--have">Uses ${r.used.length} of your ${r.used.length === 1 ? "food" : "foods"}</span>
        ${need.length ? `<span class="tag tag--need">${need.length} to buy</span>` : `<span class="tag tag--have">Nothing to buy</span>`}
        ${r.meta ? `<span>${esc(r.meta)}</span>` : ""}
      </div>
      <div class="sheet__cols">
        <section>
          <h3 class="sheet__heading">Ingredients</h3>
          ${group("have", "You have", have)}
          ${group("need", "To buy", need, `<button type="button" id="shop-btn" class="btn btn--secondary btn--sm">Share shopping list</button>`)}
          ${group("basic", "Pantry basics", basics)}
        </section>
        <section>
          <h3 class="sheet__heading">Method</h3>
          <ol class="steps">${r.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join("")}</ol>
          ${r.links.length ? `<div class="sheet__links">${r.links.map((l) =>
            `<a class="btn btn--secondary btn--sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}${icon("external")}</a>`).join("")}</div>` : ""}
        </section>
      </div>
    </div>
    ${stillHave.length ? `<div class="sheet__footer">
      <button type="button" id="cooked-btn" class="btn btn--primary btn--block">I made this · mark ${plural(stillHave.length, "food")} as used</button>
    </div>` : ""}
  `, { wide: true, from });

  $("shop-btn")?.addEventListener("click", () => shareList(r.name, need.map((i) => i.text)));
  $("cooked-btn")?.addEventListener("click", () => {
    let total = 0;
    stillHave.forEach((it) => { total += rescue(it.id).price; });
    save();
    searchId++;
    ideasState = "idle";
    closeSheetQuietly();
    render();
    $("ideas-btn").focus();
    toast(`Nice cooking! ${plural(stillHave.length, "food")} used, about ${fmtMoney(total)} saved.`);
  });
}

async function shareList(title, lines) {
  const text = `Shopping list for ${title}:\n` + lines.map((l) => `• ${l}`).join("\n");
  try {
    if (navigator.share) await navigator.share({ title: "Shopping list", text });
    else {
      await navigator.clipboard.writeText(text);
      toast("Shopping list copied.");
    }
  } catch (err) {
    if (err.name !== "AbortError") toast("Couldn't share the list. Try again.");
  }
}

function openDonate(item, from) {
  const expired = daysLeft(item.expiry) < 0, name = esc(item.name), index = items.indexOf(item);
  const option = (title, text, links = []) => `<div class="option">
      <div>
        <p class="option__title">${title}</p>
        <p>${text}</p>
        ${links.length ? `<ul class="link-list link-list--plain">${links.map(linkItem).join("")}</ul>` : ""}
      </div>
    </div>`;

  openSheet(`
    <div class="sheet__art">${ART.bag}</div>
    <div class="sheet__content">
      <p class="sheet__eyebrow">${expired ? "Past its date" : "Share it"}</p>
      <h2 id="sheet-title" class="sheet__title">${expired ? `Your ${name} has expired` : `Donate your ${name}`}</h2>
      <div class="options">
        ${expired
          ? option("Food banks can't take expired food", "If it still looks, smells, and tastes fine, use it today. If not, compost it or throw it away.")
          : option("Sealed and in date", "Food banks accept unopened food before its date.", [LINKS.foodBank, LINKS.feedingAmerica]) +
            option("Fresh or opened", "Community fridges and neighbors can use produce and opened food.", [LINKS.fridge])}
      </div>
    </div>
    <div class="sheet__footer">
      ${expired
        ? `<button type="button" id="sheet-toss" class="btn btn--primary btn--block">Remove from fridge</button>`
        : `<button type="button" id="donated-btn" class="btn btn--primary btn--block">I donated it</button>`}
    </div>
  `, { from });

  $("donated-btn")?.addEventListener("click", () => {
    rescue(item.id);
    save();
    closeSheetQuietly();
    render();
    focusRow(index);
    toast(`Thanks for sharing the ${item.name}.`);
  });
  $("sheet-toss")?.addEventListener("click", () => {
    closeSheetQuietly();
    tossItem(item);
  });
}


const scanStatus = (msg) => { $("scan-status").textContent = msg; };

function closeScan() {
  $("scan-panel").hidden = true;
  $("scan-btn").setAttribute("aria-expanded", "false");
  scanStatus("");
}

$("scan-btn").addEventListener("click", () => {
  const panel = $("scan-panel"), open = panel.hidden;
  panel.hidden = !open;
  $("scan-btn").setAttribute("aria-expanded", open);
  if (open) $("barcode").focus();
});

$("scan-photo").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (!("BarcodeDetector" in window)) {
    $("barcode").focus();
    return scanStatus("This browser can't read barcode photos. Type the number printed under the barcode instead.");
  }
  scanStatus("Reading the barcode…");
  try {
    const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    const codes = await detector.detect(await createImageBitmap(file));
    if (!codes.length) return scanStatus("No barcode found in that photo. Try again closer up, in good light.");
    $("barcode").value = codes[0].rawValue;
    lookupBarcode(codes[0].rawValue);
  } catch {
    scanStatus("Couldn't read that photo. Try again, or type the barcode number.");
  }
});

$("barcode-btn").addEventListener("click", () => lookupBarcode($("barcode").value));
$("barcode").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); lookupBarcode($("barcode").value); }
});

async function lookupBarcode(raw) {
  const code = raw.replace(/\D/g, "");
  if (code.length < 8) return scanStatus("Barcodes are 8 to 13 digits long. Check the number and try again.");
  scanStatus("Looking up the product…");
  let data;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,generic_name,brands`);
    data = await res.json();
  } catch {
    return scanStatus("Couldn't reach the barcode database. Check your connection, then try again.");
  }
  const p = data.product;
  const name = p && (p.product_name || p.generic_name);
  if (!name) return scanStatus("That product isn't in the database yet. Type the food name instead.");
  $("name").value = name;
  setError("name", false);
  scanStatus(`Found ${name}${p.brands ? ` (${p.brands.split(",")[0]})` : ""}. Now choose when it expires.`);
  $("expiry").focus();
}


let toastTimer;
function toast(msg, action) {
  const t = $("toast"), btn = $("toast-action");
  $("toast-text").textContent = msg;
  btn.hidden = !action;
  btn.textContent = action ? action.label : "";
  btn.onclick = action ? () => { hideToast(); action.run(); } : null;
  t.classList.remove("is-visible");
  void t.offsetWidth;
  t.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 6000 : 3500);
}

function hideToast() { $("toast").classList.remove("is-visible"); }


document.querySelectorAll("[data-icon]").forEach((el) => { el.outerHTML = icon(el.dataset.icon); });
document.querySelectorAll("[data-art]").forEach((el) => { el.innerHTML = ART[el.dataset.art]; });
document.querySelector(".donate__links").innerHTML = [LINKS.foodBank, LINKS.fridge, LINKS.feedingAmerica].map(linkItem).join("");
render();
