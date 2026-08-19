import { getUserModeData, saveUserModeData } from "./user.js";
import { buildChampionSplashArtImage, loadChampions, loadChampionSkins } from "./champions.js";
import { setupEvents } from "./events.js";
import { AnswerMode, GameMode } from "./types.js";
import { createAwnserModeHandler } from "./awnserMode.js";
import { getSplashEffect } from "./splashEffects.js";
import { triggerConfetti } from "./confetti.js";

const correctAudio = typeof Audio !== "undefined" ? new Audio("./assets/acertou.mp3") : null;

const modeDefaultBtn = document.getElementById("mode-default-btn");
const modePixelBtn = document.getElementById("mode-pixel-btn");
const gameContainerElement = document.getElementById("game-container");

const splashArtImage = document.getElementById("championSplash");
const splashArtCanvas = document.getElementById("championSplashCanvas");
const splashLoadingElement = document.getElementById("splash-loading");
const confirmChampionButtonElement = document.getElementById("confirm-button");
const inputChampionIdElement = document.getElementById("champion-input");
const clearInputButtonElement = document.getElementById("clear-input-button");
const autoCompleteContainerElement = document.getElementById("auto-complete-champions");
const attemptsContainerElement = document.getElementById("attempts-container");

const skinModalElement = document.getElementById("skin-modal");
const skinModalSplashElement = document.getElementById("skin-modal-splash");
const skinModalTitleElement = document.getElementById("skin-modal-title");
const skinOptionsContainerElement = document.getElementById("skin-options-container");

let champions = [];
let championToday = null;
let currentGameMode = null;
let currentAnswerMode = AnswerMode.CHAMPION;
let answerModeHandler = null;
let eventsInitialized = false;

function showLoading(message = "Carregando campeão...") {
    if (!splashLoadingElement) return;

    const textEl = splashLoadingElement.querySelector(".loading-text");
    if (textEl) {
        textEl.textContent = message;
    }
    splashLoadingElement.classList.remove("hidden");
}

function hideLoading() {
    splashLoadingElement?.classList.add("hidden");
}

function playCorrectAudio() {
    try {
        if (correctAudio) {
            correctAudio.currentTime = 0;
            correctAudio.play().catch(e => console.log("Audio play prevented:", e));
        }
    } catch (e) {
        console.log(e);
    }
}

function preloadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = url;
    });
}

function getExcludedAttempts() {
    const wrongCards = attemptsContainerElement.querySelectorAll(".attempt-card.wrong");
    return Array.from(wrongCards).map(card => card.dataset.guessId || "").filter(Boolean);
}

function getWrongAttemptsCount() {
    return attemptsContainerElement.querySelectorAll(".attempt-card.wrong").length;
}

function updateSplashEffect() {
    if (!currentGameMode) return;
    const effect = getSplashEffect(currentGameMode);
    effect.update(splashArtImage, {
        wrongCount: getWrongAttemptsCount(),
        answerMode: currentAnswerMode,
        championToday,
        canvasElement: splashArtCanvas
    });
}

function applyInitialSplashEffect() {
    if (!currentGameMode) return;
    const effect = getSplashEffect(currentGameMode);
    effect.init(splashArtImage, {
        championToday,
        answerMode: currentAnswerMode,
        canvasElement: splashArtCanvas
    });
}

function switchAnswerMode(newAnswerMode) {
    currentAnswerMode = newAnswerMode;
    const modeData = getUserModeData(currentGameMode);
    modeData.currentAnswerMode = newAnswerMode;
    saveUserModeData(currentGameMode, modeData);

    answerModeHandler = createAwnserModeHandler(currentAnswerMode, {
        champions,
        championToday,
        getExcludedItems: getExcludedAttempts
    });

    if (inputChampionIdElement) {
        inputChampionIdElement.placeholder = answerModeHandler.placeholder;
        inputChampionIdElement.value = "";
    }
    clearInputButtonElement?.classList.remove("active");

    updateSplashEffect();
    inputChampionIdElement?.focus();
}

function openSkinModal() {
    if (!skinModalElement || !championToday) return;

    const champName = championToday?.name || championToday?.id || "Campeão";
    skinModalSplashElement.src = championToday.splashArtUrl;
    skinModalTitleElement.textContent = `Qual é esta skin de ${champName}?`;
    renderSkinModalOptions();

    skinModalElement.classList.remove("hidden");
}

function closeSkinModal() {
    skinModalElement?.classList.add("hidden");
}

function renderSkinModalOptions() {
    skinOptionsContainerElement.innerHTML = "";
    const skins = championToday?.allSkins || [];
    const champName = championToday?.name || championToday?.id || "";

    skins.forEach(skin => {
        const btn = document.createElement("button");
        btn.classList.add("skin-option-btn");
        btn.textContent = skin.name === "default" ? `${champName} (Padrão)` : skin.name;

        btn.addEventListener("click", () => {
            handleSkinSelection(skin, btn);
        });

        skinOptionsContainerElement.appendChild(btn);
    });
}

function handleSkinSelection(skin, clickedButton) {
    const isCorrect = skin.name.toLowerCase() === championToday.skinName.toLowerCase();

    if (!isCorrect) {
        clickedButton.classList.add("wrong");
        clickedButton.disabled = true;
        return;
    }

    clickedButton.classList.add("correct");

    const allButtons = skinOptionsContainerElement.querySelectorAll(".skin-option-btn");
    allButtons.forEach(btn => {
        btn.disabled = true;
    });

    triggerConfetti();
    playCorrectAudio();

    try {
        const modeData = getUserModeData(currentGameMode);
        modeData.champions ??= [];
        modeData.champions.push({
            id: championToday.id,
            name: championToday.name,
            skinName: championToday.skinName,
            completedAt: new Date().toISOString()
        });
        saveUserModeData(currentGameMode, modeData);
    } catch (e) {
        console.log(e);
    }

    setTimeout(async () => {
        closeSkinModal();
        await loadNextChampion();
    }, 2400);
}

async function loadNextChampion() {
    closeSkinModal();
    showLoading("Carregando novo campeão...");

    const modeData = getUserModeData(currentGameMode);
    delete modeData.championToday;
    modeData.currentAnswerMode = AnswerMode.CHAMPION;
    currentAnswerMode = AnswerMode.CHAMPION;
    saveUserModeData(currentGameMode, modeData);

    championToday = await buildChampionToday(currentGameMode);
    modeData.championToday = championToday;
    saveUserModeData(currentGameMode, modeData);

    await preloadImage(championToday.splashArtUrl);

    applyInitialSplashEffect();
    splashArtImage.src = championToday.splashArtUrl;
    attemptsContainerElement.innerHTML = "";

    switchAnswerMode(AnswerMode.CHAMPION);
    hideLoading();
}

function confirmChampionToday(validGuess) {
    const rawGuess = inputChampionIdElement.value.trim();
    const guess = (typeof validGuess === "string" && validGuess.length > 0)
        ? validGuess
        : answerModeHandler.validateGuess(rawGuess);
    if (!guess) return;

    const isCorrect = answerModeHandler.isCorrect(guess);
    const displayInfo = answerModeHandler.getDisplayInfo(guess);
    const answerModeAtAttempt = currentAnswerMode;

    const attemptCard = createAttemptCard(displayInfo, isCorrect, answerModeAtAttempt, guess);
    attemptsContainerElement.prepend(attemptCard);

    inputChampionIdElement.value = "";
    clearInputButtonElement?.classList.remove("active");

    if (!isCorrect) {
        attemptCard.classList.add("wrong");
        updateSplashEffect();
        return;
    }

    handleCorrectAttempt(answerModeAtAttempt, attemptCard);
}

function handleCorrectAttempt(answerModeAtAttempt, attemptCard) {
    attemptCard.classList.add("correct");

    if (answerModeAtAttempt === AnswerMode.CHAMPION) {
        switchAnswerMode(AnswerMode.SKIN);
        openSkinModal();
    }
}

function createAttemptCard(displayInfo, isCorrect, answerModeAtAttempt, guess) {
    const attemptCard = document.createElement("div");
    attemptCard.classList.add("attempt-card");
    attemptCard.dataset.guessId = guess;

    const infoContainer = document.createElement("div");
    infoContainer.classList.add("attempt-info");

    if (displayInfo.iconUrl) {
        const iconImg = document.createElement("img");
        iconImg.classList.add("champion-icon");
        iconImg.src = displayInfo.iconUrl;
        iconImg.alt = displayInfo.label;
        infoContainer.appendChild(iconImg);
    }

    const nameSpan = document.createElement("span");
    nameSpan.textContent = answerModeAtAttempt === AnswerMode.CHAMPION && isCorrect
        ? `✓ ${displayInfo.label} (Campeão correto! Agora descubra a skin)`
        : displayInfo.label;

    infoContainer.appendChild(nameSpan);

    const removeBtn = document.createElement("button");
    removeBtn.classList.add("attempt-remove-btn");
    removeBtn.innerHTML = "&times;";
    removeBtn.title = "Remover tentativa";
    removeBtn.addEventListener("click", () => {
        attemptCard.remove();
        updateSplashEffect();
    });

    attemptCard.appendChild(infoContainer);
    attemptCard.appendChild(removeBtn);

    return attemptCard;
}

async function buildChampionToday(gameMode = currentGameMode) {
    const modeData = getUserModeData(gameMode);
    const storedChampion = modeData?.championToday;
    if (storedChampion) {
        if (!storedChampion.allSkins?.length) {
            storedChampion.allSkins = await loadChampionSkins(storedChampion.id);
            modeData.championToday = storedChampion;
            saveUserModeData(gameMode, modeData);
        }
        return storedChampion;
    }

    const championObj = await getChampionToday(gameMode);
    const championSkins = await loadChampionSkins(championObj.id);
    const championSkinToday = championSkins[Math.floor(Math.random() * championSkins.length)];

    const splashImage = buildChampionSplashArtImage(
        championObj.id,
        championSkinToday.num
    );

    const effect = getSplashEffect(gameMode);
    const initialEffectData = effect.generateInitialData ? effect.generateInitialData() : {};

    const newChampion = {
        id: championObj.id,
        name: championObj.name,
        skinName: championSkinToday.name,
        splashArtNum: championSkinToday.num,
        splashArtUrl: splashImage,
        allSkins: championSkins,
        ...initialEffectData
    };

    modeData.championToday = newChampion;
    saveUserModeData(gameMode, modeData);
    return newChampion;
}

async function getChampionToday(gameMode = currentGameMode) {
    const modeData = getUserModeData(gameMode);
    const usedIds = modeData?.champions?.map(x => x.id) ?? [];
    if (usedIds.length === 0) {
        return getRandomItem(champions);
    }

    const available = champions.filter(champ => !usedIds.includes(champ.id) && !usedIds.includes(champ.name));
    if (available.length === 0) {
        resetModeState(gameMode);
        return getRandomItem(champions);
    }

    return getRandomItem(available);
}

function resetModeState(gameMode = currentGameMode) {
    const modeData = getUserModeData(gameMode);
    modeData.champions = [];
    saveUserModeData(gameMode, modeData);
}

function getRandomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

async function loadGameMode(gameMode) {
    try {
        showLoading("Carregando campeão...");

        if (!champions || champions.length === 0) {
            champions = await loadChampions();
        }

        const modeData = getUserModeData(gameMode);
        currentAnswerMode = modeData.currentAnswerMode || AnswerMode.CHAMPION;

        championToday = await buildChampionToday(gameMode);
        await preloadImage(championToday.splashArtUrl);

        applyInitialSplashEffect();
        splashArtImage.src = championToday.splashArtUrl;

        answerModeHandler = createAwnserModeHandler(currentAnswerMode, {
            champions,
            championToday,
            getExcludedItems: getExcludedAttempts
        });

        if (inputChampionIdElement) {
            inputChampionIdElement.placeholder = answerModeHandler.placeholder;
        }

        updateSplashEffect();

        if (currentAnswerMode === AnswerMode.SKIN) {
            openSkinModal();
        } else {
            closeSkinModal();
        }
    } catch (err) {
        console.error(`Erro ao carregar modo ${gameMode}:`, err);
    } finally {
        hideLoading();
    }
}

async function selectGameMode(selectedMode) {
    if (currentGameMode) {
        const prevEffect = getSplashEffect(currentGameMode);
        prevEffect.cleanup(splashArtImage, splashArtCanvas);
    }

    currentGameMode = selectedMode;

    if (selectedMode === GameMode.DEFAULT) {
        modeDefaultBtn?.classList.add("active");
        modeDefaultBtn?.setAttribute("aria-selected", "true");
        modePixelBtn?.classList.remove("active");
        modePixelBtn?.setAttribute("aria-selected", "false");
    } else if (selectedMode === GameMode.PIXEL) {
        modePixelBtn?.classList.add("active");
        modePixelBtn?.setAttribute("aria-selected", "true");
        modeDefaultBtn?.classList.remove("active");
        modeDefaultBtn?.setAttribute("aria-selected", "false");
    }

    gameContainerElement?.classList.remove("hidden");
    attemptsContainerElement.innerHTML = "";
    await loadGameMode(selectedMode);
}

function setupModeButtons() {
    modeDefaultBtn?.addEventListener("click", () => {
        selectGameMode(GameMode.DEFAULT);
    });

    modePixelBtn?.addEventListener("click", () => {
        selectGameMode(GameMode.PIXEL);
    });
}

async function init() {
    try {
        setupModeButtons();

        loadChampions().then(loadedChampions => {
            champions = loadedChampions;
        }).catch(err => {
            console.error("Erro ao carregar lista de campeões:", err);
        });

        if (!eventsInitialized) {
            setupEvents({
                confirmChampionButtonElement,
                inputChampionIdElement,
                clearInputButtonElement,
                autoCompleteContainerElement,
                getAnswerModeHandler: () => answerModeHandler,
                getModeHandler: () => answerModeHandler,
                onConfirm: confirmChampionToday
            });
            eventsInitialized = true;
        }
    } catch (err) {
        console.error("Erro na inicialização:", err);
    }
}

init();
