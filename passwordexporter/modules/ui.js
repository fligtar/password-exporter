/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 **/

var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("chrome://pwdex-modules/content/common.js");

PwdEx.UI = {
  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger = PwdEx.getLogger("PwdEx.UI");
    this._logger.debug("init");
  },

  /**
   * Adds the password exporter button to the Thunderbird preferences panel.
   * @param aDocument the document to insert the button to.
   */
  addTBButton : function(aDocument) {
    this._logger.debug("addTBButton");

    if (null != aDocument.getElementById("securityPrefs")) {
      let container =
        aDocument.getElementById("securityPrefs").getElementsByTagName("tabpanel")[3].
          getElementsByTagName("hbox")[0];

      if (null != container) {
        container.appendChild(this._createPwdExButton(aDocument));
      } else {
        this._logger.error("addTBButton. Container for button not found.");
      }
    } else {
      this._logger.debug(
        "addTBButton. Security pane not showing; listener added.");

      let secPane = aDocument.getElementById("paneSecurity");
      let that = this;

      secPane.addEventListener(
        "paneload",  function(e) { that.addTBButton(aDocument); }, false);
    }
  },

  /**
   * Remove the password exporter button from the Thunderbird preferences panel.
   * @param aDocument the document to remove the button from.
   */
  removeTBButton : function(aDocument) {
    this._logger.debug("removeTBButton");

    let button = aDocument.getElementById("pwdex-button");

    if (null != button) {
      button.parentNode.removeChild(button);
    }
  },

  /**
   * Opens the password exporter window.
   * @param aWindow the parent window.
   */
  openPwdExWindow : function(aWindow) {
    this._logger.debug("openPwdExWindow");

    pwdexDiag =
      aWindow.openDialog(
        "chrome://passwordexporter/content/pwdexDialog.xul", "",
        "chrome,resizable,centerscreen,close=no,modal");
  },

  /**
   * Create the password exporter button node.
   * @param aDocument the document the create the node in.
   * @return the node corresponding to the button.
   */
  _createPwdExButton : function(aDocument) {
    this._logger.trace("_createPwdExButton");

    let that = this;
    let button = aDocument.createElement("button");

    button.setAttribute("id", "pwdex-button");
    button.setAttribute(
      "label",
      PwdEx.stringBundle.GetStringFromName("passwordexporter.button-label"));
    button.setAttribute(
      "accesskey",
      PwdEx.stringBundle.GetStringFromName("passwordexporter.button-accesskey"));
    button.addEventListener(
      "command",  function(e) { that.openPwdExWindow(aDocument.defaultView); },
      false);

    return button;
  }
};

/**
 * Constructor.
 */
(function() {
  this.init();
}).apply(PwdEx.UI);
