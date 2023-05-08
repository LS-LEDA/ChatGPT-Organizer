(() => {
  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { msg } = obj;

    if (msg === "MSG_CONVERSATIONS") {
      const showMoreButton = document.getElementsByClassName("btn btn-small")[0];
      if (showMoreButton) {
        showMoreButton.click();
      }

      const nav = document.getElementsByClassName("overflow-y-auto");
      nav[0].id = "nav";
      let conversations = document.querySelectorAll("#nav .group");
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
