/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 **/

var EXPORTED_SYMBOLS = [ "PwdEx" ];

const Cc = Components.classes;
const Ci = Components.interfaces;

var logLoaded = true;

try {
  Components.utils.import("resource://gre/modules/services-common/log4moz.js");
} catch (e) {
  // certain Mozilla-based applications don't have /services-common/, so let's
  // just skip logging there.
  logLoaded = false;
}

Components.utils.import("resource://gre/modules/Services.jsm");

/**
 * PwdEx namespace.
 */
if ("undefined" == typeof(PwdEx)) {
  var PwdEx = {
    /**
     * Initialize this object.
     */
    init : function() {
      if (logLoaded) {
        // Setup logging. See http://wiki.mozilla.org/Labs/JS_Modules.
        // The basic formatter will output lines like:
        // DATE/TIME  LoggerName LEVEL  (log message)
        let formatter = new Log4Moz.BasicFormatter();
        let appender;

        this._logger = Log4Moz.repository.getLogger("PwdEx");

        let logFile = this.getDirectory();

        logFile.append("log.txt");
        // this appender will log to the file system.
        if (null != Log4Moz.BoundedFileAppender) {
          appender = new Log4Moz.BoundedFileAppender(logFile.path, formatter);
        } else {
          appender = new Log4Moz.RotatingFileAppender(logFile, formatter);
        }

        this._logger.level = Log4Moz.Level["All"];
        appender.level = Log4Moz.Level["Warn"]; // change this to adjust level.
        this._logger.addAppender(appender);
      } else {
        this._logger =
          { error : function() {}, warn : function() {}, debug : function() {},
            trace : function() {}, info : function() {} };
      }

      this.stringBundle =
        Services.strings.createBundle(
          "chrome://passwordexporter/locale/passwordexporter.properties");
    },

    /**
     * Creates a logger for other objects to use.
     * @param aName the name of the logger to create.
     * @param aLevel (optional) the logger level.
     * @return the created logger.
     */
    getLogger : function(aName, aLevel) {
      let logger;

      if (logLoaded) {
        logger = Log4Moz.repository.getLogger(aName);

        logger.level = Log4Moz.Level[(aLevel ? aLevel : "All")];
        logger.parent = this._logger;
      } else {
        logger =
          { error : function() {}, warn : function() {}, debug : function() {},
            trace : function() {}, info : function() {} };
      }

      return logger;
    },

    /**
     * Gets a reference to the directory where this add-on will keep its files.
     * The directory is created if it doesn't exist.
     * @return reference (nsIFile) to the directory.
     */
    getDirectory : function() {
      Components.utils.import("resource://gre/modules/FileUtils.jsm");

      return FileUtils.getDir("ProfD", [ "PasswordExporter" ], true);
    }
  };

  /**
   * Constructor.
   */
  (function() {
    this.init();
  }).apply(PwdEx);
}
