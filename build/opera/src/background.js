'use strict'

// update icon based on toggle state on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('toggle', (data) => {
    let isEmpty = Object.keys(data).length === 0 && data.constructor === Object;
    if (!isEmpty) {
      if (data.toggle === 'off') {
        chrome.action.setIcon({ path: 'images/icon32off.png' });
      } else {
        chrome.browserAction.setIcon({ path: 'images/icon32.png' });
      }
    }
  });
});

const onChangeListener = (chdbmid) => {
  chrome.bookmarks.onChanged.removeListener(onChangeListener); // added to bypass .update below
  chrome.storage.local.get('toggle', (data) => {
    if (data.toggle === 'on') {
      chrome.bookmarks.getSubTree('1', (results) => {
        chrome.storage.local.get('userBookmarks', (userBookmarks) => {
          let newBmSet = userBookmarks;
          for (let i = 0; i < results[0].children.length; i++) {
            let itemIdString = results[0].children[i].id.toString();
            if (results[0].children[i].id === chdbmid) {
              newBmSet.userBookmarks[0].children.push(results[0].children[i]);
              // store bookmarks
              chrome.storage.local.set({ 'userBookmarks': newBmSet.userBookmarks });
              chrome.bookmarks.update(itemIdString, { title: '' })
            }
          }
          chrome.bookmarks.onChanged.addListener(onChangeListener);
        });
      });
    }
  });
}

chrome.bookmarks.onChanged.addListener(onChangeListener);

// update icon and store/modify bookmarks when clicked
chrome.action.onClicked.addListener(() => {
  chrome.bookmarks.onChanged.removeListener(onChangeListener);
  chrome.storage.local.get('toggle', (data) => {
    let isEmpty = Object.keys(data).length === 0 && data.constructor === Object;
    if (isEmpty || data.toggle === 'off') {
      chrome.storage.local.set({ 'toggle': 'on' });
      chrome.action.setIcon({ path: 'images/icon32.png' });
      chrome.bookmarks.getSubTree('1', (results) => {
        // store bookmarks
        chrome.storage.local.set({ 'userBookmarks': results });
        for (let i = 0; i < results[0].children.length; i++) {
          let itemIdString = results[0].children[i].id.toString();
          chrome.bookmarks.update(itemIdString, { title: '' });
        }
        chrome.bookmarks.onChanged.addListener(onChangeListener);
      });
    } else {
      chrome.storage.local.set({ 'toggle': 'off' });
      chrome.action.setIcon({ path: 'images/icon32off.png' });
      chrome.storage.local.get('userBookmarks', (userBookmarks) => {
        chrome.bookmarks.getSubTree('1', (results) => {
          for (let i = 0; i < results[0].children.length; i++) {
            let itemIdString = results[0].children[i].id.toString();
            for (let j = 0; j < userBookmarks.userBookmarks[0].children.length; j++) {
              if (results[0].children[i].id === userBookmarks.userBookmarks[0].children[j].id) {
                chrome.bookmarks.update(itemIdString, { title: userBookmarks.userBookmarks[0].children[j].title })
              }
            }
          }
          chrome.bookmarks.onChanged.addListener(onChangeListener);
        });
      });

    }
  });
});

// store/modify new bookmarks when created
chrome.bookmarks.onCreated.addListener((newbmid) => {
  chrome.bookmarks.onChanged.removeListener(onChangeListener);
  chrome.storage.local.get('toggle', (data) => {
    if (data.toggle === 'on') {
      chrome.bookmarks.getSubTree('1', (results) => {
        chrome.storage.local.get('userBookmarks', (userBookmarks) => {
          let newBmSet = userBookmarks;
          for (let i = 0; i < results[0].children.length; i++) {
            let itemIdString = results[0].children[i].id.toString();
            if (results[0].children[i].id === newbmid) {
              newBmSet.userBookmarks[0].children.push(results[0].children[i]);
              // store bookmarks
              chrome.storage.local.set({ 'userBookmarks': newBmSet.userBookmarks });
              chrome.bookmarks.update(itemIdString, { title: '' });
              chrome.bookmarks.onChanged.addListener(onChangeListener);
            }
          }
        });
      });
    }
  });
})

chrome.bookmarks.onMoved.addListener((movedbmid) => {
  chrome.bookmarks.onChanged.removeListener(onChangeListener);
  chrome.storage.local.get('toggle', (data) => {
    if (data.toggle === 'on') {
      chrome.storage.local.get('userBookmarks', (userBookmarks) => {
        chrome.bookmarks.getSubTree('1', (results) => {
          let resultsIds = [];
          for (let i = 0; i < results[0].children.length; i++) {
            resultsIds.push(results[0].children[i].id);
          }
          if (resultsIds.indexOf(movedbmid) != -1) {
            // item was already in bmb or moved from folder/subfolder
            let newBmSet = userBookmarks;
            for (let i = 0; i < results[0].children.length; i++) {
              if (results[0].children[i].id == movedbmid) {
                chrome.bookmarks.get(movedbmid.toString(), (moveditem) => {
                  if (moveditem[0].title.length > 0) {
                    // was moved from folder/subfolder
                    newBmSet.userBookmarks[0].children.push(moveditem[0]);
                    // store bookmarks
                    chrome.storage.local.set({ 'userBookmarks': newBmSet.userBookmarks });
                    chrome.bookmarks.update(movedbmid.toString(), { title: '' })
                    chrome.bookmarks.onChanged.addListener(onChangeListener);
                  } else {
                    // was moved along bmb
                    chrome.bookmarks.onChanged.addListener(onChangeListener);
                  }
                });
              }
            }
          } else {
            // item wasnt found in bmb and moved to a folder/subfolder from bmb, update/show its title
            for (let j = 0; j < userBookmarks.userBookmarks[0].children.length; j++) {
              if (userBookmarks.userBookmarks[0].children[j].id == movedbmid) {
                chrome.bookmarks.update(movedbmid.toString(), { title: userBookmarks.userBookmarks[0].children[j].title });
                chrome.bookmarks.onChanged.addListener(onChangeListener);
              }
            }
          }
        })
      });
    }
  });
});
