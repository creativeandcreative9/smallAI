import { Wllama } from "https://cdn.jsdelivr.net/npm/@wllama/wllama@3.4.1/esm/index.js";

// --- Configuration ---
const WLLAMA_CONFIG_PATHS = {
    "default": "https://cdn.jsdelivr.net/npm/@wllama/wllama@3.4.1/esm/wasm/wllama.wasm",
};

const CONFIG = {
    modelUrl: "https://huggingface.co/mradermacher/Qwen2.5-0.5B-Instruct-abliterated-v3-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-abliterated-v3.Q8_0.gguf",
    modelName: "Qwen2.5-0.5B-Instruct-abliterated-v3 (GGUF)",
};

// --- State Management ---
let wllama = null;
let chatHistory = [];
let isGenerating = false;
let isModelLoaded = false;

// --- DOM Elements ---
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

// Progress UI
const progressSection = document.getElementById('progress-section');
const progressMessage = document.getElementById('progress-message');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');

// Parameters DOM
const paramTemp = document.getElementById('param-temp');
const valTemp = document.getElementById('val-temp');
const paramTopP = document.getElementById('param-top-p');
const valTopP = document.getElementById('val-top-p');
const paramMinP = document.getElementById('param-min-p');
const valMinP = document.getElementById('val-min-p');
const paramTopK = document.getElementById('param-top-k');
const valTopK = document.getElementById('val-top-k');
const paramMaxTokens = document.getElementById('param-max-tokens');
const valMaxTokens = document.getElementById('val-max-tokens');
const paramRepeatPenalty = document.getElementById('param-repeat-penalty');
const valRepeatPenalty = document.getElementById('val-repeat-penalty');
const paramSeed = document.getElementById('param-seed');
const paramSystem = document.getElementById('param-system');
const btnResetParams = document.getElementById('btn-reset-params');

// Mirostat DOM
const paramMirostat = document.getElementById('param-mirostat');
const mirostatTauGroup = document.getElementById('mirostat-tau-group');
const paramMirostatTau = document.getElementById('param-mirostat-tau');
const valMirostatTau = document.getElementById('val-mirostat-tau');

// Main Interface DOM
const activeModelDisplay = document.getElementById('active-model-display');
const btnClearChat = document.getElementById('btn-clear-chat');
const chatHistoryDiv = document.getElementById('chat-history');
const welcomeScreen = document.getElementById('welcome-screen');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');

const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');

// --- Parameter Defaults ---
const DEFAULTS = {
    temp: 0.7,
    topP: 0.9,
    minP: 0.05,
    topK: 40,
    maxTokens: 1024,
    repeatPenalty: 1.1,
    seed: -1,
    system: "You are a helpful, respectful, and honest assistant."
};

// --- Initial Setup & Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sync sliders UI
    syncSliders();

    // 2. Setup marked.js configurations
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    // 3. Load saved settings from localStorage
    loadSettings();

    // 4. Setup Mobile Sidebar Toggle
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // 5. Automatic Model Loading (Zero-Click)
    initWllama();
});

// Close sidebar on click outside in mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
});

// Sliders Syncing Events
paramTemp.addEventListener('input', (e) => { valTemp.textContent = e.target.value; });
paramTopP.addEventListener('input', (e) => { valTopP.textContent = e.target.value; });
paramMinP.addEventListener('input', (e) => { valMinP.textContent = e.target.value; });
paramTopK.addEventListener('input', (e) => { valTopK.textContent = e.target.value; });
paramMaxTokens.addEventListener('input', (e) => { valMaxTokens.textContent = e.target.value; });
paramRepeatPenalty.addEventListener('input', (e) => { valRepeatPenalty.textContent = e.target.value; });
paramMirostatTau.addEventListener('input', (e) => { valMirostatTau.textContent = e.target.value; });

paramMirostat.addEventListener('change', (e) => {
    mirostatTauGroup.style.display = e.target.value === '0' ? 'none' : 'block';
    saveSettings();
});

const saveTriggers = [
    paramTemp, paramTopP, paramMinP, paramTopK, paramMaxTokens,
    paramRepeatPenalty, paramSeed, paramSystem
];
saveTriggers.forEach(el => {
    el.addEventListener('change', saveSettings);
});

btnResetParams.addEventListener('click', () => {
    paramTemp.value = DEFAULTS.temp;
    valTemp.textContent = DEFAULTS.temp;
    paramTopP.value = DEFAULTS.topP;
    valTopP.textContent = DEFAULTS.topP;
    paramMinP.value = DEFAULTS.minP;
    valMinP.textContent = DEFAULTS.minP;
    paramTopK.value = DEFAULTS.topK;
    valTopK.textContent = DEFAULTS.topK;
    paramMaxTokens.value = DEFAULTS.maxTokens;
    valMaxTokens.textContent = DEFAULTS.maxTokens;
    paramRepeatPenalty.value = DEFAULTS.repeatPenalty;
    valRepeatPenalty.textContent = DEFAULTS.repeatPenalty;
    paramSeed.value = DEFAULTS.seed;
    paramSystem.value = DEFAULTS.system;
    saveSettings();
});

// Chat Input Auto-Resize & Keys
chatInput.addEventListener('input', () => {
    autoResizeTextarea(chatInput);
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isGenerating && chatInput.value.trim() !== '' && isModelLoaded) {
            handleSend();
        }
    }
});

btnSend.addEventListener('click', handleSend);
btnClearChat.addEventListener('click', clearChat);

// --- Functions ---

function syncSliders() {
    valTemp.textContent = paramTemp.value;
    valTopP.textContent = paramTopP.value;
    valMinP.textContent = paramMinP.value;
    valTopK.textContent = paramTopK.value;
    valMaxTokens.textContent = paramMaxTokens.value;
    valRepeatPenalty.textContent = paramRepeatPenalty.value;
    valMirostatTau.textContent = paramMirostatTau.value;
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
}

function updateActiveModelDisplay() {
    if (isModelLoaded) {
        activeModelDisplay.textContent = CONFIG.modelName;
        chatInput.removeAttribute('disabled');
        btnSend.removeAttribute('disabled');
        chatInput.placeholder = "メッセージを入力してください...";
    } else {
        activeModelDisplay.textContent = "初期化中...";
        chatInput.setAttribute('disabled', 'true');
        btnSend.setAttribute('disabled', 'true');
        chatInput.placeholder = "AIの準備が完了するまでお待ちください...";
    }
}

// Initialize Wllama and Load Model
async function initWllama() {
    statusIndicator.className = 'status-indicator-dot loading';
    statusText.textContent = 'エンジン初期化中...';

    progressSection.style.display = 'block';
    progressMessage.textContent = 'エンジンの読み込み中...';

    try {
        // Create Wllama instance with proper WASM paths (single/multi-thread)
        wllama = new Wllama(WLLAMA_CONFIG_PATHS);

        progressMessage.textContent = 'モデルのダウンロード中...';

        await wllama.loadModelFromUrl(CONFIG.modelUrl, {
            n_ctx: 1024,             // Reduce context size for browser stability
            n_batch: 128,            // Limit batch size to reduce memory spikes
            cache_type_k: 'q4_0',    // Quantize KV cache to save memory
            cache_type_v: 'q4_0',    // Quantize KV cache to save memory
            n_threads: 1,            // Force single-thread (GitHub Pages lacks COOP/COEP for SharedArrayBuffer)
            useCache: false,         // Force fresh download to bypass any corrupted cache from previous 404
            progressCallback: ({ loaded, total }) => {
                const percent = Math.round((loaded / total) * 100);
                progressBar.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;
                progressMessage.textContent = `ダウンロード中: ${(loaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB`;
            }
        });

        isModelLoaded = true;
        statusIndicator.className = 'status-indicator-dot connected';
        statusText.textContent = '準備完了';
        progressMessage.textContent = 'ロード成功！チャットができます。';
        progressBar.style.width = '100%';
        progressPercent.textContent = '100%';

        updateActiveModelDisplay();

        // Hide progress section after success
        setTimeout(() => {
            progressSection.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error("Wllama initialization failed:", error);
        statusIndicator.className = 'status-indicator-dot disconnected';
        statusText.textContent = 'ロード失敗';
        progressMessage.textContent = `エラー: ${error.message}`;
        alert(`モデルのロード中にエラーが発生しました。\n\n詳細: ${error.message}`);
    }
}

// Add message to UI
function addMessageToUI(role, content) {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    metaDiv.textContent = role === 'user' ? 'あなた' : 'AI';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    if (content === '') {
        bubbleDiv.innerHTML = `
            <div class="typing-loader">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
    } else {
        bubbleDiv.innerHTML = marked.parse(content);
    }

    messageDiv.appendChild(metaDiv);
    messageDiv.appendChild(bubbleDiv);
    chatHistoryDiv.appendChild(messageDiv);

    scrollToBottom();
    return bubbleDiv;
}

function scrollToBottom() {
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

function clearChat() {
    chatHistory = [];
    const messages = chatHistoryDiv.querySelectorAll('.message');
    messages.forEach(m => m.remove());
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    btnClearChat.setAttribute('disabled', 'true');
}

// Stream inference response from Wllama
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text || isGenerating || !isModelLoaded || !wllama) return;

    isGenerating = true;
    chatInput.value = '';
    autoResizeTextarea(chatInput);

    chatInput.setAttribute('disabled', 'true');
    btnSend.setAttribute('disabled', 'true');
    btnClearChat.setAttribute('disabled', 'true');

    chatHistory.push({ role: 'user', content: text });
    addMessageToUI('user', text);

    const assistantBubble = addMessageToUI('assistant', '');
    btnClearChat.removeAttribute('disabled');

    // Manual ChatML formatting (more reliable for specific Qwen GGUFs)
    const systemPrompt = paramSystem.value.trim();
    let prompt = "";
    if (systemPrompt) {
        prompt += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    }
    chatHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'user' : 'assistant';
        prompt += `<|im_start|>${role}\n${msg.content}<|im_end|>\n`;
    });
    prompt += `<|im_start|>assistant\n`;

    const params = {
        max_tokens: parseInt(paramMaxTokens.value),
        temperature: parseFloat(paramTemp.value),
        top_p: parseFloat(paramTopP.value),
        min_p: parseFloat(paramMinP.value),
        top_k: parseInt(paramTopK.value),
        penalty_repeat: parseFloat(paramRepeatPenalty.value),
        mirostat: parseInt(paramMirostat.value),
        mirostat_tau: parseFloat(paramMirostatTau.value),
        stop: ["<|im_end|>", "<|im_start|>", "assistant\n"]
    };

    const seed = parseInt(paramSeed.value);
    if (seed !== -1) params.seed = seed;

    let fullReply = '';
    let hasStartedReplying = false;

    try {
        await wllama.createCompletion({
            prompt: prompt,
            ...params,
            stream: true,
            onData: (chunk) => {
                const tokenText = chunk.choices[0]?.text || '';
                if (!hasStartedReplying) {
                    assistantBubble.innerHTML = '';
                    hasStartedReplying = true;
                }
                fullReply += tokenText;
                assistantBubble.innerHTML = marked.parse(fullReply);
                scrollToBottom();
            }
        });

        chatHistory.push({ role: 'assistant', content: fullReply });

    } catch (error) {
        console.error("Wllama generation failed:", error);
        assistantBubble.innerHTML = `<span style="color: #ef4444;">エラーが発生しました。(${error.message})</span>`;
    } finally {
        isGenerating = false;
        chatInput.removeAttribute('disabled');
        btnSend.removeAttribute('disabled');
        btnClearChat.removeAttribute('disabled');
        chatInput.focus();
    }
}

// --- Persistence ---
function saveSettings() {
    localStorage.setItem('wllama_temp', paramTemp.value);
    localStorage.setItem('wllama_top_p', paramTopP.value);
    localStorage.setItem('wllama_min_p', paramMinP.value);
    localStorage.setItem('wllama_top_k', paramTopK.value);
    localStorage.setItem('wllama_max_tokens', paramMaxTokens.value);
    localStorage.setItem('wllama_repeat_penalty', paramRepeatPenalty.value);
    localStorage.setItem('wllama_seed', paramSeed.value);
    localStorage.setItem('wllama_system', paramSystem.value);
    localStorage.setItem('wllama_mirostat', paramMirostat.value);
    localStorage.setItem('wllama_mirostat_tau', paramMirostatTau.value);
}

function loadSettings() {
    if (localStorage.getItem('wllama_temp')) paramTemp.value = localStorage.getItem('wllama_temp');
    if (localStorage.getItem('wllama_top_p')) paramTopP.value = localStorage.getItem('wllama_top_p');
    if (localStorage.getItem('wllama_min_p')) paramMinP.value = localStorage.getItem('wllama_min_p');
    if (localStorage.getItem('wllama_top_k')) paramTopK.value = localStorage.getItem('wllama_top_k');
    if (localStorage.getItem('wllama_max_tokens')) paramMaxTokens.value = localStorage.getItem('wllama_max_tokens');
    if (localStorage.getItem('wllama_repeat_penalty')) paramRepeatPenalty.value = localStorage.getItem('wllama_repeat_penalty');
    if (localStorage.getItem('wllama_seed')) paramSeed.value = localStorage.getItem('wllama_seed');
    if (localStorage.getItem('wllama_system')) paramSystem.value = localStorage.getItem('wllama_system');
    if (localStorage.getItem('wllama_mirostat')) {
        paramMirostat.value = localStorage.getItem('wllama_mirostat');
        mirostatTauGroup.style.display = paramMirostat.value === '0' ? 'none' : 'block';
    }
    if (localStorage.getItem('wllama_mirostat_tau')) paramMirostatTau.value = localStorage.getItem('wllama_mirostat_tau');

    syncSliders();
    updateActiveModelDisplay();
}
