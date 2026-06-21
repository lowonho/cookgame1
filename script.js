const GAME_SECONDS = 60;
const MAX_MISTAKES = 3;
const COOKING_SECONDS = 3;

const ingredients = [
  { id: "broth", name: "육수", visualClass: "ingredient-broth" },
  { id: "ham", name: "햄", visualClass: "ingredient-ham" },
  { id: "sausage", name: "소시지", visualClass: "ingredient-sausage" },
  { id: "sauce", name: "양념장", visualClass: "ingredient-sauce" },
  { id: "kimchi", name: "김치", visualClass: "ingredient-kimchi" },
  { id: "pork", name: "돼지고기", visualClass: "ingredient-pork" },
  { id: "pollock", name: "동태", visualClass: "ingredient-pollock" },
  { id: "milt", name: "고니", visualClass: "ingredient-milt" },
  { id: "sprouts", name: "콩나물", visualClass: "ingredient-sprouts" }
];

const recipes = {
  budae: {
    name: "부대찌개",
    required: ["broth", "ham", "sausage", "sauce"]
  },
  kimchi: {
    name: "김치찌개",
    required: ["broth", "kimchi", "pork"]
  },
  dongtae: {
    name: "동태찌개",
    required: ["broth", "pollock", "milt", "sprouts"]
  }
};

const modeLabels = {
  cooked: "조리",
  raw: "비조리"
};

const state = {
  isPlaying: false,
  isCooking: false,
  cooked: false,
  timeLeft: GAME_SECONDS,
  score: 0,
  mistakes: 0,
  selectedIngredients: [],
  orders: [],
  timerId: null,
  cookingTimerId: null,
  cookingLeft: 0
};

const elements = {
  timeLeft: document.querySelector("#timeLeft"),
  score: document.querySelector("#score"),
  mistakes: document.querySelector("#mistakes"),
  currentOrder: document.querySelector("#currentOrder"),
  orderQueue: document.querySelector("#orderQueue"),
  ingredients: document.querySelector("#ingredients"),
  potContents: document.querySelector("#potContents"),
  burnerButton: document.querySelector("#burnerButton"),
  burnerText: document.querySelector("#burnerText"),
  steam: document.querySelector("#steam"),
  packButton: document.querySelector("#packButton"),
  startButton: document.querySelector("#startButton"),
  clearPotButton: document.querySelector("#clearPotButton"),
  message: document.querySelector("#message"),
  resultModal: document.querySelector("#resultModal"),
  resultText: document.querySelector("#resultText"),
  restartButton: document.querySelector("#restartButton")
};

function init() {
  renderIngredients();
  bindEvents();
  setControlsEnabled(false);
  updateDisplay();
}

function bindEvents() {
  elements.startButton.addEventListener("click", startGame);
  elements.restartButton.addEventListener("click", startGame);
  elements.clearPotButton.addEventListener("click", clearPot);
  elements.packButton.addEventListener("click", packCurrentOrder);
  elements.burnerButton.addEventListener("click", startCooking);
}

function renderIngredients() {
  elements.ingredients.innerHTML = "";

  ingredients.forEach((ingredient) => {
    const button = document.createElement("button");
    button.className = "ingredient-button";
    button.type = "button";
    button.dataset.ingredientId = ingredient.id;

    const name = document.createElement("span");
    name.className = "ingredient-name";
    name.textContent = ingredient.name;

    button.append(createIngredientVisual(ingredient.id), name);
    button.addEventListener("click", () => addIngredient(ingredient.id, button));
    elements.ingredients.appendChild(button);
  });
}

function startGame() {
  stopTimers();

  state.isPlaying = true;
  state.isCooking = false;
  state.cooked = false;
  state.timeLeft = GAME_SECONDS;
  state.score = 0;
  state.mistakes = 0;
  state.selectedIngredients = [];
  state.orders = createOrders(5);
  state.cookingLeft = 0;

  elements.resultModal.classList.add("hidden");
  setControlsEnabled(true);
  setMessage("첫 주문이 들어왔습니다. 재료를 냄비에 담아주세요.");
  updateDisplay();

  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    updateDisplay();

    if (state.timeLeft <= 0) {
      endGame("시간 종료");
    }
  }, 1000);
}

function createOrders(count) {
  return Array.from({ length: count }, createRandomOrder);
}

function createRandomOrder() {
  const recipeIds = Object.keys(recipes);
  const recipeId = recipeIds[Math.floor(Math.random() * recipeIds.length)];
  const mode = Math.random() < 0.5 ? "cooked" : "raw";

  return {
    recipeId,
    mode,
    id: `${recipeId}-${mode}-${Date.now()}-${Math.random()}`
  };
}

function addIngredient(ingredientId, sourceButton) {
  if (!state.isPlaying || state.isCooking) {
    return;
  }

  if (state.selectedIngredients.includes(ingredientId)) {
    setMessage("이미 냄비에 들어간 재료입니다.", "error");
    return;
  }

  state.selectedIngredients.push(ingredientId);
  state.cooked = false;
  updateDisplay();
  animateIngredientToPot(sourceButton, ingredientId);
  setMessage(`${getIngredientName(ingredientId)}을(를) 냄비에 넣었습니다.`);
}

function clearPot() {
  if (!state.isPlaying || state.isCooking) {
    return;
  }

  resetPot();
  setMessage("냄비를 비웠습니다. 현재 주문에 맞게 다시 담아주세요.");
}

function startCooking() {
  if (!state.isPlaying || state.isCooking) {
    return;
  }

  if (state.selectedIngredients.length === 0) {
    setMessage("먼저 재료를 냄비에 담아주세요.", "error");
    return;
  }

  state.isCooking = true;
  state.cookingLeft = COOKING_SECONDS;
  elements.burnerButton.classList.add("active");
  elements.steam.classList.add("active");
  setControlsEnabled(false, { keepBurnerVisible: true });
  updateBurnerText();
  setMessage("보글보글 끓이는 중입니다. 3초 뒤 포장할 수 있어요.");

  state.cookingTimerId = window.setInterval(() => {
    state.cookingLeft -= 1;
    updateBurnerText();

    if (state.cookingLeft <= 0) {
      finishCooking();
    }
  }, 1000);
}

function finishCooking() {
  window.clearInterval(state.cookingTimerId);
  state.cookingTimerId = null;
  state.isCooking = false;
  state.cooked = true;
  elements.burnerButton.classList.remove("active");
  elements.steam.classList.remove("active");
  setControlsEnabled(true);
  updateBurnerText();
  setMessage("조리가 완료되었습니다. 이제 포장하세요.", "success");
}

function packCurrentOrder() {
  if (!state.isPlaying || state.isCooking) {
    return;
  }

  const order = state.orders[0];

  if (!order) {
    return;
  }

  const result = checkOrder(order);

  if (result.ok) {
    state.score += 1;
    state.orders.shift();
    state.orders.push(createRandomOrder());
    resetPot();
    setMessage("정확하게 포장했습니다. 다음 주문으로 이동합니다!", "success");
  } else {
    state.mistakes += 1;
    resetPot();
    setMessage(result.reason, "error");

    if (state.mistakes >= MAX_MISTAKES) {
      updateDisplay();
      endGame("실패 3회");
      return;
    }
  }

  updateDisplay();
}

function checkOrder(order) {
  const recipe = recipes[order.recipeId];
  const hasCorrectIngredients = sameIngredients(state.selectedIngredients, recipe.required);

  if (!hasCorrectIngredients) {
    return {
      ok: false,
      reason: "레시피가 맞지 않습니다. 재료를 다시 확인하세요."
    };
  }

  if (order.mode === "cooked" && !state.cooked) {
    return {
      ok: false,
      reason: "조리 주문입니다. 가스버너로 3초 끓인 뒤 포장해야 합니다."
    };
  }

  if (order.mode === "raw" && state.cooked) {
    return {
      ok: false,
      reason: "비조리 주문입니다. 끓이지 않고 포장해야 합니다."
    };
  }

  return { ok: true };
}

function sameIngredients(selected, required) {
  if (selected.length !== required.length) {
    return false;
  }

  return required.every((ingredientId) => selected.includes(ingredientId));
}

function resetPot() {
  state.selectedIngredients = [];
  state.cooked = false;
  updateDisplay();
}

function updateDisplay() {
  elements.timeLeft.textContent = state.timeLeft;
  elements.score.textContent = state.score;
  elements.mistakes.textContent = state.mistakes;

  renderCurrentOrder();
  renderOrderQueue();
  renderPotContents();
  syncIngredientButtons();
}

function renderCurrentOrder() {
  const order = state.orders[0];

  if (!state.isPlaying) {
    elements.currentOrder.textContent = "게임 시작을 눌러주세요";
    return;
  }

  elements.currentOrder.textContent = `${recipes[order.recipeId].name} / ${modeLabels[order.mode]}`;
}

function renderOrderQueue() {
  elements.orderQueue.innerHTML = "";

  state.orders.slice(1, 5).forEach((order) => {
    const chip = document.createElement("span");
    chip.className = "order-chip";
    chip.textContent = `${recipes[order.recipeId].name} ${modeLabels[order.mode]}`;
    elements.orderQueue.appendChild(chip);
  });
}

function renderPotContents() {
  if (state.selectedIngredients.length === 0) {
    elements.potContents.textContent = "재료를 클릭해서 넣으세요";
    return;
  }

  elements.potContents.innerHTML = "";

  state.selectedIngredients.forEach((ingredientId) => {
    const tag = document.createElement("span");
    tag.className = "pot-tag";

    const name = document.createElement("span");
    name.textContent = getIngredientName(ingredientId);

    tag.append(createIngredientVisual(ingredientId), name);
    elements.potContents.appendChild(tag);
  });

  if (state.cooked) {
    const cookedTag = document.createElement("span");
    cookedTag.className = "pot-tag";
    cookedTag.textContent = "조리 완료";
    elements.potContents.appendChild(cookedTag);
  }
}

function syncIngredientButtons() {
  document.querySelectorAll(".ingredient-button").forEach((button) => {
    const isSelected = state.selectedIngredients.includes(button.dataset.ingredientId);
    button.classList.toggle("selected", isSelected);
  });
}

function setControlsEnabled(enabled, options = {}) {
  const shouldDisable = !enabled;

  elements.packButton.disabled = shouldDisable;
  elements.clearPotButton.disabled = shouldDisable;
  elements.burnerButton.disabled = shouldDisable && !options.keepBurnerVisible;

  document.querySelectorAll(".ingredient-button").forEach((button) => {
    button.disabled = shouldDisable;
  });
}

function updateBurnerText() {
  if (state.isCooking) {
    elements.burnerText.textContent = `${state.cookingLeft}초 끓이는 중`;
    return;
  }

  elements.burnerText.textContent = state.cooked ? "조리 완료" : "가스버너 켜기";
}

function endGame(reason) {
  stopTimers();
  state.isPlaying = false;
  state.isCooking = false;
  elements.burnerButton.classList.remove("active");
  elements.steam.classList.remove("active");
  setControlsEnabled(false);
  updateBurnerText();
  updateDisplay();

  elements.resultText.textContent = `${reason}! 최종 성공 포장 수는 ${state.score}개입니다.`;
  elements.resultModal.classList.remove("hidden");
}

function stopTimers() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
  }

  if (state.cookingTimerId) {
    window.clearInterval(state.cookingTimerId);
  }

  state.timerId = null;
  state.cookingTimerId = null;
}

function setMessage(text, type = "") {
  elements.message.textContent = text;
  elements.message.className = "message";

  if (type) {
    elements.message.classList.add(type);
  }
}

function getIngredientName(ingredientId) {
  const ingredient = ingredients.find((item) => item.id === ingredientId);
  return ingredient ? ingredient.name : ingredientId;
}

function createIngredientVisual(ingredientId) {
  const ingredient = ingredients.find((item) => item.id === ingredientId);
  const visual = document.createElement("span");
  visual.className = `ingredient-visual ${ingredient ? ingredient.visualClass : ""}`;
  visual.setAttribute("aria-hidden", "true");
  return visual;
}

function animateIngredientToPot(sourceButton, ingredientId) {
  if (!sourceButton || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const sourceVisual = sourceButton.querySelector(".ingredient-visual");

  if (!sourceVisual) {
    return;
  }

  const start = sourceVisual.getBoundingClientRect();
  const target = elements.potContents.getBoundingClientRect();
  const flyer = document.createElement("span");
  flyer.className = "flying-ingredient";
  flyer.appendChild(createIngredientVisual(ingredientId));
  flyer.style.left = `${start.left}px`;
  flyer.style.top = `${start.top}px`;
  document.body.appendChild(flyer);

  const targetX = target.left + target.width / 2 - start.left - start.width / 2;
  const targetY = target.top + target.height / 2 - start.top - start.height / 2;

  const animation = flyer.animate(
    [
      {
        transform: "translate(0, 0) scale(1)",
        opacity: 1
      },
      {
        transform: `translate(${targetX * 0.55}px, ${targetY - 90}px) scale(1.15) rotate(-12deg)`,
        opacity: 1,
        offset: 0.58
      },
      {
        transform: `translate(${targetX}px, ${targetY}px) scale(0.56) rotate(18deg)`,
        opacity: 0.35
      }
    ],
    {
      duration: 580,
      easing: "cubic-bezier(0.22, 0.78, 0.28, 1)"
    }
  );

  animation.addEventListener("finish", () => {
    flyer.remove();
  });
}

init();
