import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// --- State Management ---
let engine = null;
let selectedModel = 'gemma-2-2b-it-q4f16_1-MLC';
let chatHistory = [];
let isGenerating = false;
let isModelLoaded = false;
let webgpuSupported = false;

// --- DOM Elements ---
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const modelSelect = document.getElementById('model-select');
const btnLoadModel = document.getElementById('btn-load-model');

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

// Mirostat DOM (Deprecated for WebLLM but kept visually for layout compatibility)
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
    maxTokens: 2048,
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
    
    // 3. Check WebGPU Compatibility
    checkWebGPUSupport();
    
    // 4. Load saved settings from localStorage
    loadSettings();

    // 5. Setup Mobile Sidebar Toggle
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
});

// Close sidebar on click outside in mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
});

// Sync WebGPU Support Status
function checkWebGPUSupport() {
    if (navigator.gpu) {
        webgpuSupported = true;
        statusIndicator.className = 'status-indicator-dot connected';
        statusText.textContent = 'WebGPU 利用可能';
        modelSelect.removeAttribute('disabled');
        btnLoadModel.removeAttribute('disabled');
    } else {
        webgpuSupported = false;
        statusIndicator.className = 'status-indicator-dot disconnected';
        statusText.textContent = 'WebGPU 非対応';
        statusText.style.color = '#ef4444';
        modelSelect.setAttribute('disabled', 'true');
        btnLoadModel.setAttribute('disabled', 'true');
        
        // Show prominent warning dialog in chat window
        welcomeScreen.innerHTML = `
            <div class="welcome-icon" style="color: #ef4444;">⚠️</div>
            <h2>WebGPU 非対応ブラウザです</h2>
            <p style="color: #fca5a5; max-width: 600px; margin: 0 auto 20px auto;">
                このアプリケーションはブラウザ内で直接AIモデルを実行するために最新の <strong>WebGPU</strong> 技術を必要とします。<br>
                お使いの端末またはブラウザはWebGPUに対応していないか、有効化されていません。
            </p>
            <div class="quick-instructions" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.05);">
                <strong>💡 利用方法:</strong><br><br>
                1. <strong>Google Chrome</strong> または <strong>Microsoft Edge</strong> (バージョン113以降) をご利用ください。<br>
                2. ハードウェアアクセラレーション（GPU使用）設定がブラウザで有効になっていることを確認してください。<br>
                3. スマートフォンの場合は、現時点では一部のAndroid端末のみサポートされています。
            </div>
        `;
    }
}

// Model Selection Changed
modelSelect.addEventListener('change', (e) => {
    selectedModel = e.target.value;
    saveSettings();
});

// Initialize / Load Model Trigger
btnLoadModel.addEventListener('click', loadWebGPUModel);

// Sliders Syncing Events
paramTemp.addEventListener('input', (e) => { valTemp.textContent = e.target.value; });
paramTopP.addEventListener('input', (e) => { valTopP.textContent = e.target.value; });
paramMinP.addEventListener('input', (e) => { valMinP.textContent = e.target.value; });
paramTopK.addEventListener('input', (e) => { valTopK.textContent = e.target.value; });
paramMaxTokens.addEventListener('input', (e) => { valMaxTokens.textContent = e.target.value; });
paramRepeatPenalty.addEventListener('input', (e) => { valRepeatPenalty.textContent = e.target.value; });
paramMirostatTau.addEventListener('input', (e) => { valMirostatTau.textContent = e.target.value; });

// Mirostat compatibility
paramMirostat.addEventListener('change', (e) => {
    if (e.target.value === '0') {
        mirostatTauGroup.style.display = 'none';
    } else {
        mirostatTauGroup.style.display = 'block';
    }
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
        activeModelDisplay.textContent = selectedModel;
        chatInput.removeAttribute('disabled');
        btnSend.removeAttribute('disabled');
        chatInput.placeholder = "メッセージを入力してください...";
    } else {
        activeModelDisplay.textContent = "モデル未ロード";
        chatInput.setAttribute('disabled', 'true');
        btnSend.setAttribute('disabled', 'true');
        chatInput.placeholder = "左側でモデルをロードするとチャットを開始できます";
    }
}

// Load WebGPU Model using Worker
async function loadWebGPUModel() {
    if (!webgpuSupported) return;

    btnLoadModel.setAttribute('disabled', 'true');
    modelSelect.setAttribute('disabled', 'true');
    progressSection.style.display = 'block';
    
    statusIndicator.className = 'status-indicator-dot loading';
    statusText.textContent = 'モデルロード中...';

    progressMessage.textContent = '初期化中...';
    progressPercent.textContent = '0%';
    progressBar.style.width = '0%';

    try {
        // Create the background Web Worker
        const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
        
        // Initialize WebWorker MLCEngine
        engine = await CreateWebWorkerMLCEngine(worker, selectedModel, {
            initProgressCallback: (report) => {
                // report contains progress (0 to 1) and text description
                const percent = Math.round(report.progress * 100);
                progressBar.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;
                
                // Truncate overly long descriptions for cleaner layout
                let cleanMsg = report.text;
                if (cleanMsg.includes(']')) {
                    cleanMsg = cleanMsg.substring(cleanMsg.indexOf(']') + 1).trim();
                }
                progressMessage.textContent = cleanMsg;
            }
        });

        isModelLoaded = true;
        statusIndicator.className = 'status-indicator-dot connected';
        statusText.textContent = 'ロード完了';
        progressMessage.textContent = 'ロード成功！チャットができます。';
        progressBar.style.width = '100%';
        progressPercent.textContent = '100%';

        updateActiveModelDisplay();
        saveSettings();
        
        // Focus chat input
        chatInput.focus();

    } catch (error) {
        console.error("Model loading failed:", error);
        statusIndicator.className = 'status-indicator-dot disconnected';
        statusText.textContent = 'ロード失敗';
        progressMessage.textContent = `エラー: ${error.message}`;
        alert(`モデルのロード中にエラーが発生しました。\n\n詳細: ${error.message}`);
    } finally {
        btnLoadModel.removeAttribute('disabled');
        modelSelect.removeAttribute('disabled');
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
    metaDiv.textContent = role === 'user' ? 'あなた' : selectedModel;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    if (content === '') {
        // Typing placeholder
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
    
    if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
    }
    
    btnClearChat.setAttribute('disabled', 'true');
}

// Stream inference response from WebLLM engine
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text || isGenerating || !isModelLoaded || !engine) return;
    
    isGenerating = true;
    chatInput.value = '';
    autoResizeTextarea(chatInput);
    
    // Disable inputs
    chatInput.setAttribute('disabled', 'true');
    btnSend.setAttribute('disabled', 'true');
    btnClearChat.setAttribute('disabled', 'true');
    
    chatHistory.push({ role: 'user', content: text });
    addMessageToUI('user', text);
    
    const assistantBubble = addMessageToUI('assistant', '');
    btnClearChat.removeAttribute('disabled');
    
    // Setup message sequence
    const systemPrompt = paramSystem.value.trim();
    const requestMessages = [];
    if (systemPrompt) {
        requestMessages.push({ role: 'system', content: systemPrompt });
    }
    requestMessages.push(...chatHistory);
    
    // Parse parameters
    const temp = parseFloat(paramTemp.value);
    const topP = parseFloat(paramTopP.value);
    const maxTokens = parseInt(paramMaxTokens.value);
    const repeatPenalty = parseFloat(paramRepeatPenalty.value);
    const seed = parseInt(paramSeed.value);
    
    let fullReply = '';
    let hasStartedReplying = false;
    
    try {
        // Stream completions using WebLLM Web Worker proxy
        const replyStream = await engine.chat.completions.create({
            messages: requestMessages,
            stream: true,
            temperature: temp,
            top_p: topP,
            max_tokens: maxTokens,
            repetition_penalty: repeatPenalty,
            ...(seed !== -1 ? { seed } : {})
        });
        
        for await (const chunk of replyStream) {
            const token = chunk.choices[0]?.delta?.content;
            if (token) {
                if (!hasStartedReplying) {
                    assistantBubble.innerHTML = '';
                    hasStartedReplying = true;
                }
                fullReply += token;
                assistantBubble.innerHTML = marked.parse(fullReply);
                scrollToBottom();
            }
        }
        
        chatHistory.push({ role: 'assistant', content: fullReply });
        
    } catch (error) {
        console.error("WebLLM generation failed:", error);
        assistantBubble.innerHTML = `<span style="color: #ef4444;">エラーが発生しました。推論エンジンとの通信を確認してください。(${error.message})</span>`;
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
    localStorage.setItem('webgpu_selected_model', modelSelect.value);
    localStorage.setItem('webgpu_temp', paramTemp.value);
    localStorage.setItem('webgpu_top_p', paramTopP.value);
    localStorage.setItem('webgpu_min_p', paramMinP.value);
    localStorage.setItem('webgpu_top_k', paramTopK.value);
    localStorage.setItem('webgpu_max_tokens', paramMaxTokens.value);
    localStorage.setItem('webgpu_repeat_penalty', paramRepeatPenalty.value);
    localStorage.setItem('webgpu_seed', paramSeed.value);
    localStorage.setItem('webgpu_system', paramSystem.value);
}

function loadSettings() {
    if (localStorage.getItem('webgpu_selected_model')) {
        modelSelect.value = localStorage.getItem('webgpu_selected_model');
        selectedModel = modelSelect.value;
    }
    if (localStorage.getItem('webgpu_temp')) paramTemp.value = localStorage.getItem('webgpu_temp');
    if (localStorage.getItem('webgpu_top_p')) paramTopP.value = localStorage.getItem('webgpu_top_p');
    if (localStorage.getItem('webgpu_min_p')) paramMinP.value = localStorage.getItem('webgpu_min_p');
    if (localStorage.getItem('webgpu_top_k')) paramTopK.value = localStorage.getItem('webgpu_top_k');
    if (localStorage.getItem('webgpu_max_tokens')) paramMaxTokens.value = localStorage.getItem('webgpu_max_tokens');
    if (localStorage.getItem('webgpu_repeat_penalty')) paramRepeatPenalty.value = localStorage.getItem('webgpu_repeat_penalty');
    if (localStorage.getItem('webgpu_seed')) paramSeed.value = localStorage.getItem('webgpu_seed');
    if (localStorage.getItem('webgpu_system')) paramSystem.value = localStorage.getItem('webgpu_system');
    
    syncSliders();
    updateActiveModelDisplay();
}
