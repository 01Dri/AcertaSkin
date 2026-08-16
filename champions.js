const latestVersion = await getLatestLolVersion();

const urlChampions = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/pt_BR/champion.json`;
const urlChampionDetails = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/pt_BR/champion`;
const urlSprite = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion`;

export async function loadChampions() {
    const data = await getData(urlChampions);
    const champions = Object.values(data.data || {}).map(x => ({
        id: x.id.replace(/^Jade_/, ""),
        name: x.name
    }));

    const uniqueChampions = [];
    const seenNames = new Set();

    for (const champion of champions) {
        if (!seenNames.has(champion.name)) {
            seenNames.add(champion.name);
            uniqueChampions.push(champion);
        }
    }

    return uniqueChampions;
}

export async function loadChampionSkins(championId) {
    const data = await getData(`${urlChampionDetails}/${championId}.json`);
    const champion = data.data[championId];
    const skinsWithoutParentSkin = champion.skins.filter(x => x.parentSkin === undefined);

    return skinsWithoutParentSkin.map(x => ({
        name: x.name,
        num: x.num
    }));
}

export function buildChampionSplashArtImage(championId, numSplashArt) {
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_${numSplashArt}.jpg`;
}

export function buildChampionSpriteImage(championId) {
    return `${urlSprite}/${championId}.png`;
}

async function getData(url) {
    const response = await fetch(url);
    return await response.json();
}

async function getLatestLolVersion() {
    const versions = await getData("https://ddragon.leagueoflegends.com/api/versions.json");
    return versions[0];
}
