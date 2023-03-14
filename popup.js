document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();

  if (activeTab.url.includes("chat.openai.com")) {
    chrome.tabs.sendMessage(activeTab.id, {
      msg: "MSG_CONVERSATIONS"
    },
    manageConversations);
  } else {
    const conversations = document.querySelector("#conversations");
    conversations.innerHTML = '<div class="error">This is not the OpenAi ChatGPT page.</div>';
  }
});

async function getActiveTabURL() {
  return (await chrome.tabs.query({
    currentWindow: true,
    active: true
  }))[0];
}

async function manageConversations(chats = []) {
  const conversations = document.querySelector("#conversations");
  while (conversations.firstChild)
    conversations.removeChild(conversations.firstChild);
  chats.forEach(element => {
    const chat = document.createElement("div");
    chat.innerText = element.innerText;
    chat.addEventListener("click", () => loadChat(element.innerText));
    conversations.appendChild(chat)
  });
}

async function loadChat(title) {
  const activeTab = await getActiveTabURL();
  chrome.tabs.sendMessage(activeTab.id, {
    msg: "MSG_LOAD_CHAT",
    title: title
  });
}