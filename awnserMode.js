import { AnswerMode } from "./types.js";
import { buildChampionSpriteImage } from "./champions.js";

export function createAwnserModeHandler(mode, { champions = [], championToday = null, getExcludedItems = () => [] }) {
    switch (mode) {
        case AnswerMode.SKIN: {
            const skins = championToday?.allSkins || [];
            const championDisplayName = championToday?.name || championToday?.id || "";

            const allItems = skins.map(skin => ({
                id: skin.name,
                name: skin.name,
                label: skin.name === "default" ? `${championDisplayName} (Padrão)` : skin.name,
                iconUrl: null,
                rawName: skin.name
            }));

            const getFilteredItems = () => {
                const excluded = getExcludedItems().map(x => x.toLowerCase());
                return allItems.filter(item =>
                    !excluded.includes(item.id.toLowerCase()) &&
                    !excluded.includes(item.rawName.toLowerCase())
                );
            };

            return {
                mode: AnswerMode.SKIN,
                placeholder: "Digite o nome da skin",
                items: allItems,
                getItems: getFilteredItems,
                getTargetValue: () => championToday?.skinName,
                getTargetDisplay: () => {
                    const skinName = championToday?.skinName;
                    return skinName === "default" ? `${championDisplayName} (Padrão)` : skinName;
                },
                validateGuess: (guess) => {
                    if (!guess) return null;
                    const cleanGuess = guess.trim().toLowerCase();
                    const availableItems = getFilteredItems();

                    const match = availableItems.find(item =>
                        item.id.toLowerCase() === cleanGuess ||
                        item.label.toLowerCase() === cleanGuess ||
                        item.rawName.toLowerCase() === cleanGuess
                    );
                    return match ? match.rawName : null;
                },
                isCorrect: (guess) => {
                    if (!guess || !championToday?.skinName) return false;
                    return guess.trim().toLowerCase() === championToday.skinName.trim().toLowerCase();
                },
                getDisplayInfo: (guess) => {
                    const match = allItems.find(item => item.rawName.toLowerCase() === guess.toLowerCase());
                    return {
                        label: match ? match.label : guess,
                        iconUrl: null
                    };
                }
            };
        }

        case AnswerMode.CHAMPION:
        default: {
            const allItems = champions.map(champ => ({
                id: champ.id,
                name: champ.name,
                label: champ.name,
                iconUrl: buildChampionSpriteImage(champ.id)
            }));

            const getFilteredItems = () => {
                const excluded = getExcludedItems().map(x => x.toLowerCase());
                return allItems.filter(item =>
                    !excluded.includes(item.name.toLowerCase()) &&
                    !excluded.includes(item.id.toLowerCase())
                );
            };

            return {
                mode: AnswerMode.CHAMPION,
                placeholder: "Digite o nome do campeão",
                items: allItems,
                getItems: getFilteredItems,
                getTargetValue: () => championToday?.name || championToday?.id,
                getTargetDisplay: () => championToday?.name || championToday?.id,
                validateGuess: (guess) => {
                    if (!guess) return null;
                    const cleanGuess = guess.trim().toLowerCase();
                    const availableItems = getFilteredItems();

                    const match = availableItems.find(item =>
                        item.name.toLowerCase() === cleanGuess ||
                        item.id.toLowerCase() === cleanGuess ||
                        item.label.toLowerCase() === cleanGuess
                    );
                    return match ? match.name : null;
                },
                isCorrect: (guess) => {
                    if (!guess || !championToday) return false;
                    const cleanGuess = guess.trim().toLowerCase();
                    const targetName = (championToday.name || "").trim().toLowerCase();
                    const targetId = (championToday.id || "").trim().toLowerCase();

                    return cleanGuess === targetName || cleanGuess === targetId;
                },
                getDisplayInfo: (guess) => {
                    const cleanGuess = (guess || "").trim().toLowerCase();
                    const match = allItems.find(item =>
                        item.name.toLowerCase() === cleanGuess ||
                        item.id.toLowerCase() === cleanGuess
                    );

                    return {
                        label: match ? match.name : guess,
                        iconUrl: buildChampionSpriteImage(match ? match.id : guess)
                    };
                }
            };
        }
    }
}

export const createAnswerModeHandler = createAwnserModeHandler;
