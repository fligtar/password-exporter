/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 **/

"use strict";

var PWDEX_RE_PREFS = /^about:preferences(?:\#.*)?$/i;

let PwdExScript = {
  _lastButton : null,
  /**
   * Runs the content script on this page.
   * @param aEvent the load event fired from the page.
   */
  run : function(aEvent) {
    let doc = aEvent.originalTarget;

    // do a quick domain test to filter out pages were aren't interested in.
    if ((null != doc) && (null != doc.location) &&
        (null != doc.location.href) && PWDEX_RE_PREFS.test(doc.location.href)) {
      Components.utils.import("chrome://pwdex-modules/content/common.js");
      Components.utils.import("chrome://pwdex-modules/content/ui.js");
      this._lastButton = PwdEx.UI.addFxButton(doc);
    }
  }
};

let PwdExListener = function(aEvent) { PwdExScript.run(aEvent); };

addEventListener("load", PwdExListener, true);

addMessageListener(
  "PwdEx:unload",
  function(aMessage) {
    if (aMessage.data == Components.stack.filename) {
      removeEventListener("load", PwdExListener, true);

      if (null != PwdExScript._lastButton) {
        PwdExScript._lastButton.parentNode.removeChild(PwdExScript._lastButton);
      }
    }
  });
