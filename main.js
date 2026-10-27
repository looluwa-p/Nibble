const $ = (id) => document.getElementById(id);
const MEALDB = "https://www.themealdb.com/api/json/v1/1";

let items = JSON.parse(localStorage.getItem("nibble-items") || "[]");
let stats = JSON.parse(localStorage.getItem("nibble-stats") || '{"items":0,"lb":0,"money":0}');
let unchecked = new Set();

function save() {
  localStorage.setItem("nibble-items", JSON.stringify(items));
  localStorage.setItem("nibble-stats", JSON.stringify(stats));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function money(n) {
  return "$" + n.toFixed(2);
}

function msg(text) {
  $("msg").textContent = text;
}

function singular(w) {
  if (w.length <= 3) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("oes")) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).map(singular).join(" ");
}

function groupOf(name) {
  const n = " " + norm(name) + " ";
  for (const [group, words] of Object.entries(FOOD_GROUPS)) {
    if (words.some((w) => n.includes(" " + norm(w) + " "))) return group;
  }
  return "other";
}

function valueOf(item) {
  const est = ESTIMATES[groupOf(item.name)];
  return { lb: est.lb, price: item.price ?? est.price };
}

function daysLeft(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(date + "T00:00:00") - today) / 86400000);
}

function status(item) {
  const d = daysLeft(item.expiry);
  if (d < 0) return "expired";
  if (d <= 1) return "now";
  if (d <= 3) return "soon";
  return "fresh";
}

function expiryText(item) {
  const d = daysLeft(item.expiry);
  if (d < 0) return "EXPIRED";
  if (d === 0) return "expires today!";
  if (d === 1) return "expires tomorrow";
  return d + " days left";
}

function render() {
  items.sort((a, b) => daysLeft(a.expiry) - daysLeft(b.expiry));

  $("list").innerHTML = items.map((item) => `
    <li>
      <b>${esc(item.name)}</b> - <span class="${status(item)}">${expiryText(item)}</span>
      <button class="used" onclick="useItem('${item.id}')">Used</button>
      <button onclick="donateItem('${item.id}')">Donate</button>
      <button onclick="tossItem('${item.id}')">Toss</button>
    </li>`).join("");
  $("empty").hidden = items.length > 0;

  $("chips").innerHTML = items.map((item) =>
    `<label><input type="checkbox" value="${item.id}" ${unchecked.has(item.id) ? "" : "checked"}> ${esc(item.name)}</label>`).join("");

  $("stat-items").textContent = stats.items;
  $("stat-money").textContent = money(stats.money);
  $("stat-weight").textContent = stats.lb.toFixed(1) + " lb";
}

function rescue(id) {
  const item = items.find((it) => it.id === id);
  const v = valueOf(item);
  items = items.filter((it) => it !== item);
  stats.items++;
  stats.lb += v.lb;
  stats.money += v.price;
  return v;
}

function useItem(id) {
  const name = items.find((it) => it.id === id).name;
  const v = rescue(id);
  save(); render();
  msg(`Nice! You used the ${name} and saved about ${money(v.price)}.`);
}

function donateItem(id) {
  const item = items.find((it) => it.id === id);
  if (status(item) === "expired") return alert("Food banks can't take expired food. Toss it or compost it.");
  if (!confirm(`Did you donate the ${item.name}? (Links to find a food bank are at the bottom.)`)) return;
  rescue(id);
  save(); render();
  msg(`Thanks for donating the ${item.name}!`);
}

function tossItem(id) {
  items = items.filter((it) => it.id !== id);
  save(); render();
}

$("add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const price = parseFloat($("price").value);
  items.push({
    id: Date.now().toString(36),
    name: $("name").value.trim(),
    expiry: $("expiry").value,
    price: isNaN(price) ? null : price,
  });
  e.target.reset();
  save(); render();
});

$("chips").addEventListener("change", (e) => {
  if (e.target.checked) unchecked.delete(e.target.value);
  else unchecked.add(e.target.value);
});

async function getJSON(url) {
  const res = await fetch(url);
  return res.json();
}

let mealdbNames = null;

function matchIngredients(name) {
  const n = norm(name);
  const words = n.split(" ");
  const tries = [n, words[words.length - 1]];
  for (const t of tries) {
    const wanted = (ALIASES[t] || [t]).map(norm);
    const hits = mealdbNames.filter((x) => wanted.includes(norm(x)));
    if (hits.length) return hits;
  }
  return [];
}

$("ideas-btn").addEventListener("click", async () => {
  const pantry = items.filter((it) => !unchecked.has(it.id));
  if (!pantry.length) return alert("Add some food first!");
  $("ideas").innerHTML = "<p>Searching...</p>";

  try {
    if (!mealdbNames) {
      const data = await getJSON(`${MEALDB}/list.php?i=list`);
      mealdbNames = data.meals.map((m) => m.strIngredient);
    }

    const tally = {};
    for (const item of pantry) {
      for (const ing of matchIngredients(item.name)) {
        const data = await getJSON(`${MEALDB}/filter.php?i=${encodeURIComponent(ing.replace(/ /g, "_"))}`);
        for (const meal of data.meals || []) {
          tally[meal.idMeal] ??= { meal, used: new Set() };
          tally[meal.idMeal].used.add(item);
        }
      }
    }

    const top = Object.values(tally).sort((a, b) => b.used.size - a.used.size).slice(0, 12);
    if (!top.length) return ($("ideas").innerHTML = "<p>No recipes found :( try different foods.</p>");

    const full = await Promise.all(top.map((r) => getJSON(`${MEALDB}/lookup.php?i=${r.meal.idMeal}`)));

    $("ideas").innerHTML = `<div class="recipes">${top.map((r, i) => {
      const link = full[i].meals?.[0]?.strSource || `https://www.themealdb.com/meal/${r.meal.idMeal}`;
      return `<div class="recipe">
        <img src="${r.meal.strMealThumb}/preview" alt="">
        <b>${esc(r.meal.strMeal)}</b><br>
        <span class="small">uses ${[...r.used].map((it) => esc(it.name)).join(", ")}</span><br>
        <a class="btn" href="${esc(link)}" target="_blank">View recipe</a>
      </div>`;
    }).join("")}</div>`;
  } catch {
    $("ideas").innerHTML = "<p>Couldn't load recipes. Check your internet and try again.</p>";
  }
});

window.addEventListener("scroll", () => {
  $("header").classList.toggle("small-header", window.scrollY > 50);
});

render();
