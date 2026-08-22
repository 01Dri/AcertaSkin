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

    init(imageElement, { championToday = null, answerMode = AnswerMode.CHAMPION, canvasElement = null } = {}) {
        if (canvasElement) {
            canvasElement.classList.add("hidden");
        }
        if (!imageElement) return;

        imageElement.classList.remove("hidden");
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

    update(imageElement, { wrongCount = 0, answerMode = AnswerMode.CHAMPION, canvasElement = null } = {}) {
        if (canvasElement) {
            canvasElement.classList.add("hidden");
        }
        if (!imageElement) return;

        imageElement.classList.remove("hidden");

        if (answerMode === AnswerMode.SKIN) {
            imageElement.style.transform = "scale(1)";
            return;
        }

        const zoomIndex = Math.min(wrongCount, this.zoomLevels.length - 1);
        imageElement.style.transform = `scale(${this.zoomLevels[zoomIndex]})`;
    },

    cleanup(imageElement, canvasElement = null) {
        if (canvasElement) {
            canvasElement.classList.add("hidden");
        }
        if (!imageElement) return;
        imageElement.style.transform = "";
        imageElement.style.transformOrigin = "";
        imageElement.style.transition = "";
    }
};

export const pixelSplashEffect = {
    name: "pixel",
    pixelLevels: [30, 42, 58, 80, 110, 160, 240, 400],

    generateInitialData() {
        return {};
    },

    init(imageElement, { championToday = null, answerMode = AnswerMode.CHAMPION, canvasElement = null } = {}) {
        if (!imageElement) return;

        imageElement.style.transform = "scale(1)";
        imageElement.style.transformOrigin = "center center";

        if (canvasElement) {
            imageElement.classList.add("hidden");
            canvasElement.classList.remove("hidden");
            this.renderPixelated(imageElement, canvasElement, { wrongCount: 0, answerMode });
        }
    },

    update(imageElement, { wrongCount = 0, answerMode = AnswerMode.CHAMPION, canvasElement = null } = {}) {
        if (!imageElement) return;

        if (canvasElement) {
            imageElement.classList.add("hidden");
            canvasElement.classList.remove("hidden");
            this.renderPixelated(imageElement, canvasElement, { wrongCount, answerMode });
        }
    },

    renderPixelated(imageElement, canvasElement, { wrongCount = 0, answerMode = AnswerMode.CHAMPION } = {}) {
        if (!imageElement || !canvasElement) return;

        const ctx = canvasElement.getContext("2d");
        const containerSize = 400;
        canvasElement.width = containerSize;
        canvasElement.height = containerSize;

        const draw = () => {
            if (!imageElement.naturalWidth || !imageElement.naturalHeight) return;

            if (answerMode === AnswerMode.SKIN) {
                ctx.imageSmoothingEnabled = true;
                ctx.clearRect(0, 0, containerSize, containerSize);
                drawImageProp(ctx, imageElement, 0, 0, containerSize, containerSize);
                return;
            }

            const levelIndex = Math.min(wrongCount, this.pixelLevels.length - 1);
            const pixelResolution = this.pixelLevels[levelIndex];

            const offscreen = document.createElement("canvas");
            const aspect = imageElement.naturalWidth / imageElement.naturalHeight;
            const smallW = Math.max(4, Math.round(pixelResolution));
            const smallH = Math.max(4, Math.round(pixelResolution / aspect));

            offscreen.width = smallW;
            offscreen.height = smallH;
            const offCtx = offscreen.getContext("2d");
            offCtx.drawImage(imageElement, 0, 0, smallW, smallH);

            ctx.imageSmoothingEnabled = false;
            ctx.mozImageSmoothingEnabled = false;
            ctx.webkitImageSmoothingEnabled = false;
            ctx.msImageSmoothingEnabled = false;

            ctx.clearRect(0, 0, containerSize, containerSize);
            ctx.drawImage(offscreen, 0, 0, smallW, smallH, 0, 0, containerSize, containerSize);
        };

        if (imageElement.complete && imageElement.naturalWidth > 0) {
            draw();
        } else {
            imageElement.onload = draw;
        }
    },

    cleanup(imageElement, canvasElement = null) {
        if (canvasElement) {
            canvasElement.classList.add("hidden");
            const ctx = canvasElement.getContext("2d");
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        }
        if (imageElement) {
            imageElement.classList.remove("hidden");
            imageElement.style.transform = "";
            imageElement.style.transformOrigin = "";
            imageElement.style.transition = "";
        }
    }
};

function drawImageProp(ctx, img, x, y, w, h) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const aspect = nw / nh;
    const targetAspect = w / h;
    let sx, sy, sw, sh;

    if (aspect > targetAspect) {
        sh = nh;
        sw = nh * targetAspect;
        sy = 0;
        sx = (nw - sw) / 2;
    } else {
        sw = nw;
        sh = nw / targetAspect;
        sx = 0;
        sy = (nh - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

const effectsRegistry = {
    [GameMode.DEFAULT]: zoomSplashEffect,
    [GameMode.PIXEL]: pixelSplashEffect
};

export function getSplashEffect(gameMode = GameMode.DEFAULT) {
    return effectsRegistry[gameMode] || effectsRegistry[GameMode.DEFAULT];
}

export function registerSplashEffect(gameMode, effectHandler) {
    effectsRegistry[gameMode] = effectHandler;
}
