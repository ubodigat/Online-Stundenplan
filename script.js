const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
const PERIODS = Array.from({ length: 10 }, (_, i) => i + 1);
const KEY = "stundenplan.v1";
const THEME_KEY = "stundenplan.theme";

const EL = {
  schuljahr: null,
  tbody: null,
  save: null,
  export: null,
  import: null,
  file: null,
  reset: null,
  print: null,
  theme: null,
  sjHead: null
};

function buildTable() {
  const tbody = document.getElementById("timetable-body");
  EL.tbody = tbody;
  tbody.innerHTML = "";
  PERIODS.forEach(period => {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.className = "col-meta";
    const label = document.createElement("div");
    label.className = "row-label";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `${period}.`;
    label.appendChild(badge);
    label.appendChild(document.createTextNode(" Stunde"));
    tdLabel.appendChild(label);
    tr.appendChild(tdLabel);

    DAYS.forEach((_, col) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "cell";
      input.placeholder = "Fach • Raum • Lehrkraft";
      input.dataset.row = String(period);
      input.dataset.col = String(col);
      td.appendChild(input);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function dataFromDOM() {
  const schuljahr = EL.schuljahr.value.trim();
  const grid = PERIODS.map(p => DAYS.map((_, d) => {
    const el = document.querySelector(`.cell[data-row="${p}"][data-col="${d}"]`);
    return el ? el.value : "";
  }));
  return { schuljahr, grid };
}

function dataToDOM(data) {
  if (!data) return;
  EL.schuljahr.value = data.schuljahr || "";
  updateSchuljahrHead();
  if (Array.isArray(data.grid)) {
    PERIODS.forEach((p, pi) => {
      DAYS.forEach((_, di) => {
        const el = document.querySelector(`.cell[data-row="${p}"][data-col="${di}"]`);
        if (el) el.value = (data.grid[pi]?.[di] ?? "");
      });
    });
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(dataFromDOM()));
  pulse(EL.save);
}

function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try { dataToDOM(JSON.parse(raw)); } catch {}
}

function resetAll() {
  PERIODS.forEach(p => DAYS.forEach((_, d) => {
    const el = document.querySelector(`.cell[data-row="${p}"][data-col="${d}"]`);
    if (el) el.value = "";
  }));
  EL.schuljahr.value = "";
  updateSchuljahrHead();
  save();
  pulse(EL.reset);
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(dataFromDOM(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stundenplan.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  pulse(EL.export);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(String(e.target.result));
      dataToDOM(data);
      save();
      pulse(EL.import);
    } catch {}
  };
  reader.readAsText(file);
}

function pulse(btn) {
  if (!btn) return;
  btn.style.transform = "scale(0.98)";
  setTimeout(() => (btn.style.transform = ""), 80);
}

function printPlan() {
  window.print();
}

function handleArrows(e) {
  const t = e.target;
  if (!t.classList.contains("cell")) return;
  const r = Number(t.dataset.row);
  const c = Number(t.dataset.col);
  let nr = r, nc = c;

  if (e.key === "ArrowDown") nr = Math.min(PERIODS.length, r + 1);
  else if (e.key === "ArrowUp") nr = Math.max(1, r - 1);
  else if (e.key === "ArrowRight") nc = Math.min(DAYS.length - 1, c + 1);
  else if (e.key === "ArrowLeft") nc = Math.max(0, c - 1);
  else return;

  e.preventDefault();
  const next = document.querySelector(`.cell[data-row="${nr}"][data-col="${nc}"]`);
  if (next) next.focus();
}

let autoSaveTimer = null;
function autoSaveOnInput(e) {
  if (e.target === EL.schuljahr) {
    updateSchuljahrHead();
  }
  if (!(e.target.classList.contains("cell") || e.target === EL.schuljahr)) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(save, 250);
}

function updateSchuljahrHead() {
  const v = EL.schuljahr.value.trim();
  EL.sjHead.textContent = v || "SJ";
}

function setTheme(initial) {
  const stored = localStorage.getItem(THEME_KEY);
  const theme = initial ?? stored ?? "dark";
  document.documentElement.setAttribute("data-theme", theme);
  EL.theme.textContent = theme === "dark" ? "☾" : "☼";
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const next = (document.documentElement.getAttribute("data-theme") === "dark") ? "light" : "dark";
  setTheme(next);
}

window.addEventListener("DOMContentLoaded", () => {
  buildTable();

  EL.schuljahr = document.getElementById("schuljahr");
  EL.save = document.getElementById("btn-save");
  EL.export = document.getElementById("btn-export");
  EL.import = document.getElementById("btn-import");
  EL.file = document.getElementById("file-input");
  EL.reset = document.getElementById("btn-reset");
  EL.print = document.getElementById("btn-print");
  EL.theme = document.getElementById("toggle-theme");
  EL.sjHead = document.getElementById("sj-head");

  setTheme();
  updateSchuljahrHead();

  EL.save.addEventListener("click", save);
  EL.export.addEventListener("click", exportJSON);
  EL.import.addEventListener("click", () => EL.file.click());
  EL.file.addEventListener("change", () => {
    const f = EL.file.files?.[0];
    if (f) importJSON(f);
    EL.file.value = "";
  });
  EL.reset.addEventListener("click", resetAll);
  EL.print.addEventListener("click", printPlan);
  EL.theme.addEventListener("click", toggleTheme);

  document.addEventListener("keydown", handleArrows);
  document.addEventListener("input", autoSaveOnInput);

  load();
});
