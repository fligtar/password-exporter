/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Justin Dolske <dolske@mozilla.com> (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// http://mxr.mozilla.org/mozilla/source/toolkit/components/passwordmgr/src/storage-Legacy.js

/**
 * Changes:
 *  log() -> passwordExporter.debug()
 *  this.log -> passwordExporter.debug()
 * extraLogin encryption
 */

var passwordExporterStorageLegacy = {
    
     __ioService: null, // IO service for string -> nsIURI conversion
    get _ioService() {
        if (!this.__ioService)
            this.__ioService = Components.classes["@mozilla.org/network/io-service;1"].
                               getService(Components.interfaces.nsIIOService);
        return this.__ioService;
    },
    
    __decoderRing : null,  // nsSecretDecoderRing service
    get _decoderRing() {
        if (!this.__decoderRing)
            this.__decoderRing = Components.classes["@mozilla.org/security/sdr;1"].
                                 getService(Components.interfaces.nsISecretDecoderRing);
        return this.__decoderRing;
    },
    
    /*
     * _upgrade_entry_to_2E
     *
     * Updates the format of an entry from 2D to 2E. Returns an array of
     * logins (1 or 2), as sometimes updating an entry requires creating an
     * extra login.
     */
    _upgrade_entry_to_2E : function (aLogin) {
        var upgradedLogins = [aLogin];

        /*
         * For logins stored from HTTP channels
         *    - scheme needs to be derived and prepended
         *    - blank or missing realm becomes same as hostname.
         *
         *  "site.com:80"  --> "http://site.com"
         *  "site.com:443" --> "https://site.com"
         *  "site.com:123" --> Who knows! (So add both)
         *
         * Note: For HTTP logins, the hostname never contained a username
         *       or password. EG "user@site.com:80" shouldn't ever happen.
         *
         * Note: Proxy logins are also stored in this format.
         */
        if (aLogin.hostname.indexOf("://") == -1) {
            var oldHost = aLogin.hostname;

            // Parse out "host:port".
            try {
                // Small hack: Need a scheme for nsIURI, so just prepend http.
                // We'll check for a port == -1 in case nsIURI ever starts
                // noticing that "http://foo:80" is using the default port.
                var uri = this._ioService.newURI("http://" + aLogin.hostname,
                                                 null, null);
                var host = uri.host;
                var port = uri.port;
            } catch (e) {
                passwordExporter.debug("2E upgrade: Can't parse hostname " + aLogin.hostname);
                return upgradedLogins;
            }

            if (port == 80 || port == -1)
                aLogin.hostname = "http://" + host;
            else if (port == 443)
                aLogin.hostname = "https://" + host;
            else {
                // Not a standard port! Could be either http or https!
                // (Or maybe it's a proxy login!) To try and avoid
                // breaking logins, we'll add *both* http and https
                // versions.
                passwordExporter.debug("2E upgrade: Cloning login for " + aLogin.hostname);

                aLogin.hostname = "http://" + host + ":" + port;

                var extraLogin = Components.classes["@mozilla.org/login-manager/loginInfo;1"].
                                 createInstance(Components.interfaces.nsILoginInfo);
                /*extraLogin.init("https://" + host + ":" + port,
                                null, aLogin.httpRealm,
                                null, null, "", "");
                // We don't have decrypted values, so clone the encrypted
                // bits into the new entry.
                extraLogin.wrappedJSObject.encryptedPassword = 
                    aLogin.wrappedJSObject.encryptedPassword;
                extraLogin.wrappedJSObject.encryptedUsername = 
                    aLogin.wrappedJSObject.encryptedUsername;*/
                extraLogin.init("https://" + host + ":" + port,
                                null, aLogin.httpRealm,
                                aLogin.username, aLogin.password, "", "");

                if (extraLogin.httpRealm == "")
                    extraLogin.httpRealm = extraLogin.hostname;
                
                upgradedLogins.push(extraLogin);
            }

            // If the server didn't send a realm (or it was blank), we
            // previously didn't store anything.
            if (aLogin.httpRealm == "")
                aLogin.httpRealm = aLogin.hostname;

            passwordExporter.debug("2E upgrade: " + oldHost + " ---> " + aLogin.hostname);

            return upgradedLogins;
        }


        /*
         * For form logins and non-HTTP channel logins (both were stored in
         * the same format):
         *
         * Standardize URLs (.hostname and .actionURL)
         *    - remove default port numbers, if specified
         *      "http://site.com:80"  --> "http://site.com"
         *    - remove usernames from URL (may move into aLogin.username)
         *      "ftp://user@site.com" --> "ftp://site.com"
         *
         * Note: Passwords in the URL ("foo://user:pass@site.com") were not
         *       stored in FF2, so no need to try to move the value into
         *       aLogin.password.
         */

        // closures in cleanupURL
        var ioService = this._ioService;
        var log = this.log;

        function cleanupURL(aURL) {
            var newURL, username = null;

            try {
                var uri = ioService.newURI(aURL, null, null);

                var scheme = uri.scheme;
                newURL = scheme + "://" + uri.host;

                // If the URL explicitly specified a port, only include it when
                // it's not the default. (We never want "http://foo.com:80")
                port = uri.port;
                if (port != -1) {
                    var handler = ioService.getProtocolHandler(scheme);
                    if (port != handler.defaultPort)
                        newURL += ":" + port;
                }

                // Could be a channel login with a username. 
                if (scheme != "http" && scheme != "https" && uri.username)
                    username = uri.username;
                
            } catch (e) {
                passwordExporter.debug("Can't cleanup URL: " + aURL);
                newURL = aURL;
            }

            if (newURL != aURL)
                passwordExporter.debug("2E upgrade: " + aURL + " ---> " + newURL);

            return [newURL, username];
        }

        var isFormLogin = (aLogin.formSubmitURL ||
                           aLogin.usernameField ||
                           aLogin.passwordField);

        var [hostname, username] = cleanupURL(aLogin.hostname);
        aLogin.hostname = hostname;

        // If a non-HTTP URL contained a username, it wasn't stored in the
        // encrypted username field (which contains an encrypted empty value)
        // (Don't do this if it's a form login, though.)
        if (username && !isFormLogin) {
            var [encUsername, userCanceled] = this._encrypt(username);
            if (!userCanceled)
                aLogin.wrappedJSObject.encryptedUsername = encUsername;
        }


        if (aLogin.formSubmitURL) {
            [hostname, username] = cleanupURL(aLogin.formSubmitURL);
            aLogin.formSubmitURL = hostname;
            // username, if any, ignored.
        }


        /*
         * For logins stored from non-HTTP channels
         *    - Set httpRealm so they don't look like form logins
         *     "ftp://site.com" --> "ftp://site.com (ftp://site.com)"
         *
         * Tricky: Form logins and non-HTTP channel logins are stored in the
         * same format, and we don't want to add a realm to a form login.
         * Form logins have field names, so only update the realm if there are
         * no field names set. [Any login with a http[s]:// hostname is always
         * a form login, so explicitly ignore those just to be safe.]
         *
         * Bug 403790: mail entries (imap://, ldaps://, mailbox:// smtp:// have
         * fieldnames set to "\=username=\" and "\=password=\" (non-escaping
         * backslash). More work is needed to upgrade these properly.
         */
        const isHTTP = /^https?:\/\//;
        if (!isHTTP.test(aLogin.hostname) && !isFormLogin) {
            aLogin.httpRealm = aLogin.hostname;
            aLogin.formSubmitURL = null;
            passwordExporter.debug("2E upgrade: set empty realm to " + aLogin.httpRealm);
        }

        return upgradedLogins;
    },

    /*
     * _encrypt
     *
     * Encrypts the specified string, using the SecretDecoderRing.
     *
     * Returns [cipherText, userCanceled] where:
     *  cipherText   -- the encrypted string, or null if it failed.
     *  userCanceled -- if the encryption failed, this is true if the
     *                  user selected Cancel when prompted to enter their
     *                  Master Password. The caller should bail out, and not
     *                  not request that more things be encrypted (which 
     *                  results in prompting the user for a Master Password
     *                  over and over.)
     */
    _encrypt : function (plainText) {
        var cipherText = null, userCanceled = false;

        try {
            var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                            createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
            converter.charset = "UTF-8";
            var plainOctet = converter.ConvertFromUnicode(plainText);
            plainOctet += converter.Finish();
            cipherText = this._decoderRing.encryptString(plainOctet);
        } catch (e) {
            this.passwordExporter.debug("Failed to encrypt string. (" + e.name + ")");
            // If the user clicks Cancel, we get NS_ERROR_FAILURE.
            // (unlike decrypting, which gets NS_ERROR_NOT_AVAILABLE).
            if (e.result == Components.results.NS_ERROR_FAILURE)
                userCanceled = true;
        }

        return [cipherText, userCanceled];
    }
};