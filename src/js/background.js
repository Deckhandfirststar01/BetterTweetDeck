import * as BHelper from './util/browserHelper';
import * as Log from './util/logger';
import { defaultsDeep } from 'lodash';

const defaultSettings = {
  installed_date: new Date().getTime(),
  installed_version: BHelper.getVersion(),
  ts: 'relative',
  custom_ts: {
    short: '',
    full: '',
  },
  full_aft_24: true,
  nm_disp: 'inverted',
  no_hearts: false,
  no_tco: true,
  flash_tweets: {
    mode: 'mentions',
    enabled: true,
  },
  rtl_text_style: true,
  stop_gifs: true,
  no_gif_pp: true,
  css: {
    round_pic: true,
    bigger_emojis: true,
    no_col_icns: false,
    gray_icns_notifs: false,
    minimal_mode: false,
    small_icns_compose: true,
    usrname_only_typeahead: true,
    hide_context: false,
    no_scrollbars: false,
    slim_scrollbars: false,
    show_verified: true,
    actions_on_right: true,
    actions_on_hover: true,
    hide_url_thumb: true,
    no_bg_modal: true,
  },
  share_item: {
    enabled: true,
    short_txt: false,
  },
  thumbnails: {},
};

function openChangelogPage() {
  chrome.tabs.create({
    url: 'options/options.html?on=update',
  });
}

function openWelcomePage() {
  chrome.tabs.create({
    url: 'options/options.html?on=install',
  });
}

function contextMenuHandler(info, tab, settings) {
  const urlToShare = info.linkUrl || info.srcUrl || info.pageUrl;
  let textToShare = info.selectionText || tab.title;

  if (settings.share_item.short_txt) {
    textToShare = textToShare.substr(0, 110);
  }

  /**
   * We query a tab with TweetDeck opened in it
   */
  BHelper.browserObject.tabs.query({
    url: '*://tweetdeck.twitter.com/*',
  }, (tabs) => {
    if (tabs.length === 0) {
      return;
    }

    const TDTab = tabs[0];

    /**
     * We take the first tab we find, focus/select it and send a message to it
     */
    BHelper.browserObject.windows.update(TDTab.windowId, {
      focused: true,
    }, () => {
      BHelper.browserObject.tabs.update(TDTab.id, {
        selected: true,
        active: true,
        highlighted: true,
      }, () => {
        BHelper.browserObject.tabs.sendMessage(TDTab.id, {
          text: textToShare,
          url: urlToShare,
        });
      });
    });
  });
}

BHelper.settings.getAll(settings => {
  let curSettings = settings;

  if (curSettings.BTDSettings) {
    const cleanedSettings = Object.assign({}, curSettings.BTDSettings);
    curSettings = cleanedSettings;
    chrome.storage.sync.clear();
  }

  BHelper.settings.set(defaultsDeep(curSettings, defaultSettings), (newSettings) => {
    Log.debug(newSettings);
    if (!newSettings.installed_date) {
      openWelcomePage();
      BHelper.settings.set({ installed_date: new Date().getTime() });
    }

    const oldVersion = (curSettings.installed_version || '').replace(/\./g, '');
    const newVersion = BHelper.getVersion().replace(/\./g, '');

    BHelper.settings.set({ installed_version: BHelper.getVersion() });

    if (!oldVersion || Number(oldVersion) < Number(newVersion)) {
      chrome.notifications.create({
        type: 'basic',
        title: BHelper.getMessage('notification_title'),
        message: BHelper.getUpgradeMessage(),
        iconUrl: 'icons/notif-icon.png',
      }, () => {
        chrome.notifications.onClicked.addListener(openChangelogPage);
      });
    }

    // We create the context menu item
    if (newSettings.share_item && newSettings.share_item.enabled) {
      BHelper.browserObject.contextMenus.create({
        title: BHelper.getMessage('shareOnTD'),
        contexts: ['page', 'selection', 'image', 'link'],
        onclick: (info, tab) => contextMenuHandler(info, tab, newSettings),
      });
    }
  });
});
