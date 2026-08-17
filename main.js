import { saveData, getData } from "./user.js";
import { buildChampionSplashArtImage, loadChampions, loadChampionSkins } from "./champions.js";
import { setupEvents } from "./events.js";
import { AnswerMode, GameMode } from "./types.js";
import { createAwnserModeHandler } from "./awnserMode.js";
import { getSplashEffect } from "./splashEffects.js";
import { triggerConfetti } from "./confetti.js";

// Audio
const correctAudio = typeof Audio !== "undefined" ? new Audio("./assets/acertou.mp3") : null;

// DOM Elements
const splashArtImage = document.getElementById("championSplash");
const splashLoadingElement = document.getElementById("splash-loading");
const confirmChampionButtonElement = document.getElementById("confirm-button");
const inputChampionIdElement = document.getElementById("champion-input");
const clearInputButtonElement = document.getElementById("clear-input-button");
const autoCompleteContainerElement = document.getElementById("auto-complete-champions");
const attemptsContainerElement = document.getElementById("attempts-container");

// Modal Elements
const skinModalElement = document.getElementById("skin-modal");
const skinModalSplashElement = document.getElementById("skin-modal-splash");
const skinModalTitleElement = document.getElementById("skin-modal-title");
const skinOptionsContainerElement = document.getElementById("skin-options-container");

// State
let userData = getData();
let champions = [];
let championToday = null;
let currentGameMode = userData.currentGameMode || GameMode.DEFAULT;
let currentAnswerMode = userData.currentAnswerMode || AnswerMode.CHAMPION;
let answerModeHandler = null;

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
    const effect = getSplashEffect(currentGameMode);
    effect.update(splashArtImage, {
        wrongCount: getWrongAttemptsCount(),
        answerMode: currentAnswerMode,
        championToday
    });
}

function applyInitialSplashEffect() {
    const effect = getSplashEffect(currentGameMode);
    effect.init(splashArtImage, {
        championToday,
        answerMode: currentAnswerMode
    });
}

function switchAnswerMode(newAnswerMode) {
    currentAnswerMode = newAnswerMode;
    userData.currentAnswerMode = newAnswerMode;
    saveData(userData);

    answerModeHandler = createAwnserModeHandler(currentAnswerMode, {
        champions,
        championToday,
        getExcludedItems: getExcludedAttempts
    });

    inputChampionIdElement.placeholder = answerModeHandler.placeholder;
    inputChampionIdElement.value = "";
    clearInputButtonElement?.classList.remove("active");

    updateSplashEffect();
    inputChampionIdElement.focus();
}

function openSkinModal() {
    if (!skinModalElement) return;

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

    // Desativa todos os botões
    const allButtons = skinOptionsContainerElement.querySelectorAll(".skin-option-btn");
    allButtons.forEach(btn => {
        btn.disabled = true;
    });

    // Celebração de vitória com confetes e áudio
    triggerConfetti();
    playCorrectAudio();

    try {
        userData.champions ??= [];
        userData.champions.push({
            id: championToday.id,
            name: championToday.name,
            skinName: championToday.skinName,
            completedAt: new Date().toISOString()
        });
        saveData(userData);
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

    delete userData.championToday;
    userData.currentAnswerMode = AnswerMode.CHAMPION;
    saveData(userData);

    championToday = await buildChampionToday();
    userData.championToday = championToday;
    saveData(userData);

    await preloadImage(championToday.splashArtUrl);

    // Aplica o efeito inicial da splash art conforme o GameMode ativo
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

async function buildChampionToday() {
    const storedChampion = userData?.championToday;
    if (storedChampion) {
        if (!storedChampion.allSkins?.length) {
            storedChampion.allSkins = await loadChampionSkins(storedChampion.id);
            userData.championToday = storedChampion;
            saveData(userData);
        }
        return storedChampion;
    }

    const championObj = await getChampionToday();
    const championSkins = await loadChampionSkins(championObj.id);
    const championSkinToday = championSkins[Math.floor(Math.random() * championSkins.length)];

    const splashImage = buildChampionSplashArtImage(
        championObj.id,
        championSkinToday.num
    );

    const effect = getSplashEffect(currentGameMode);
    const initialEffectData = effect.generateInitialData ? effect.generateInitialData() : {};

    return {
        id: championObj.id,
        name: championObj.name,
        skinName: championSkinToday.name,
        splashArtNum: championSkinToday.num,
        splashArtUrl: splashImage,
        allSkins: championSkins,
        ...initialEffectData
    };
}

async function getChampionToday() {
    const usedIds = userData?.champions?.map(x => x.id) ?? [];
    if (usedIds.length === 0) {
        return getRandomItem(champions);
    }

    const available = champions.filter(champ => !usedIds.includes(champ.id) && !usedIds.includes(champ.name));
    if (available.length === 0) {
        resetUserState();
    }

    return getRandomItem(available);
}

function resetUserState() {
    delete userData.champion;
    saveData(userData);
}

function getRandomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// Inicialização Principal da Aplicação
async function init() {
    try {
        showLoading("Carregando campeão...");

        champions = await loadChampions();
        championToday = await buildChampionToday();

        await preloadImage(championToday.splashArtUrl);

        // Aplica o efeito inicial da splash art com base no GameMode atual
        applyInitialSplashEffect();
        splashArtImage.src = championToday.splashArtUrl;

        userData.championToday = championToday;
        saveData(userData);

        answerModeHandler = createAwnserModeHandler(currentAnswerMode, {
            champions,
            championToday,
            getExcludedItems: getExcludedAttempts
        });

        setupEvents({
            confirmChampionButtonElement,
            inputChampionIdElement,
            clearInputButtonElement,
            autoCompleteContainerElement,
            getAnswerModeHandler: () => answerModeHandler,
            getModeHandler: () => answerModeHandler,
            onConfirm: confirmChampionToday
        });

        updateSplashEffect();

        if (currentAnswerMode === AnswerMode.SKIN) {
            openSkinModal();
        }
    } catch (err) {
        console.error("Erro na inicialização:", err);
    } finally {
        hideLoading();
    }
}

init();
