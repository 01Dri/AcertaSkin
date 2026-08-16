import { saveData, getData } from "./user.js";
import { buildChampionSplashArtImage, loadChampions, loadChampionSkins } from "./champions.js";
import { setupEvents } from "./events.js";
import { GameMode } from "./types.js";
import { createGameModeHandler } from "./gameMode.js";
import { triggerConfetti } from "./confetti.js";

// Constants
const ZOOM_LEVELS = [4.0, 3.8, 3.6, 3.4, 3.2, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0, 1.8, 1.6, 1.4, 1.2, 1.0];

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
let currentMode = userData.currentMode || GameMode.CHAMPION;
let modeHandler = null;

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

function preloadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = url;
    });
}

// TODO: ZOOM SEMPRE SER NA DIRETA E VARIAR ENTRE BAIXO E CIMA
function generateZoomOrigin() {
    const xPercent = Math.floor(Math.random() * 15 + 80);
    const yPercent = Math.floor(Math.random() * 70 + 15);
    return `${xPercent}% ${yPercent}%`;
}

function getExcludedAttempts() {
    const wrongCards = attemptsContainerElement.querySelectorAll(".attempt-card.wrong");
    return Array.from(wrongCards).map(card => card.dataset.guessId || "").filter(Boolean);
}

function updateSplashZoom() {
    if (currentMode === GameMode.SKIN) {
        splashArtImage.style.transform = "scale(1)";
        return;
    }

    const wrongCount = attemptsContainerElement.querySelectorAll(".attempt-card.wrong").length;
    const zoomIndex = Math.min(wrongCount, ZOOM_LEVELS.length - 1);
    splashArtImage.style.transform = `scale(${ZOOM_LEVELS[zoomIndex]})`;
}

function switchMode(newMode) {
    currentMode = newMode;
    userData.currentMode = newMode;
    saveData(userData);

    modeHandler = createGameModeHandler(currentMode, {
        champions,
        championToday,
        getExcludedItems: getExcludedAttempts
    });

    inputChampionIdElement.placeholder = modeHandler.placeholder;
    inputChampionIdElement.value = "";
    clearInputButtonElement?.classList.remove("active");

    updateSplashZoom();
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

    // Desativa os outros botões
    const allButtons = skinOptionsContainerElement.querySelectorAll(".skin-option-btn");
    allButtons.forEach(btn => {
        if (btn !== clickedButton) {
            btn.disabled = true;
        }
    });

    // Celebração de vitória com confetes e áudio
    triggerConfetti();
    try {
        correctAudio.currentTime = 0;
        correctAudio.play();
    } catch (e) {
        console.log(e);
    }

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
    userData.currentMode = GameMode.CHAMPION;
    saveData(userData);

    championToday = await buildChampionToday();
    userData.championToday = championToday;
    saveData(userData);

    await preloadImage(championToday.splashArtUrl);

    // Configura a origem do zoom na direita variando entre cima e baixo
    splashArtImage.style.transformOrigin = championToday.zoomOrigin || "85% 50%";

    // Aplica o zoom inicial instantaneamente sem animação atrás da tela de loading
    splashArtImage.style.transition = "none";
    splashArtImage.style.transform = `scale(${ZOOM_LEVELS[0]})`;
    splashArtImage.src = championToday.splashArtUrl;
    attemptsContainerElement.innerHTML = "";

    // Força reflow e restaura a transição
    void splashArtImage.offsetHeight;
    splashArtImage.style.transition = "";

    switchMode(GameMode.CHAMPION);
    hideLoading();
}

/**
 * TODO
 * Arquiteturar esse metodo e a logica de autocomplete para ser orientado ao modo que o usuário está.
 * Exemplo: se o usuário está no modo de acertar o campeão, a logica desse método vai comparar o champion today id / name. Se for no modo skin
 * a logica do método vai comparar com o champion today skin name.
 * 
 * Mesmo fluxo para o auto complete do usuário.
 */
function confirmChampionToday(validGuess) {
    const rawGuess = inputChampionIdElement.value.trim();
    const guess = validGuess || modeHandler.validateGuess(rawGuess);
    if (!guess) return;

    const isCorrect = modeHandler.isCorrect(guess);
    const displayInfo = modeHandler.getDisplayInfo(guess);
    const modeAtAttempt = currentMode;

    const attemptCard = createAttemptCard(displayInfo, isCorrect, modeAtAttempt, guess);
    attemptsContainerElement.prepend(attemptCard);

    inputChampionIdElement.value = "";
    clearInputButtonElement?.classList.remove("active");

    if (!isCorrect) {
        attemptCard.classList.add("wrong");
        updateSplashZoom();
        return;
    }

    handleCorrectAttempt(modeAtAttempt, attemptCard);
}

function handleCorrectAttempt(modeAtAttempt, attemptCard) {
    attemptCard.classList.add("correct");

    try {
        correctAudio.currentTime = 0;
        correctAudio.play();
    } catch (e) {
        console.log(e);
    }

    if (modeAtAttempt === GameMode.CHAMPION) {
        switchMode(GameMode.SKIN);
        openSkinModal();
    }
}

function createAttemptCard(displayInfo, isCorrect, modeAtAttempt, guess) {
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
    nameSpan.textContent = modeAtAttempt === GameMode.CHAMPION && isCorrect
        ? `✓ ${displayInfo.label} (Campeão correto! Agora descubra a skin)`
        : displayInfo.label;

    infoContainer.appendChild(nameSpan);

    const removeBtn = document.createElement("button");
    removeBtn.classList.add("attempt-remove-btn");
    removeBtn.innerHTML = "&times;";
    removeBtn.title = "Remover tentativa";
    removeBtn.addEventListener("click", () => {
        attemptCard.remove();
        updateSplashZoom();
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
        if (!storedChampion.zoomOrigin) {
            storedChampion.zoomOrigin = generateZoomOrigin();
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

    return {
        id: championObj.id,
        name: championObj.name,
        skinName: championSkinToday.name,
        splashArtNum: championSkinToday.num,
        splashArtUrl: splashImage,
        allSkins: championSkins,
        zoomOrigin: generateZoomOrigin()
    };
}

async function getChampionToday() {
    const usedIds = userData?.champions?.map(x => x.id) ?? [];
    if (usedIds.length === 0) {
        return getRandomItem(champions);
    }

    const available = champions.filter(champ => !usedIds.includes(champ.id) && !usedIds.includes(champ.name));
    if (available.length === 0) {
        return getRandomItem(champions);
    }

    return getRandomItem(available);
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

        // Aplica o ponto de origem do zoom (sempre na direita, variando entre cima e baixo)
        splashArtImage.style.transformOrigin = championToday.zoomOrigin || "85% 50%";

        // Aplica o zoom inicial instantaneamente sem transição visível
        splashArtImage.style.transition = "none";
        splashArtImage.style.transform = currentMode === GameMode.SKIN
            ? "scale(1)"
            : `scale(${ZOOM_LEVELS[0]})`;
        splashArtImage.src = championToday.splashArtUrl;
        void splashArtImage.offsetHeight;
        splashArtImage.style.transition = "";

        userData.championToday = championToday;
        saveData(userData);

        modeHandler = createGameModeHandler(currentMode, {
            champions,
            championToday,
            getExcludedItems: getExcludedAttempts
        });

        setupEvents({
            confirmChampionButtonElement,
            inputChampionIdElement,
            clearInputButtonElement,
            autoCompleteContainerElement,
            getModeHandler: () => modeHandler,
            onConfirm: confirmChampionToday
        });

        updateSplashZoom();

        if (currentMode === GameMode.SKIN) {
            openSkinModal();
        }
    } catch (err) {
        console.error("Erro na inicialização:", err);
    } finally {
        hideLoading();
    }
}

init();
