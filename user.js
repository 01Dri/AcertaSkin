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
