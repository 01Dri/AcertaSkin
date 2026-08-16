let activeIndex = -1;

export function setupEvents({
    confirmChampionButtonElement,
    inputChampionIdElement,
    clearInputButtonElement,
    autoCompleteContainerElement,
    getModeHandler,
    onConfirm
}) {
    const getCurrentHandler = () => {
        return typeof getModeHandler === "function" ? getModeHandler() : getModeHandler;
    };

    const handler = getCurrentHandler();
    if (handler?.placeholder) {
        inputChampionIdElement.placeholder = handler.placeholder;
    }

    confirmChampionButtonElement.addEventListener("click", () => {
        const currentHandler = getCurrentHandler();
        const rawValue = inputChampionIdElement.value.trim();
        const validGuess = currentHandler.validateGuess(rawValue);

        toggleClearButton();
        if (!validGuess) return;

        closeAutoComplete(autoCompleteContainerElement);
        onConfirm?.(validGuess);
    });

    clearInputButtonElement?.addEventListener("click", () => {
        inputChampionIdElement.value = "";
        toggleClearButton();
        closeAutoComplete(autoCompleteContainerElement);
        inputChampionIdElement.focus();
    });

    inputChampionIdElement.addEventListener("input", (e) => {
        const currentHandler = getCurrentHandler();
        const value = e.target.value.trim().toLowerCase();

        toggleClearButton();
        const availableItems = typeof currentHandler.getItems === "function" ? currentHandler.getItems() : currentHandler.items;
        renderAutoComplete(value, availableItems, autoCompleteContainerElement, inputChampionIdElement, onConfirm, toggleClearButton);
    });

    inputChampionIdElement.addEventListener("keydown", (e) => {
        const currentHandler = getCurrentHandler();
        const items = autoCompleteContainerElement.querySelectorAll(".autocomplete-item");

        if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateActiveItem(items);
            return;
        }

        if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateActiveItem(items);
            return;
        }

        if (e.key === "Escape") {
            closeAutoComplete(autoCompleteContainerElement);
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();

            const selectedGuess = resolveEnterGuess(items, currentHandler, inputChampionIdElement);
            inputChampionIdElement.value = "";
            toggleClearButton();
            if (!selectedGuess) return;

            closeAutoComplete(autoCompleteContainerElement);
            onConfirm?.(selectedGuess);
        }
    });

    document.addEventListener("click", (e) => {
        const isClickInside = inputChampionIdElement.contains(e.target) || autoCompleteContainerElement.contains(e.target);
        if (isClickInside) return;

        closeAutoComplete(autoCompleteContainerElement);
    });

    function toggleClearButton() {
        if (!clearInputButtonElement) return;

        const hasValue = inputChampionIdElement.value.length > 0;
        clearInputButtonElement.classList.toggle("active", hasValue);
    }
}

function resolveEnterGuess(items, handler, inputElement) {
    if (items.length > 0) {
        const targetIndex = (activeIndex >= 0 && activeIndex < items.length) ? activeIndex : 0;
        const item = items[targetIndex];
        return item.dataset.value || item.dataset.label;
    }

    const rawText = inputElement.value.trim();
    return handler.validateGuess(rawText);
}

function renderAutoComplete(query, items, container, inputElement, onConfirm, toggleClearButton) {
    container.innerHTML = "";
    activeIndex = -1;

    if (!query) {
        container.classList.remove("active");
        return;
    }

    const filtered = items.filter(item =>
        item.label.toLowerCase().includes(query) ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.id && item.id.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        container.classList.remove("active");
        return;
    }

    filtered.forEach(itemData => {
        const item = createAutoCompleteItem(itemData, inputElement, container, onConfirm, toggleClearButton);
        container.appendChild(item);
    });

    container.classList.add("active");
}

function createAutoCompleteItem(itemData, inputElement, container, onConfirm, toggleClearButton) {
    const item = document.createElement("div");
    item.classList.add("autocomplete-item");
    const selectedValue = itemData.name || itemData.label || itemData.id;
    item.dataset.value = selectedValue;
    item.dataset.label = itemData.label;

    if (itemData.iconUrl) {
        const iconImg = document.createElement("img");
        iconImg.classList.add("champion-icon");
        iconImg.src = itemData.iconUrl;
        iconImg.alt = itemData.label;
        item.appendChild(iconImg);
    }

    const nameSpan = document.createElement("span");
    nameSpan.textContent = itemData.label;
    item.appendChild(nameSpan);

    const handleSelection = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectItem(selectedValue, inputElement, container, onConfirm, toggleClearButton);
    };

    item.addEventListener("mousedown", handleSelection);
    item.addEventListener("touchstart", handleSelection, { passive: false });
    item.addEventListener("click", handleSelection);

    return item;
}

function updateActiveItem(items) {
    items.forEach((item, index) => {
        const isSelected = index === activeIndex;
        item.classList.toggle("selected", isSelected);
        if (isSelected) {
            item.scrollIntoView({ block: "nearest" });
        }
    });
}

function selectItem(selectedValue, inputElement, container, onConfirm, toggleClearButton) {
    inputElement.value = "";
    closeAutoComplete(container);
    toggleClearButton?.();
    onConfirm?.(selectedValue);
}

function closeAutoComplete(container) {
    container.innerHTML = "";
    container.classList.remove("active");
    activeIndex = -1;
}
