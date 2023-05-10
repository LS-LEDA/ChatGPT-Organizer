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
  updateTagsFilters();

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

  // Filters
  const filterButton = document.querySelector("#btn-filter-title");
  filterButton.addEventListener("click", refreshLists);

  const clearFilterTitle = document.querySelector("#clear-filter-title");
  clearFilterTitle.addEventListener("click", () => {
    document.querySelector("#filter-title").value = "";
    refreshLists();
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
  const filter = {
    title: document.querySelector("#filter-title").value,
    tags: []
  }
  chrome.tabs.sendMessage(activeTab.id, {
    msg: "MSG_CONVERSATIONS"
  },
    (data) => {
      updateTagsList();
      updateTagsFilters();
      manageConversations(data, filter);
    });
}

async function loadChat(title) {
  const activeTab = await getActiveTabURL();
  chrome.tabs.sendMessage(activeTab.id, {
    msg: "MSG_LOAD_CHAT",
    title: title
  });
}

function sortChats(chars) {
  return chars.sort((a, b) => {
    if (a.innerText < b.innerText) return -1;
    if (a.innerText > b.innerText) return 1;
    return 0;
  });
}

/**
 * Create the list of conversations
 */
async function manageConversations(chats = [], filter) {
  if (!filter) filter = { title: "" };
  const conversations = document.querySelector("#conversations");
  while (conversations.firstChild) conversations.removeChild(conversations.firstChild);

  if (chats.length === 0) {
    conversations.innerHTML = '<div class="error">No conversations found.</div>';
    return;
  }

  chats = sortChats(chats);
  const sTags = await getTags();
  const sChats = await getChats();
  const filterTags = await getFilterTags();
  chats.filter(chat => {
    const text = chat.innerText.toLowerCase();
    const includesText = text.includes(filter.title.toLowerCase());
    if (filterTags.length > 0) {
      const ch = sChats.find(c => c.id === chat.href.split("https://chat.openai.com/")[1]);
      if (ch) {
        const tag = sTags.find(tag => tag.id === ch.tag);
        if (tag) {
          return !(!includesText || !filterTags.includes(tag.id));
        }
      }
      return false;
    }
    return !(!includesText);
  }).forEach(async element => {
    // Chat block
    const id = element.href.split("https://chat.openai.com/")[1];
    const chatContainer = document.createElement("div");
    chatContainer.classList.add("chatContainer");
    const chatTagSelect = document.createElement("select");
    chatTagSelect.classList.add("chatTagSelect");
    const chatTagSelectOption = document.createElement("option");
    chatTagSelectOption.innerText = "Select a tag";
    chatTagSelect.appendChild(chatTagSelectOption);
    sTags.forEach(tag => {
      const chatTagSelectOption = document.createElement("option");
      chatTagSelectOption.innerText = tag.value;
      chatTagSelectOption.style.backgroundColor = tag.color;
      chatTagSelect.appendChild(chatTagSelectOption);
    });

    // Select the option if the chat has a tag
    const chat = sChats.find(chat => chat.id === id);
    if (chat) {
      const chatTagSelected = sTags.find(tag => tag.id === chat.tag);
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

async function updateTagsFilters() {
  const tagsList = document.querySelector("#filter-tags");
  while (tagsList.firstChild)
    tagsList.removeChild(tagsList.firstChild);
  const currentFilterTags = await getFilterTags();
  chrome.storage.sync.get("tags", function (data) {
    const tags = data.tags || [];
    tags.forEach(tag => {
      const tagElement = document.createElement("div");
      tagElement.className = "tagBlock tagFilter"

      if (currentFilterTags.includes(tag.id)) tagElement.classList.add("tagFilterSelected");
      const tagColor = document.createElement("span");
      tagColor.innerText = " ";
      tagColor.style.backgroundColor = tag.color;
      tagColor.className = "tagColor";
      tagElement.appendChild(tagColor);

      const tagValue = document.createElement("span");
      tagValue.innerText = tag.value;
      tagValue.className = "tagValue";
      tagElement.appendChild(tagValue);

      tagElement.addEventListener("click", () => {
        const filterTitle = document.querySelector("#filter-title");
        filterTitle.value = "";

        chrome.storage.sync.get("filter-tags", function (data) {

          if (!data["filter-tags"]) data["filter-tags"] = [];
          const tags = data["filter-tags"] || [];

          if (tagElement.classList.contains("tagFilterSelected")) {
            tags.splice(tags.indexOf(tag.id), 1);

          } else {
            const tagIndex = tags.indexOf(tag.id);
            if (tagIndex === -1) {
              tags.push(tag.id);
            } else {
              tags.splice(tagIndex, 1);
            }
          }
          chrome.storage.sync.set({ "filter-tags": tags }, refreshLists);
        });
      });

      tagsList.appendChild(tagElement)
    });
  });
}

async function deleteTag(id) {
  const tags = await getTags();
  const newTags = tags.filter(tag => tag.id != id);
  chrome.storage.sync.set({ tags: newTags }, function () {
    updateTagsList();
    updateTagsFilters();
  });

  const chats = await getChats();
  const newChats = chats.filter(chat => chat.tag != id);
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

async function getFilterTags() {
  const data = await chrome.storage.sync.get("filter-tags");
  return data["filter-tags"] || [];
}