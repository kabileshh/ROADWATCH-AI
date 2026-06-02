// RoadWatch AI // Futuristic Chat Console Module

// Initialize Chat Bot
function initChatbot() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input-message');
    const presets = document.querySelectorAll('.preset-btn');

    // Handle Form Submit
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (!msg) return;

        submitUserMessage(msg);
        chatInput.value = '';
    });

    // Handle Preset Click
    presets.forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.getAttribute('data-query');
            if (query) {
                submitUserMessage(query);
            }
        });
    });
}

// Render message bubbles in terminal
function appendChatBubble(sender, text, isBot = true, agentName = "SYSTEM") {
    const chatBox = document.getElementById('console-chat-box');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isBot ? 'bot-bubble' : 'user-bubble'}`;

    // Get current time
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    bubble.innerHTML = `
        <div class="bubble-meta">
            <span class="sender-name">${sender.toUpperCase()} // ${agentName}</span>
            <span class="bubble-time">${timeStr}</span>
        </div>
        <div class="bubble-text">${formatMarkdownText(text)}</div>
    `;

    chatBox.appendChild(bubble);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Basic markdown format parser for console results
function formatMarkdownText(text) {
    // Replace newlines with <br>
    let formatted = text.replace(/\n/g, '<br>');
    
    // Replace **bold** with <b>tags
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b class="text-cyan">$1</b>');
    
    // Replace list points
    formatted = formatted.replace(/- (.*?)(<br>|$)/g, '<i class="fa-solid fa-square-rss text-orange" style="font-size:0.6rem; margin-right:6px;"></i> $1<br>');
    
    return formatted;
}

// Show/Hide typing dots
let typingIndicator = null;
function showTypingIndicator() {
    const chatBox = document.getElementById('console-chat-box');
    if (typingIndicator) return;

    typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-bubble bot-bubble';
    typingIndicator.innerHTML = `
        <div class="bubble-meta">
            <span class="sender-name">CORE_AI // STATUS</span>
            <span class="bubble-time">PROCESSING</span>
        </div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.remove();
        typingIndicator = null;
    }
}

// Send user message to Flask
function submitUserMessage(message) {
    // Append user bubble
    appendChatBubble("CITIZEN_CLIENT", message, false, "CONSOLE_FEED");
    
    // Show AI thinking indicator
    showTypingIndicator();

    fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
    })
    .then(res => res.json())
    .then(data => {
        removeTypingIndicator();
        if (data.status === 'success') {
            appendChatBubble("CORE_AI", data.response, true, data.agent.toUpperCase());
        } else {
            appendChatBubble("CORE_AI", "Error processing command registry query. Status failure.", true, "ERROR");
        }
    })
    .catch(err => {
        console.error("Chat error:", err);
        removeTypingIndicator();
        appendChatBubble("CORE_AI", "Sub-system connectivity offline. Local loopback failed.", true, "OFFLINE");
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initChatbot();
});
