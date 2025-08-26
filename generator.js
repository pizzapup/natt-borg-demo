async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

async function loadRules() {
  const stats = await loadJSON("rules/stats.json");
  const natures = await loadJSON("rules/natures.json");
  const backgrounds = await loadJSON("rules/backgrounds.json");
  const talents = await loadJSON("rules/talents.json");
  return {stats, natures, backgrounds, talents};
}

function rollDice(sides, count = 1) {
  let total = 0;
  for (let i = 0; i < count; i++)
    total += Math.floor(Math.random() * sides) + 1;
  return total;
}

function rollStat() {
  return rollDice(6, 2) - rollDice(4, 2);
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCharacter(rules, locked = {}) {
  // Stats
  const stats = {};
  for (const stat of rules.stats.stats) {
    stats[stat] = locked.stats?.[stat] ?? rollStat();
  }

  // Nature
  const natureKey = locked.nature ?? randomPick(Object.keys(rules.natures));
  const nature = rules.natures[natureKey];

  // Background
  const backgroundKey =
    locked.background ?? randomPick(Object.keys(rules.backgrounds));
  const background = rules.backgrounds[backgroundKey];

  // Apply stat mods from background
  for (const [stat, mod] of Object.entries(background.statMods)) {
    stats[stat] += parseInt(mod);
  }

  // HP
  const hpDice = parseInt(background.hpBonus.split("d")[1]) || 0;
  const hpBonus = hpDice ? rollDice(hpDice) : 0;
  const hp = nature.hp + hpBonus;

  // Shreds of Insight
  const shredsDice = parseInt(background.shreds.split("d")[1]) || 0;
  const shreds = shredsDice ? rollDice(shredsDice) : 0;

  // Format abilities properly
  const abilities = nature.abilities.map((a) => {
    if (typeof a === "string") return {name: a, effect: ""};
    return {name: a.name, effect: a.effect};
  });

  // Talent
  const talent = rules.talents[background.talent]?.effect ?? "";

  return {
    nature: nature.name,
    background: background.name,
    hp,
    stats,
    shreds,
    abilities,
    talent,
  };
}

// -----------------------------
// Setup UI
// -----------------------------
async function setup() {
  const rules = await loadRules();

  const generateBtn = document.getElementById("generate");
  const output = document.getElementById("output");
  const natureSelect = document.getElementById("nature");
  const backgroundSelect = document.getElementById("background");
  const statsLocksDiv = document.getElementById("stats-locks");

  // Dynamically create lockable stat inputs
  for (const stat of rules.stats.stats) {
    const container = document.createElement("div");
    container.innerHTML = `
      <input type="checkbox" id="lock-${stat}" />
      <label for="lock-${stat}">${stat}</label>
      <input type="number" id="val-${stat}" value="0" style="width:50px;" />
    `;
    statsLocksDiv.appendChild(container);
  }

  generateBtn.addEventListener("click", () => {
    // Build locked object
    const locked = {stats: {}};

    // Locked nature
    if (natureSelect.value) locked.nature = natureSelect.value;

    // Locked background
    if (backgroundSelect.value) locked.background = backgroundSelect.value;

    // Locked stats
    for (const stat of rules.stats.stats) {
      const checkbox = document.getElementById(`lock-${stat}`);
      const valInput = document.getElementById(`val-${stat}`);
      if (checkbox.checked) locked.stats[stat] = parseInt(valInput.value);
    }

    const char = generateCharacter(rules, locked);

    output.innerHTML = `
      <h2>${char.background} ${char.nature}</h2>
      <p><strong>HP:</strong> ${char.hp}</p>
      <p><strong>Shreds of Insight:</strong> ${char.shreds}</p>
      <p><strong>Stats:</strong></p>
      <ul>
        ${Object.entries(char.stats)
          .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
          .join("")}
      </ul>
      <p><strong>Abilities:</strong></p>
      <ul>
        ${char.abilities
          .map(
            (a) =>
              `<li><strong>${a.name}</strong>${
                a.effect ? `: ${a.effect}` : ""
              }</li>`
          )
          .join("")}
      </ul>
      <p><strong>Talent:</strong> ${char.talent}</p>
    `;
  });
}

setup();
