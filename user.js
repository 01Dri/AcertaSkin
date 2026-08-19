export function getUserModeData(mode) {
    if (!mode) {
        return {
            champions: [],
            championToday: null,
            currentAnswerMode: "champion"
        };
    }

    const key = `data_${mode}`;
    const rawData = localStorage.getItem(key);

    if (!rawData) {
        if (mode === "default") {
            const legacy = getLegacyData();
            if (legacy && (legacy.champions?.length || legacy.championToday)) {
                const migrated = {
                    champions: legacy.champions || [],
                    championToday: legacy.championToday || null,
                    currentAnswerMode: legacy.currentAnswerMode || "champion"
                };
                saveUserModeData("default", migrated);
                return migrated;
            }
        }

        return {
            champions: [],
            championToday: null,
            currentAnswerMode: "champion"
        };
    }

    try {
        const parsed = JSON.parse(rawData);
        return {
            champions: parsed.champions || [],
            championToday: parsed.championToday || null,
            currentAnswerMode: parsed.currentAnswerMode || "champion"
        };
    } catch {
        return {
            champions: [],
            championToday: null,
            currentAnswerMode: "champion"
        };
    }
}

export function saveUserModeData(mode, data) {
    if (!mode) return;
    const key = `data_${mode}`;
    localStorage.setItem(key, JSON.stringify(data));
}

export function saveData(data) {
    localStorage.setItem("data", JSON.stringify(data));
}

export function getData() {
    const rawData = localStorage.getItem("data");
    if (!rawData) return {};

    try {
        return JSON.parse(rawData);
    } catch {
        return {};
    }
}

function getLegacyData() {
    const raw = localStorage.getItem("data");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}
