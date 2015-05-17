/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 **/

"use strict";

const SCRIPT_URL = "chrome://pwdex-modules/content/frameScript.js";
const UNLOAD_MSG = "PwdEx:unload"
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
const MAIL_PREFS_TYPE = "Mail:Preferences";

const Cc = Components.classes;
const Ci = Components.interfaces;

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

function startup(aData, aReason) {
  PwdExBoot.init();
}

function shutdown(aData, aReason) {
  PwdExBoot.uninit();
}

let PwdExBoot = {
  _logger : null,
  _scriptURL : null,

  init : function() {
    Components.utils.import("resource://gre/modules/Services.jsm");
    Components.utils.import("chrome://pwdex-modules/content/common.js");
    Components.utils.import("chrome://pwdex-modules/content/ui.js");

    this._logger = PwdEx.getLogger("PwdExBoot");
    this._logger.debug("init");
    this.windowListener._logger = PwdEx.getLogger("PwdExBoot.windowListener");

    if (THUNDERBIRD_ID == Services.appinfo.ID) {
      let enumerator = Services.wm.getEnumerator(MAIL_PREFS_TYPE);

      while (enumerator.hasMoreElements()) {
        this.windowListener.addUI(enumerator.getNext());
      }

      Services.wm.addListener(this.windowListener);
    } else {
      let gmm =
        Cc["@mozilla.org/globalmessagemanager;1"].
          getService(Ci.nsIMessageListenerManager);

      this._scriptURL = SCRIPT_URL + "?" + Math.random();
      gmm.loadFrameScript(this._scriptURL, true);
    }
  },

  uninit : function() {
    this._logger.debug("uninit");

    if (THUNDERBIRD_ID == Services.appinfo.ID) {
      let enumerator = Services.wm.getEnumerator(MAIL_PREFS_TYPE);

      Services.wm.removeListener(this.windowListener);

      while (enumerator.hasMoreElements()) {
        this.windowListener.removeUI(enumerator.getNext());
      }
    } else {
      let gmm =
        Cc["@mozilla.org/globalmessagemanager;1"].
          getService(Ci.nsIMessageListenerManager);

      // prevent future tabs from loading the script.
      gmm.removeDelayedFrameScript(this._scriptURL);
      gmm.broadcastAsyncMessage(UNLOAD_MSG, this._scriptURL);
    }

    Components.utils.unload("chrome://pwdex-modules/content/ui.js");
    Components.utils.unload("chrome://pwdex-modules/content/common.js");
  },

  windowListener :
    {
      _logger : null,

      /**
       * Adds add-on UI elements to the window.
       */
      addUI : function(aWindow) {
        this._logger.debug("addUI");
        PwdEx.UI.addTBButton(aWindow.document);
      },

      /**
       * Removes all added UI elements.
       */
      removeUI : function(aWindow) {
        this._logger.debug("removeUI");
        PwdEx.UI.removeTBButton(aWindow.document);
      },

      onOpenWindow : function(xulWindow) {
        this._logger.debug("onOpenWindow");

        // A new window has opened.
        let that = this;
        let domWindow =
          xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).
          getInterface(Ci.nsIDOMWindow);

        // Wait for it to finish loading
        domWindow.addEventListener(
          "load",
          function listener() {
            domWindow.removeEventListener("load", listener, false);
            // If this is a preferences window then setup its UI
            if (domWindow.document.documentElement.getAttribute("windowtype") ==
                MAIL_PREFS_TYPE) {
              that.addUI(domWindow);
            }
        }, false);
      },

      onCloseWindow : function(xulwindow) {},
      onWindowTitleChange: function(xulWindow, newTitle) {}
    }
};
