const GAME_SECONDS = 60;
const MAX_LIVES = 3;
const RANKING_STORAGE_KEY = "jjigae-packing-defense-rankings";
const MAX_RANKINGS = 10;

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
  lives: MAX_LIVES,
  selectedIngredients: [],
  pendingIngredients: [],
  orders: [],
  timerId: null,
  cookingTimerId: null,
  cookingLeft: 0,
  scoreSaved: false,
  bgmEnabled: false,
  bgmVolume: 0.32,
  audioContext: null,
  bgmGain: null,
  sfxGain: null,
  bgmTimerId: null,
  bgmStep: 0
};

const elements = {
  timeLeft: document.querySelector("#timeLeft"),
  score: document.querySelector("#score"),
  lives: document.querySelector("#lives"),
  currentOrder: document.querySelector("#currentOrder"),
  orderQueue: document.querySelector("#orderQueue"),
  ingredients: document.querySelector("#ingredients"),
  potContents: document.querySelector("#potContents"),
  cookwareStage: document.querySelector(".cookware-stage"),
  burnerButton: document.querySelector("#burnerButton"),
  burnerText: document.querySelector("#burnerText"),
  cookedBadge: document.querySelector("#cookedBadge"),
  steam: document.querySelector("#steam"),
  packButton: document.querySelector("#packButton"),
  startButton: document.querySelector("#startButton"),
  rankingButton: document.querySelector("#rankingButton"),
  bgmToggleButton: document.querySelector("#bgmToggleButton"),
  bgmVolume: document.querySelector("#bgmVolume"),
  bgmSound: document.querySelector("#bgmSound"),
  gasSound: document.querySelector("#gasSound"),
  clearPotButton: document.querySelector("#clearPotButton"),
  recipePanel: document.querySelector(".recipe-panel"),
  recipeToggleButton: document.querySelector("#recipeToggleButton"),
  message: document.querySelector("#message"),
  resultModal: document.querySelector("#resultModal"),
  resultText: document.querySelector("#resultText"),
  nicknameInput: document.querySelector("#nicknameInput"),
  saveRankingButton: document.querySelector("#saveRankingButton"),
  rankingSaveMessage: document.querySelector("#rankingSaveMessage"),
  closeResultButton: document.querySelector("#closeResultButton"),
  rankingModal: document.querySelector("#rankingModal"),
  rankingList: document.querySelector("#rankingList"),
  emptyRanking: document.querySelector("#emptyRanking"),
  closeRankingButton: document.querySelector("#closeRankingButton")
};

function init() {
  renderIngredients();
  bindEvents();
  setControlsEnabled(false);
  updateDisplay();
}

function bindEvents() {
  bindPress(elements.startButton, startGame);
  bindPress(elements.closeResultButton, closeResultModal);
  bindPress(elements.rankingButton, openRankingModal);
  bindPress(elements.bgmToggleButton, toggleBgm);
  elements.bgmVolume.addEventListener("input", updateBgmVolume);
  bindPress(elements.closeRankingButton, closeRankingModal);
  bindPress(elements.saveRankingButton, saveCurrentRanking);
  bindPress(elements.clearPotButton, clearPot);
  bindPress(elements.recipeToggleButton, toggleRecipePanel);
  bindPress(elements.packButton, packCurrentOrder);
  bindPress(elements.burnerButton, startCooking);
}

function bindPress(element, handler) {
  element.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    playButtonSoundForButton(element);
    handler(event);
  });

  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    playButtonSoundForButton(element);
    handler(event);
  });
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
    bindPress(button, () => addIngredient(ingredient.id, button));
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
  state.lives = MAX_LIVES;
  state.selectedIngredients = [];
  state.pendingIngredients = [];
  state.orders = createOrders(5);
  state.cookingLeft = 0;
  state.scoreSaved = false;
  state.bgmEnabled = true;

  elements.resultModal.classList.add("hidden");
  elements.rankingModal.classList.add("hidden");
  elements.rankingSaveMessage.textContent = "";
  elements.nicknameInput.value = "";
  elements.saveRankingButton.disabled = false;
  elements.bgmToggleButton.textContent = "BGM ON";
  elements.bgmToggleButton.setAttribute("aria-pressed", "true");
  setControlsEnabled(true);
  setMessage("재료를 담고 포장합니다, 조리 주문은 버너로 끓인 뒤 포장하세요.");
  updateDisplay();
  startBgm();

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

async function addIngredient(ingredientId, sourceButton) {
  if (!state.isPlaying || state.isCooking) {
    return;
  }

  if (state.selectedIngredients.includes(ingredientId) || state.pendingIngredients.includes(ingredientId)) {
    setMessage("이미 냄비에 들어간 재료입니다.", "error");
    return;
  }

  state.pendingIngredients.push(ingredientId);
  state.cooked = false;
  updateDisplay();
  setMessage(`${getIngredientName(ingredientId)}이(가) 냄비로 날아가는 중입니다.`);

  await animateIngredientToPot(sourceButton, ingredientId);

  state.pendingIngredients = state.pendingIngredients.filter((id) => id !== ingredientId);

  if (!state.isPlaying) {
    updateDisplay();
    return;
  }

  state.selectedIngredients.push(ingredientId);
  triggerPotReceive();
  updateDisplay();
  setMessage(`${getIngredientName(ingredientId)}이(가) 냄비에 담겼습니다.`);
}

function clearPot() {
  if (!state.isPlaying || state.isCooking) {
    return;
  }

  if (hasPendingIngredients()) {
    setMessage("재료가 냄비에 들어가는 중입니다. 잠시만 기다려주세요.", "error");
    return;
  }

  resetPot();
  setMessage("냄비를 비웠습니다. 주문표에 맞게 다시 담아주세요.");
}

function startCooking() {
  if (!state.isPlaying || state.isCooking) {
    return;
  }

  if (hasPendingIngredients()) {
    setMessage("재료가 냄비에 들어가는 중입니다. 잠시만 기다려주세요.", "error");
    return;
  }

  if (state.selectedIngredients.length === 0) {
    setMessage("먼저 재료를 냄비에 담아주세요.", "error");
    return;
  }

  if (state.cooked) {
    setMessage("이미 조리가 완료되었습니다. 이제 포장하세요.", "success");
    return;
  }

  playGasSound();
  state.cooked = true;
  state.cookingLeft = 0;
  elements.burnerButton.classList.add("active");
  elements.cookwareStage.classList.add("cooking");
  elements.steam.classList.add("active");
  updateBurnerText();
  setMessage("조리가 완료되었습니다. 이제 포장하세요.", "success");

  window.clearTimeout(state.cookingTimerId);
  state.cookingTimerId = window.setTimeout(() => {
    elements.burnerButton.classList.remove("active");
    elements.cookwareStage.classList.remove("cooking");
    elements.steam.classList.remove("active");
    state.cookingTimerId = null;
  }, 450);
}

function finishCooking() {
  window.clearTimeout(state.cookingTimerId);
  state.cookingTimerId = null;
  state.isCooking = false;
  state.cooked = true;
  elements.burnerButton.classList.remove("active");
  elements.cookwareStage.classList.remove("cooking");
  elements.steam.classList.remove("active");
  setControlsEnabled(true);
  updateBurnerText();
  setMessage("조리가 완료되었습니다. 이제 포장하세요.", "success");
}

function packCurrentOrder() {
  if (!state.isPlaying || state.isCooking) {
    return;
  }

  if (hasPendingIngredients()) {
    setMessage("재료가 냄비에 완전히 담긴 뒤 포장하세요.", "error");
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
    state.lives -= 1;
    resetPot();
    setMessage(result.reason, "error");

    if (state.lives <= 0) {
      updateDisplay();
      endGame("목숨 소진");
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
      reason: "조리 주문입니다. 가스버너로 끓인 뒤 포장해야 합니다."
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
  state.pendingIngredients = [];
  state.cooked = false;
  updateDisplay();
}

function updateDisplay() {
  elements.timeLeft.textContent = state.timeLeft;
  elements.score.textContent = state.score;
  elements.lives.textContent = state.lives;

  renderCurrentOrder();
  renderOrderQueue();
  renderPotContents();
  syncIngredientButtons();
  updateBurnerText();
  updateStartButtonVisibility();
}

function renderCurrentOrder() {
  const order = state.orders[0];

  if (!state.isPlaying) {
    renderWaitingOrder();
    return;
  }

  elements.currentOrder.innerHTML = "";
  elements.currentOrder.appendChild(createOrderLabel(order));
}

function renderWaitingOrder() {
  elements.currentOrder.innerHTML = "";

  const wrapper = document.createElement("span");
  wrapper.className = "waiting-order";

  const firstLine = document.createElement("span");
  firstLine.textContent = "게임 시작을";

  const secondLine = document.createElement("span");
  secondLine.textContent = "눌러주세요";

  wrapper.append(firstLine, secondLine);
  elements.currentOrder.appendChild(wrapper);
}

function renderOrderQueue() {
  elements.orderQueue.innerHTML = "";

  state.orders.slice(1, 4).forEach((order) => {
    const chip = document.createElement("span");
    chip.className = "order-chip";
    chip.appendChild(createOrderLabel(order));
    elements.orderQueue.appendChild(chip);
  });
}

function createOrderLabel(order) {
  const wrapper = document.createElement("span");
  wrapper.className = "order-label";

  const food = document.createElement("span");
  food.className = "order-food";
  food.textContent = recipes[order.recipeId].name;

  const mode = document.createElement("span");
  mode.className = `order-mode order-mode-${order.mode}`;
  mode.textContent = modeLabels[order.mode];

  wrapper.append(food, mode);
  return wrapper;
}

function renderPotContents() {
  elements.potContents.innerHTML = "";

  if (state.selectedIngredients.length === 0) {
    const hint = document.createElement("span");
    hint.className = "pot-empty-message";
    hint.textContent = "재료를 넣으세요";
    elements.potContents.appendChild(hint);
    return;
  }

  state.selectedIngredients.forEach((ingredientId) => {
    const item = document.createElement("span");
    item.className = "pot-ingredient";
    item.title = getIngredientName(ingredientId);
    item.setAttribute("aria-label", getIngredientName(ingredientId));

    const name = document.createElement("span");
    name.className = "pot-ingredient-name";
    name.textContent = getIngredientName(ingredientId);

    item.appendChild(createIngredientVisual(ingredientId));
    item.appendChild(name);
    elements.potContents.appendChild(item);
  });
}

function syncIngredientButtons() {
  document.querySelectorAll(".ingredient-button").forEach((button) => {
    const isSelected =
      state.selectedIngredients.includes(button.dataset.ingredientId) ||
      state.pendingIngredients.includes(button.dataset.ingredientId);
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
  elements.burnerButton.classList.toggle("cooked", state.isPlaying && state.cooked);
  elements.cookedBadge.classList.toggle("hidden", !state.isPlaying || !state.cooked);

  if (state.isCooking) {
    elements.burnerText.textContent = `${state.cookingLeft}초 끓이는 중`;
    return;
  }

  elements.burnerText.textContent = "가스버너 켜기";
}

function endGame(reason) {
  stopTimers();
  state.isPlaying = false;
  state.isCooking = false;
  state.pendingIngredients = [];
  elements.burnerButton.classList.remove("active");
  elements.cookwareStage.classList.remove("cooking");
  elements.steam.classList.remove("active");
  setControlsEnabled(false);
  updateBurnerText();
  updateDisplay();
  disableBgm();
  playEndGameSound(reason);

  elements.resultText.textContent = `${reason}! 최종 성공 포장 수는 ${state.score}개입니다.`;
  elements.rankingSaveMessage.textContent = "닉네임을 입력하고 기록을 저장할 수 있습니다.";
  elements.nicknameInput.value = "";
  elements.saveRankingButton.disabled = false;
  elements.resultModal.classList.remove("hidden");
}

function saveCurrentRanking() {
  if (state.scoreSaved) {
    elements.rankingSaveMessage.textContent = "이미 저장된 기록입니다.";
    return;
  }

  const nickname = elements.nicknameInput.value.trim();

  if (!nickname) {
    elements.rankingSaveMessage.textContent = "닉네임을 입력해주세요.";
    elements.nicknameInput.focus();
    return;
  }

  const rankings = getRankings();
  rankings.push({
    nickname,
    score: state.score,
    date: new Date().toLocaleDateString("ko-KR")
  });

  saveRankings(rankings);
  state.scoreSaved = true;
  elements.saveRankingButton.disabled = true;
  elements.rankingSaveMessage.textContent = "기록이 저장되었습니다. 랭킹 조회 버튼에서 확인하세요.";
}

function openRankingModal() {
  renderRankings();
  elements.rankingModal.classList.remove("hidden");
}

function closeRankingModal() {
  elements.rankingModal.classList.add("hidden");
}

function closeResultModal() {
  elements.resultModal.classList.add("hidden");
  updateStartButtonVisibility();
}

function toggleBgm() {
  state.bgmEnabled = !state.bgmEnabled;
  elements.bgmToggleButton.textContent = state.bgmEnabled ? "BGM ON" : "BGM OFF";
  elements.bgmToggleButton.setAttribute("aria-pressed", String(state.bgmEnabled));

  if (state.bgmEnabled) {
    startBgm();
    return;
  }

  stopBgm();
}

function disableBgm() {
  state.bgmEnabled = false;
  elements.bgmToggleButton.textContent = "BGM OFF";
  elements.bgmToggleButton.setAttribute("aria-pressed", "false");
  stopBgm();
}

function updateBgmVolume() {
  state.bgmVolume = Number(elements.bgmVolume.value) / 100;

  if (elements.bgmSound) {
    elements.bgmSound.volume = state.bgmVolume;
  }

  if (state.bgmGain) {
    state.bgmGain.gain.setTargetAtTime(state.bgmVolume, state.audioContext.currentTime, 0.03);
  }
}

function setupAudio() {
  if (state.audioContext) {
    if (state.audioContext.state === "suspended") {
      state.audioContext.resume();
    }
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return;
  }

  state.audioContext = new AudioContext();
  state.bgmGain = state.audioContext.createGain();
  state.sfxGain = state.audioContext.createGain();
  state.bgmGain.gain.value = state.bgmVolume;
  state.sfxGain.gain.value = 0.25;
  state.bgmGain.connect(state.audioContext.destination);
  state.sfxGain.connect(state.audioContext.destination);
}

function startBgm() {
  const sound = elements.bgmSound;

  if (sound) {
    sound.loop = true;
    sound.volume = state.bgmVolume;

    const playPromise = sound.play();

    if (!playPromise || typeof playPromise.catch !== "function") {
      return;
    }

    playPromise
      .then(() => {
        if (!state.bgmEnabled) {
          return;
        }

        stopGeneratedBgm();
      })
      .catch(() => {
        if (state.bgmEnabled) {
          startGeneratedBgm();
        }
      });

    return;
  }

  startGeneratedBgm();
}

function startGeneratedBgm() {
  if (!state.bgmEnabled) {
    return;
  }

  setupAudio();

  if (!state.audioContext || state.bgmTimerId) {
    return;
  }

  playBgmStep();
  state.bgmTimerId = window.setInterval(playBgmStep, 360);
}

function stopBgm() {
  if (elements.bgmSound) {
    elements.bgmSound.pause();
  }

  stopGeneratedBgm();
}

function stopGeneratedBgm() {
  if (state.bgmTimerId) {
    window.clearInterval(state.bgmTimerId);
  }

  state.bgmTimerId = null;
}

function playBgmStep() {
  if (!state.audioContext || !state.bgmGain || !state.bgmEnabled) {
    return;
  }

  const melody = [392, 494, 587, 494, 440, 523, 659, 523];
  const frequency = melody[state.bgmStep % melody.length];
  state.bgmStep += 1;
  playTone(frequency, 0.16, state.bgmGain, "triangle", 0.08);
}

function playButtonSoundForButton(button) {
  if (!button || button.disabled) {
    return;
  }

  setupAudio();

  if (!state.audioContext || !state.sfxGain) {
    return;
  }

  if (button === elements.packButton) {
    playPlasticCrinkleSound();
    return;
  }

  if (button === elements.burnerButton) {
    return;
  }

  playTone(740, 0.045, state.sfxGain, "square", 0.08);
  window.setTimeout(() => playTone(980, 0.04, state.sfxGain, "sine", 0.06), 35);
}

function playGasSound() {
  const sound = elements.gasSound;

  if (!sound) {
    playCookingSound();
    return;
  }

  sound.pause();
  sound.currentTime = 0;
  sound.volume = 0.42;

  const playPromise = sound.play();

  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      setupAudio();
      playCookingSound();
    });
  }
}

function playCookingSound() {
  if (!state.audioContext || !state.sfxGain) {
    return;
  }

  playNoiseBurst(0.045, 0.14, 1800);
  playTone(180, 0.09, state.sfxGain, "sawtooth", 0.07);

  const bubbleBursts = [
    { delay: 80, duration: 0.035, volume: 0.06, frequency: 420 },
    { delay: 145, duration: 0.03, volume: 0.05, frequency: 520 },
    { delay: 220, duration: 0.04, volume: 0.055, frequency: 360 }
  ];

  bubbleBursts.forEach((burst) => {
    window.setTimeout(() => {
      playNoiseBurst(burst.duration, burst.volume, burst.frequency);
    }, burst.delay);
  });
}

function playPlasticCrinkleSound() {
  if (!state.audioContext || !state.sfxGain) {
    return;
  }

  const bursts = [
    { delay: 0, duration: 0.035, volume: 0.25, frequency: 2600 },
    { delay: 28, duration: 0.026, volume: 0.2, frequency: 4200 },
    { delay: 58, duration: 0.03, volume: 0.22, frequency: 3300 },
    { delay: 96, duration: 0.022, volume: 0.17, frequency: 5200 }
  ];

  bursts.forEach((burst) => {
    window.setTimeout(() => {
      playNoiseBurst(burst.duration, burst.volume, burst.frequency);
    }, burst.delay);
  });
}

function playEndGameSound(reason) {
  setupAudio();

  if (!state.audioContext || !state.sfxGain) {
    return;
  }

  if (reason === "목숨 소진") {
    playLifeDepletedSound();
    return;
  }

  if (reason === "시간 종료") {
    playTimeUpSound();
  }
}

function playLifeDepletedSound() {
  playTone(220, 0.18, state.sfxGain, "sawtooth", 0.12);
  window.setTimeout(() => playTone(165, 0.2, state.sfxGain, "sawtooth", 0.11), 150);
  window.setTimeout(() => playTone(110, 0.28, state.sfxGain, "triangle", 0.1), 320);
}

function playTimeUpSound() {
  playTone(880, 0.12, state.sfxGain, "square", 0.18);
  window.setTimeout(() => playTone(880, 0.12, state.sfxGain, "square", 0.18), 180);
  window.setTimeout(() => playTone(660, 0.24, state.sfxGain, "triangle", 0.2), 380);
}

function playNoiseBurst(duration, volume, filterFrequency) {
  const context = state.audioContext;

  if (!context || !state.sfxGain) {
    return;
  }

  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    data[index] = (Math.random() * 2 - 1) * (1 - progress);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const now = context.currentTime;

  filter.type = "highpass";
  filter.frequency.setValueAtTime(filterFrequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(state.sfxGain);
  source.start(now);
  source.stop(now + duration + 0.02);
}

function playTone(frequency, duration, outputGain, type = "sine", volume = 0.1) {
  const context = state.audioContext;

  if (!context || !outputGain) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(outputGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function renderRankings() {
  const rankings = getRankings();
  elements.rankingList.innerHTML = "";
  elements.emptyRanking.classList.toggle("hidden", rankings.length > 0);

  rankings.forEach((record, index) => {
    const item = document.createElement("li");

    const rank = document.createElement("span");
    rank.className = "ranking-rank";
    rank.textContent = `${index + 1}등`;

    const name = document.createElement("span");
    name.className = "ranking-name";
    name.textContent = `${record.nickname} (${record.date})`;

    const score = document.createElement("span");
    score.className = "ranking-score";
    score.textContent = `${record.score}개`;

    item.append(rank, name, score);
    elements.rankingList.appendChild(item);
  });
}

function getRankings() {
  try {
    const saved = JSON.parse(localStorage.getItem(RANKING_STORAGE_KEY)) || [];
    return saved
      .filter((record) => typeof record.nickname === "string" && Number.isFinite(record.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RANKINGS);
  } catch (error) {
    return [];
  }
}

function saveRankings(rankings) {
  const topRankings = rankings
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RANKINGS);

  localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(topRankings));
}

function stopTimers() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
  }

  if (state.cookingTimerId) {
    window.clearTimeout(state.cookingTimerId);
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
    return Promise.resolve();
  }

  const sourceVisual = sourceButton.querySelector(".ingredient-visual");

  if (!sourceVisual) {
    return Promise.resolve();
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

  return new Promise((resolve) => {
    const animation = flyer.animate(
      [
        {
          transform: "translate(0, 0) scale(1)",
          opacity: 1
        },
        {
          transform: `translate(${targetX * 0.45}px, ${targetY - 110}px) scale(1.2) rotate(-16deg)`,
          opacity: 1,
          offset: 0.48
        },
        {
          transform: `translate(${targetX}px, ${targetY}px) scale(0.42) rotate(22deg)`,
          opacity: 0.15
        }
      ],
      {
        duration: 720,
        easing: "cubic-bezier(0.2, 0.82, 0.22, 1)"
      }
    );

    const finish = () => {
      flyer.remove();
      resolve();
    };

    animation.addEventListener("finish", finish, { once: true });
    animation.addEventListener("cancel", finish, { once: true });
  });
}

function triggerPotReceive() {
  elements.potContents.classList.remove("receiving");
  void elements.potContents.offsetWidth;
  elements.potContents.classList.add("receiving");
}

function hasPendingIngredients() {
  return state.pendingIngredients.length > 0;
}

function toggleRecipePanel() {
  const isCollapsed = elements.recipePanel.classList.toggle("collapsed");
  elements.recipeToggleButton.textContent = isCollapsed ? "펼치기" : "접기";
  elements.recipeToggleButton.setAttribute("aria-expanded", String(!isCollapsed));
}

function updateStartButtonVisibility() {
  elements.startButton.classList.toggle("hidden", state.isPlaying);
}

init();
