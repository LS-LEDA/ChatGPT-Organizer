document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();

  if (!activeTab.url.includes("chat.openai.com")) {
    const conversations = document.querySelector("#conversations");
    conversations.innerHTML = '<div class="error">This is not the OpenAi ChatGPT page.</div>';
    const tagsContainer = document.querySelector("#tagsContainer");
    tagsContainer.style.display = "none";
    const optionsButtons = document.querySelector("#options-buttons");
    optionsButtons.style.display = "none";
    const chatsList = document.querySelector("#chats-list");
    chatsList.style.display = "none";
    return;
  }

  // Read convesations
  chrome.tabs.sendMessage(activeTab.id, {
    msg: "MSG_CONVERSATIONS"
  }, manageConversations);

  // Read tags
  const tags = document.querySelector("#addTag");
  tags.addEventListener("click", addTag);
  updateTagsList();

  const btnClearAll = document.querySelector("#btn-clearAll");
  btnClearAll.addEventListener("click", () => {
    chrome.storage.sync.set({ chats: [], tags: [] }, refreshLists);
  });

  const btnClearTags = document.querySelector("#btn-clearTags");
  btnClearTags.addEventListener("click", () => {
    chrome.storage.sync.set({ chats: [] }, refreshLists);
  });

  const btnAbout = document.querySelector("#btn-about");
  btnAbout.addEventListener("click", () => {
    alert("About OpenAi ChatGPT Tagging Extension");
  });
});

async function getActiveTabURL() {
  return (await chrome.tabs.query({
    currentWindow: true,
    active: true
  }))[0];
}

async function refreshLists() {
  const activeTab = await getActiveTabURL();
  chrome.tabs.sendMessage(activeTab.id, {
    msg: "MSG_CONVERSATIONS"
  },
    (data) => {
      updateTagsList();
      manageConversations(data);
    });
}

async function loadChat(title) {
  const activeTab = await getActiveTabURL();
  chrome.tabs.sendMessage(activeTab.id, {
    msg: "MSG_LOAD_CHAT",
    title: title
  });
}

/**
 * Create the list of conversations
 */
async function manageConversations(chats = []) {
  const conversations = document.querySelector("#conversations");
  while (conversations.firstChild)
    conversations.removeChild(conversations.firstChild);

  chats.forEach(async element => {
    // Chat block
    const id = element.href.split("https://chat.openai.com/")[1];
    const chatContainer = document.createElement("div");
    chatContainer.classList.add("chatContainer");
    const chatTagSelect = document.createElement("select");
    chatTagSelect.classList.add("chatTagSelect");
    const chatTagSelectOption = document.createElement("option");
    chatTagSelectOption.innerText = "Select a tag";
    chatTagSelect.appendChild(chatTagSelectOption);
    const tags = await getTags();
    tags.forEach(tag => {
      const chatTagSelectOption = document.createElement("option");
      chatTagSelectOption.innerText = tag.value;
      chatTagSelectOption.style.backgroundColor = tag.color;
      chatTagSelect.appendChild(chatTagSelectOption);
    });

    // Select the option if the chat has a tag
    const chats = await getChats();
    const chat = chats.find(chat => chat.id === id);
    if (chat) {
      const tags = await getTags();
      const chatTagSelected = tags.find(tag => tag.id === chat.tag);
      if (chatTagSelected) {
        chatTagSelect.value = chatTagSelected.value;
        chatTagSelect.style.backgroundColor = chatTagSelected.color;
      }
    }

    // Handle change tag
    chatTagSelect.addEventListener("change", async (element, ev) => {
      // Here we call again the getChats and getTags function because we need to update the chats array
      const chats = await getChats();
      const chat = chats.find(chat => chat.id === id);
      const tags = await getTags();
      const chatTagSelected = tags.find(tag => tag.value === chatTagSelect.value);
      let chatTagSelectedId = -1;
      if (chatTagSelected) chatTagSelectedId = chatTagSelected.id ?? -1;
      if (chat) chat.tag = chatTagSelectedId;
      else chats.push({ id: id, tag: chatTagSelectedId });

      chatTagSelect.style.backgroundColor = chatTagSelect.value === "Select a tag" ? "white" : chatTagSelected.color;

      chrome.storage.sync.set({ chats: chats });
    });

    chatContainer.appendChild(chatTagSelect);

    const chatElement = document.createElement("div");
    chatElement.innerText = element.innerText;
    chatElement.addEventListener("click", () => loadChat(element.innerText));

    chatContainer.appendChild(chatElement);

    conversations.appendChild(chatContainer)
  });
}

// Add a new tag
function addTag() {
  const tagValue = document.querySelector("#tag").value;
  document.querySelector("#tag").value = "";
  chrome.storage.sync.get("tags", function (data) {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    const tag = { value: tagValue, color: randomColor, id: -1 }

    const tags = data.tags || [];
    // if there are no tags, create an array
    if (tags.length == 0) {
      tag.id = 0;
    } else {
      tag.id = data.tags[data.tags.length - 1].id + 1;
    }
    tags.push(tag);

    chrome.storage.sync.set({ tags: tags }, refreshLists);
  });
}

// Show the list of tags
function updateTagsList() {
  const tagsList = document.querySelector("#tags");
  while (tagsList.firstChild)
    tagsList.removeChild(tagsList.firstChild);
  chrome.storage.sync.get("tags", function (data) {
    const tags = data.tags || [];
    tags.forEach(tag => {
      const tagElement = document.createElement("div");
      tagElement.className = "tagBlock"

      const tagDelete = document.createElement("button");
      tagDelete.innerText = "✖";
      tagDelete.className = "tagDelete";
      tagDelete.addEventListener("click", () => deleteTag(tag.id));
      tagElement.appendChild(tagDelete);

      const tagColor = document.createElement("span");
      tagColor.innerText = " ";
      tagColor.style.backgroundColor = tag.color;
      tagColor.className = "tagColor";
      tagElement.appendChild(tagColor);

      const tagValue = document.createElement("span");
      tagValue.innerText = tag.value;
      tagValue.className = "tagValue";
      tagElement.appendChild(tagValue);

      tagsList.appendChild(tagElement)
    });
  });
}

async function deleteTag(id) {
  const tags = await getTags();
  const newTags = tags.filter(tag => tag.id != id);
  chrome.storage.sync.set({ tags: newTags }, function () {
    updateTagsList();
  });

  const chats = await getChats();
  console.log(chats)
  const newChats = chats.filter(chat => chat.tag != id);
  console.log(newChats)
  chrome.storage.sync.set({ chats: newChats }, refreshLists);

}

async function getTags() {
  const data = await chrome.storage.sync.get("tags");
  return data.tags || [];
}

async function getChats() {
  const data = await chrome.storage.sync.get("chats");
  return data.chats || [];
}