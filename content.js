(() => {
  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { msg } = obj;

   if (msg === "MSG_CONVERSATIONS") {
      let conversations = document.querySelectorAll(".group");
      let chats = [];
      conversations.forEach(element => {
        // Set href to innerText to pinpoint the conversation
        element.href = element.innerText
        let chat = {
          href: element.href,
          innerText: element.innerText
        }
        chats.push(chat)
      });
      response(chats);
    } else if (msg === "MSG_LOAD_CHAT") {
      const { title } = obj;
      let chat = document.querySelector(`a[href="${title}"]`);
      chat.click();
    }
  });
})();
