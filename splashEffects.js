import { GameMode, AnswerMode } from "./types.js";


export const zoomSplashEffect = {
    name: "zoom",
    zoomLevels: [4.0, 3.8, 3.6, 3.4, 3.2, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0, 1.8, 1.6, 1.4, 1.2, 1.0],

    generateOrigin() {
        const xPercent = Math.floor(Math.random() * 15 + 80);
        const yPercent = Math.floor(Math.random() * 70 + 15);
        return `${xPercent}% ${yPercent}%`;
    },

    generateInitialData() {
        return {
            zoomOrigin: this.generateOrigin()
        };
    },

    init(imageElement, { championToday = null, answerMode = AnswerMode.CHAMPION } = {}) {
        if (!imageElement) return;

        const origin = championToday?.zoomOrigin || this.generateOrigin();
        if (championToday && !championToday.zoomOrigin) {
            championToday.zoomOrigin = origin;
        }

        imageElement.style.transformOrigin = origin;
        imageElement.style.transition = "none";
        imageElement.style.transform = answerMode === AnswerMode.SKIN
            ? "scale(1)"
            : `scale(${this.zoomLevels[0]})`;

        void imageElement.offsetHeight;
        imageElement.style.transition = "";
    },

    update(imageElement, { wrongCount = 0, answerMode = AnswerMode.CHAMPION } = {}) {
        if (!imageElement) return;

        if (answerMode === AnswerMode.SKIN) {
            imageElement.style.transform = "scale(1)";
            return;
        }

        const zoomIndex = Math.min(wrongCount, this.zoomLevels.length - 1);
        imageElement.style.transform = `scale(${this.zoomLevels[zoomIndex]})`;
    },

    cleanup(imageElement) {
        if (!imageElement) return;
        imageElement.style.transform = "";
        imageElement.style.transformOrigin = "";
        imageElement.style.transition = "";
    }
};

export const pixelSplashEffect = {
    name: "pixel",

    generateInitialData() {
        return {};
    },

    init(imageElement, { championToday = null, answerMode = AnswerMode.CHAMPION } = {}) {
        if (!imageElement) return;
    },

    update(imageElement, { wrongCount = 0, answerMode = AnswerMode.CHAMPION } = {}) {
        if (!imageElement) return;
    },

    cleanup(imageElement) {
        if (!imageElement) return;
        imageElement.style.filter = "";
    }
};

// Registro de efeitos por GameMode
const effectsRegistry = {
    [GameMode.DEFAULT]: zoomSplashEffect,
    [GameMode.PIXEL]: pixelSplashEffect
};

/**
 * Obtém o efeito correspondente ao GameMode informado.
 * @param {string} gameMode - Valor do enum GameMode
 * @returns {object} Manipulador de efeito para a splash art
 */
export function getSplashEffect(gameMode = GameMode.DEFAULT) {
    return effectsRegistry[gameMode] || effectsRegistry[GameMode.DEFAULT];
}

/**
 * Registra um novo efeito customizado para um GameMode.
 * @param {string} gameMode 
 * @param {object} effectHandler 
 */
export function registerSplashEffect(gameMode, effectHandler) {
    effectsRegistry[gameMode] = effectHandler;
}
