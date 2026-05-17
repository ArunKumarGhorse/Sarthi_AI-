if (localStorage.getItem('isAuthenticated') !== 'true') {
    window.location.href = 'auth.html';
}

const API_KEY = ".";

const fallbackResponses = [
    {
        pattern: /\bhello|hi|hey\b/i,
        text: "Hello! The cloud AI service is currently unavailable due to quota, but I can still give you simple replies locally.",
    },
    {
        pattern: /\bwho are you\b/i,
        text: "I'm Sarthi AI's local fallback assistant. The main AI service is blocked by quota right now.",
    },
    {
        pattern: /\bhow are you\b/i,
        text: "I'm here and ready to help, even though the cloud model is temporarily unavailable.",
    },
    {
        pattern: /\bwhat is javascript\b/i,
        text: "JavaScript is a programming language used to build interactive websites and web apps.",
    },
    {
        pattern: /\bwhat is ai\b/i,
        text: "AI stands for artificial intelligence. It means making computers do tasks that normally require human thinking.",
    },
    {
        pattern: /\broadmap\b|\bweb dev\b/i,
        text: "A good web development roadmap starts with HTML, CSS, JavaScript, and then moves to frameworks and backend concepts.",
    },
];

const chatBox = document.getElementById("chat-box");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recentList = document.getElementById("recent-list");
const newChatBtn = document.querySelector(".new-chat");
const themeToggleBtn = document.getElementById("theme-toggle");
const clearChatBtn = document.getElementById("clear-chat");
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem('isAuthenticated');
        window.location.href = 'auth.html';
    });
}

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
}

themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        localStorage.setItem("theme", "light");
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
});

clearChatBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all chat history?")) {
        localStorage.removeItem("conversations");
        conversations = [];
        activeChatId = null;
        updateRecentChats();
        chatBox.innerHTML = `
            <div class="bot-chat">
                Hello 👋 <br>
                I'm Sarthi AI. Ask anything.
            </div>
        `;
    }
});

let conversations = JSON.parse(localStorage.getItem("conversations")) || [];
let activeChatId = null;

function loadConversation(id) {
    activeChatId = id;
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;

    chatBox.innerHTML = "";
    conv.messages.forEach(msg => {
        appendMessage(msg.text, msg.role === "user" ? "user-chat" : "bot-chat");
    });
}

function updateRecentChats() {
    if (!recentList) return;
    recentList.innerHTML = "";
    conversations.forEach((conv) => {
        const div = document.createElement("div");
        div.classList.add("recent-item");
        div.innerText = conv.title.length > 22 ? conv.title.substring(0, 22) + "..." : conv.title;
        div.addEventListener("click", () => {
            loadConversation(conv.id);
        });
        recentList.appendChild(div);
    });
}
updateRecentChats();

if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
        activeChatId = null;
        chatBox.innerHTML = `
            <div class="bot-chat">
                Hello 👋 <br>
                I'm Sarthi AI. Ask anything.
            </div>
        `;
    });
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

function getLocalFallback(message) {
    const normalized = message.trim();
    if (!normalized) {
        return "Please type a question so I can help.";
    }

    const match = fallbackResponses.find((item) => item.pattern.test(normalized));
    if (match) {
        return match.text;
    }

    return "The cloud AI service is unavailable due to quota restrictions. Please try again later or ask a simple question.";
}

async function sendMessage() {
    const userMessage = input.value.trim();
    if (!userMessage) return;

    input.value = "";
    appendMessage(userMessage, "user-chat");

    let isNewChat = false;
    let currentConv = null;

    if (!activeChatId) {
        isNewChat = true;
        activeChatId = Date.now().toString();
        currentConv = { id: activeChatId, title: userMessage, messages: [] };
        conversations.unshift(currentConv);
        if (conversations.length > 15) conversations.pop();
    } else {
        currentConv = conversations.find(c => c.id === activeChatId);
    }

    if (currentConv) {
        currentConv.messages.push({ role: "user", text: userMessage });
        localStorage.setItem("conversations", JSON.stringify(conversations));
        if (isNewChat) updateRecentChats();
    }

    let apiContents = [];
    if (currentConv) {
        apiContents = currentConv.messages.map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
        }));
    }

    const typing = appendMessage("Typing...", "bot-chat");

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            { text: "Provide short, concise answers using bullet points. Do not give long explanations." }
                        ]
                    },
                    contents: apiContents
                }),
            }
        );

        const data = await response.json();
        typing.remove();

        if (!response.ok) {
            const errorMessage = data?.error?.message || "Unable to get a response from the server.";
            let displayMessage = errorMessage;

            if (data?.error?.status === "RESOURCE_EXHAUSTED") {
                displayMessage += " This usually means your API key has run out of quota or billing is not enabled for this project.";
            }

            appendMessage(`Error: ${displayMessage}`, "bot-chat");
            appendMessage(getLocalFallback(userMessage), "bot-chat");
            return;
        }

        const botReply =
            data?.candidates?.[0]?.content?.[0]?.text ||
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            data?.candidates?.[0]?.output?.[0]?.content?.text ||
            "Sorry, I couldn't understand the response.";

        if (currentConv) {
            currentConv.messages.push({ role: "bot", text: botReply });
            localStorage.setItem("conversations", JSON.stringify(conversations));
        }

        appendMessage(botReply, "bot-chat");

    } catch (error) {
        console.log(error);
        typing.innerText = "Cloud service unavailable. Using fallback reply.";
        appendMessage(getLocalFallback(userMessage), "bot-chat");
    }
}

function appendMessage(text, className) {

    const div = document.createElement("div");

    div.classList.add(className);

    div.innerText = text;

    chatBox.appendChild(div);

    chatBox.scrollTop = chatBox.scrollHeight;

    return div;
}   
