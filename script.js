const searchBox = document.getElementById("search-box");
const searchInput = document.getElementById("search-input");

const wordTxt = document.getElementById("word-txt");
const typeTxt = document.getElementById("type-txt");
const phoneticTxt = document.getElementById("phonetic-txt");
const definitionTxt = document.getElementById("definition-txt");

const soundBtn = document.getElementById("sound-btn");
const wordDetailsElem = document.querySelector(".word-details");
const errTxt = document.querySelector(".errTxt");

const exampleElem = document.getElementById("example-elem");
const synonymsElem = document.getElementById("synonyms-elem");
const antonymsElem = document.getElementById("antonyms-elem");

const loading = document.getElementById("loading");
const audio = new Audio();

function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

const suggestionsBox = document.getElementById("suggestions");

let allowSuggestions = true;
let suggestionRequestId = 0;

searchInput.addEventListener(
    "input",
    debounce(async () => {
        const q = searchInput.value.trim();

        if (!q || !allowSuggestions) {
            hideSuggestions();
            return;
        }

        const currentId = ++suggestionRequestId;

        try {
            const res = await fetch(`https://api.datamuse.com/sug?s=${q}`);
            const data = await res.json();

            if (currentId !== suggestionRequestId || !allowSuggestions) return;

            renderSuggestions(data);
        } catch {
            if (currentId !== suggestionRequestId) return;
            hideSuggestions();
        }
    }, 250)
);

searchInput.addEventListener("input", () => {
    allowSuggestions = true;
});

document.addEventListener("click", (e) => {
    if (!searchBox.contains(e.target)) {
        hideSuggestions();
    }
});

function renderSuggestions(list) {
    if (!allowSuggestions || !list.length) {
        hideSuggestions();
        return;
    }

    suggestionsBox.innerHTML = "";

    list.slice(0, 6).forEach(item => {
        const div = document.createElement("div");
        div.textContent = item.word;

        div.addEventListener("click", () => {
            searchInput.value = item.word;
            hideSuggestions();
            searchBox.requestSubmit();
        });

        suggestionsBox.appendChild(div);
    });

    suggestionsBox.style.display = "block";
}

document.getElementById("theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
});

async function getWordDetails(word) {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

    if (!res.ok) {
        throw new Error("API failed");
    }

    const data = await res.json();

    if (!data || !data[0]) {
        throw new Error("No data found");
    }

    const wordData = data[0];

    const phonetics = wordData.phonetics || [];
    let pText = "";
    let pAudio = "";

    for (const p of phonetics) {
        if (!pText && p.text) pText = p.text;
        if (!pAudio && p.audio) pAudio = p.audio;
    }

    const meaning = wordData.meanings?.[0];
    if (!meaning) throw new Error("No meaning found");

    return {
        word: wordData.word,
        phonetic: {
            text: pText,
            audio: pAudio
        },
        speechPart: meaning.partOfSpeech || "",
        definition: meaning.definitions?.[0]?.definition || "",
        example: meaning.definitions?.[0]?.example || "",
        synonyms: meaning.synonyms || [],
        antonyms: meaning.antonyms || []
    };
}

function renderWord(data) {
    errTxt.textContent = "";

    wordDetailsElem.hidden = false;

    wordTxt.textContent = data.word;
    typeTxt.textContent = data.speechPart;
    phoneticTxt.textContent = data.phonetic.text;

    definitionTxt.textContent = data.definition;

    exampleElem.querySelector("p").textContent = data.example;
    synonymsElem.querySelector("p").textContent = data.synonyms.join(", ");
    antonymsElem.querySelector("p").textContent = data.antonyms.join(", ");

    audio.src = data.phonetic.audio || "";

    exampleElem.style.display = data.example ? "block" : "none";
    synonymsElem.style.display = data.synonyms.length ? "block" : "none";
    antonymsElem.style.display = data.antonyms.length ? "block" : "none";

    wordDetailsElem.classList.add("active");
}

function hideSuggestions() {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
}

searchBox.addEventListener("submit", async (e) => {
    e.preventDefault();

    allowSuggestions = false;
    suggestionRequestId++;
    hideSuggestions();

    const query = searchInput.value.trim();

    if (!query) {
        errTxt.textContent = "Type something meaningful first.";
        return;
    }

    loading.style.display = "block";

    try {
        const data = await getWordDetails(query);
        renderWord(data);
    } catch (err) {
        errTxt.textContent = "That word doesn’t exist… or reality disagrees.";
    } finally {
        loading.style.display = "none";
    }
});

soundBtn.addEventListener("click", () => {
    if (!audio.src || audio.src.endsWith("/")) {
        alert("No pronunciation available. Even the internet gave up.");
        return;
    }

    audio.play().catch(() => {
        alert("Audio blocked by browser. It’s not you, it’s your browser being dramatic.");
    });
});