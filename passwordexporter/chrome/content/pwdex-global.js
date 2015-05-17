/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The Initial Developer of the Original Code is
 *    Justin Scott <fligtar@gmail.com>.
 **/

/**
 * Password Exporter - Global
 * This file contains functions used by all flavors of Password Exporter
 */
var CC_loginManager = Components.classes["@mozilla.org/login-manager;1"];

var passwordExporter = {
    version: '1.1', // Incrementing requires new license acceptance
    bundle: null,
    appName: null,
    linebreak: null,
    accepted: false, // whether user has accepted this version's license
    dumpDebug: false, // whether debug message should be dumped to console
    initiated: false, // whether Password Exporter has been initiated yet

    export: null, // export functions specific to this app version
    import: null, // import functions specific to this app version

    // Called on load and on privacy pref tab load to create the tab overlay because the <tabs> we need doesn't have an ID
    init: function() {
        this.checkDebug();
        this.bundle = srGetStrBundle("chrome://passwordexporter/locale/passwordexporter.properties");
        this.linebreak = this.getLinebreak();
        this.appName = Application.name;

        this.debug('App: ' + this.appName);

        // Include import/export functions
        this.export = passwordExporterLoginMgr.export;
        this.import = passwordExporterLoginMgr.import;

        this.initiated = true;
    },

    // opens passwordmanager.xul to view passwords.. called from button on pwdexDialog.xul only
    viewPasswords: function() {
        // using window.open, doing certain things will cause firefox to minimize completely when the window is closed
        // hence using window.opener.open
        if (this.appName == 'SeaMonkey')
            window.opener.openDialog("chrome://communicator/content/passwordManager.xul", "", "chrome,resizable,centerscreen,maximize=no");
        else
            window.opener.open("chrome://passwordmgr/content/passwordManager.xul", "", "chrome,resizable,centerscreen,maximize=no");
    },

    // checks to see if user has accepted notice for this version and if not, shows window
    checkAgreement: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");

        if (prefs.getPrefType('extensions.passwordexporter.agreeVersion') == prefs.PREF_STRING) {
            if (this.version == prefs.getCharPref('extensions.passwordexporter.agreeVersion')) {
                this.accepted = true;
                return true;
            }
        }

        prefs = null;

        window.openDialog("chrome://passwordexporter/content/firstrunDialog.xul", "","chrome,resizable,centerscreen,close=no,modal");
        return false;
    },

    // write pref showing agreement to notice
    setAgreement: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");

        prefs.setCharPref('extensions.passwordexporter.agreeVersion', this.version);
        this.accepted = true;
    },

    // returns the linebreak for the system doing the exporting
    getLinebreak: function() {
        if (/win/i.test(navigator.platform))
            return '\r\n';
        else if (/mac/i.test(navigator.platform))
            return '\r';
        else
            return '\n';
    },

    // Disables all buttons during an import/export
    disableAllButtons: function() {
        document.getElementById('pwdex-import-btn').disabled = true;
        document.getElementById('pwdex-export-btn').disabled = true;
        document.getElementById('pwdex-import-never-btn').disabled = true;
        document.getElementById('pwdex-export-never-btn').disabled = true;
        document.getElementById('pwdex-encrypt').disabled = true;
        document.getElementById('pwdex-view-passwords').disabled = true;
        document.getElementById('pwdex-close').disabled = true;
    },

    // Re-enables all buttons
    enableAllButtons: function() {
        document.getElementById('pwdex-import-btn').disabled = false;
        document.getElementById('pwdex-export-btn').disabled = false;
        document.getElementById('pwdex-import-never-btn').disabled = false;
        document.getElementById('pwdex-export-never-btn').disabled = false;
        document.getElementById('pwdex-encrypt').disabled = false;
        document.getElementById('pwdex-view-passwords').disabled = false;
        document.getElementById('pwdex-close').disabled = false;
    },

    // returns current date in YYYY-MM-DD format for default file names
    getDateString: function() {
        var date = new Date();

        return date.getFullYear() + '-' + this.leadingZero(date.getMonth() + 1) + '-' + this.leadingZero(date.getDate());
    },

    // returns a number with leading zero
    leadingZero: function(number) {
        return (number < 10 ? '0' + number : number);
    },

    // checks preference for debug output
    checkDebug: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefService).getBranch("");

        if (prefs.getPrefType('extensions.passwordexporter.debug') == prefs.PREF_BOOL) {
            if (true == prefs.getBoolPref('extensions.passwordexporter.debug'))
                this.dumpDebug = true;
        }

        prefs = null;
    },

    // Dumps debug text if pref set
    debug: function(text) {
        if (this.dumpDebug)
            dump('Password Exporter ' + this.version + ': ' + text + "\n");
    }
};

window.addEventListener("load",  function(e) { if (!passwordExporter.initiated) passwordExporter.init(); }, false);
