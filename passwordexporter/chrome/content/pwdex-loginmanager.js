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
 * The Original Code is Password Exporter
 *
 * The Initial Developer of the Original Code is
 *    Justin Scott <fligtar@gmail.com>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): (none)
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

/**
 * Password Exporter - Login Manager support
 * This file is for use with the new login manager in Firefox 3
 */

var passwordExporterLoginMgr = {
    export: {
        currentExport: '', // CSV or XML string of current export
        count: 0, // count of exported logins
        errorCount: 0, // count of failed logins
        failed: '', // failed hosts
        
        // starts export of saved passwords to XML/CSV file
        start: function() {
            passwordExporter.debug('Starting Export...');
            
            // Check if user has accepted agreement
            passwordExporter.checkAgreement();
            
            if (passwordExporter.accepted == true) {
                var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
                var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
                
                // Prompt user to select where to save the export
                fp.init(window, passwordExporter.bundle.GetStringFromName('passwordexporter.filepicker-title'), fp.modeSave);
                var date = new Date();
                fp.defaultString = 'password-export-' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
                fp.defaultExtension = '.xml';
                fp.appendFilter(passwordExporter.bundle.GetStringFromName('passwordexporter.filepicker-save-xml'), '*.xml');
                fp.appendFilter(passwordExporter.bundle.GetStringFromName('passwordexporter.filepicker-save-csv'), '*.csv');
                
                // If cancelled, return
                if (fp.show() == fp.returnCancel)
                    return;
                
                // Remove file if it exists
                if (fp.file.exists())
                    fp.file.remove(true);
                
                fp.file.create(fp.file.NORMAL_FILE_TYPE, 0666);
                stream.init(fp.file, 0x02, 0x200, null);
                
                // Whether to encrypt the passwords
                var encrypt = document.getElementById('pwdex-encrypt').checked;
                
                // do export
                if (fp.filterIndex == 0)
                    var content = this.export('xml', encrypt);
                else if (fp.filterIndex == 1)
                    var content = this.export('csv', encrypt);
                
                stream.write(content, content.length);
                stream.close();
                
                passwordExporter.debug('Export of ' + this.count + ' entries completed with ' + this.errorCount + ' errors.');
                
                if (this.errorCount == 0)
                    alert(passwordExporter.bundle.formatStringFromName('passwordexporter.alert-passwords-exported', [this.count], 1));
                else {
                    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
                    
                    var flags = promptService.BUTTON_TITLE_OK * promptService.BUTTON_POS_0 +
                    promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1;
                    
                    var response = promptService.confirmEx(window, passwordExporter.bundle.GetStringFromName('passwordexporter.name'),
                                    passwordExporter.bundle.formatStringFromName('passwordexporter.alert-passwords-exported', [this.count], 1) + "\n\n" +
                                    passwordExporter.bundle.formatStringFromName('passwordexporter.alert-passwords-failed', [this.errorCount], 1), flags,
                                    null, passwordExporter.bundle.GetStringFromName('passwordexporter.show-details'), null, null, {});
                    
                    if (response == 1)
                        window.openDialog("chrome://passwordexporter/content/pwdex-details-export.xul", "","chrome,resizable,centerscreen,close=no,modal");
                }
            }
        },
	
        // Generates XML/CSV from Login Manager entries
        export: function(type, encrypt) {
            passwordExporter.debug('Generating ' + type + ' entries...');
            if (type == 'xml') {
                this.currentExport = '<xml>' + passwordExporter.linebreak;
                this.currentExport += '<entries ext="Password Exporter" extxmlversion="1.1" type="saved" encrypt="' + encrypt + '">' + passwordExporter.linebreak;
            }
            else if (type == 'csv') {
                this.currentExport = '# Generated by Password Exporter; Export format 1.1; Encrypted: ' + encrypt + passwordExporter.linebreak;
                this.currentExport += '"hostname","username","password","formSubmitURL","httpRealm","usernameField","passwordField"' + passwordExporter.linebreak;
            }
            
            this.count = 0;
            this.errorCount = 0;
            passwordExporter.failed = '';
            
            var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
            var logins = loginManager.getAllLogins({});
            
            for (var i = 0; i < logins.length; i++) {
                if (type == 'xml') {
                    this.entryToXML(logins[i].hostname, logins[i].formSubmitURL, logins[i].httpRealm, logins[i].username,
                               logins[i].usernameField, logins[i].password, logins[i].passwordField, encrypt);
                }
                else if (type == 'csv') {
                    this.entryToCSV(logins[i].hostname, logins[i].formSubmitURL, logins[i].httpRealm, logins[i].username,
                               logins[i].usernameField, logins[i].password, logins[i].passwordField, encrypt);
                }
            }
            
            if (type == 'xml') {
                this.currentExport += '</entries>' + passwordExporter.linebreak + '</xml>';
            }
            
            return this.currentExport;
        },
        
        // Records an nsILoginInfo entry to XML
        entryToXML: function(hostname, formSubmitURL, httpRealm, username, usernameField,
                            password, passwordField, encrypt) {
            if (encrypt) {
                username = btoa(username);
                password = btoa(password);
            }
            
            try {
                var xml  = '<entry';
                xml += ' host="' + this.escapeQuote(hostname) + '"';
                xml += ' user="' + this.escapeQuote(username) + '"';
                xml += ' password="' + this.escapeQuote(password) + '"';
                
                xml += ' formSubmitURL="' + (formSubmitURL ? this.escapeQuote(formSubmitURL) : '') + '"';
                xml += ' httpRealm="' + (httpRealm ? this.escapeQuote(httpRealm) : '') + '"';
                xml += ' userFieldName="' + (usernameField ? this.escapeQuote(usernameField) : '') + '"';
                xml += ' passFieldName="' + (passwordField ? this.escapeQuote(passwordField) : '') + '"';
                
                xml += '/>' + passwordExporter.linebreak;
                
                this.currentExport += xml;
                this.count++;
            } catch (e) {
                this.errorCount++;
                try {
                    this.failed += hostname + passwordExporter.linebreak;
                } catch (e) { }
            }
        },
        
        // Records an nsILoginInfo entry to CSV
        entryToCSV: function(hostname, formSubmitURL, httpRealm, username, usernameField,
                            password, passwordField, encrypt) {
            if (encrypt) {
                username = btoa(username);
                password = btoa(password);
            }
            
            try {
                var csv = '"' + this.escapeQuote(hostname) + '",';
                csv += '"' + this.escapeQuote(username) + '",';
                csv += '"' + this.escapeQuote(password) + '",';
                
                csv += '"' + (formSubmitURL ? this.escapeQuote(formSubmitURL) : '') + '",';
                csv += '"' + (httpRealm ? this.escapeQuote(httpRealm) : '') + '",';
                csv += '"' + (usernameField ? this.escapeQuote(usernameField) : '') + '",';
                csv += '"' + (passwordField ? this.escapeQuote(passwordField) : '')+ '"';
                
                csv += passwordExporter.linebreak;
                
                this.currentExport += csv;
                this.count++;
            } catch (e) {
                this.errorCount++;
                try {
                    this.failed += hostname + passwordExporter.linebreak;
                } catch (e) { }
            }
        },
        
        // escapes only quotes and ampersands so that it will parse correctly in XML
        escapeQuote: function(string) {
            string = string.replace(/"/gi, '%22');
            string = string.replace(/&/gi, '%26');
            return string;
        },
        
        // populate details textbox with failed entries
        populateFailed: function(textbox) {
            textbox.value = this.failed;
        },
        
        disabled: {
            // starts export of login disabled sites that never saved passwords
            start: function() {
                passwordExporter.debug('Starting Disabled Hosts Export...');
                var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
                var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
                
                fp.init(window, passwordExporter.bundle.GetStringFromName('passwordexporter.filepicker-title'), fp.modeSave);
                var date = new Date();
                fp.defaultString = 'disabled-export-' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
                fp.defaultExtension = '.xml';
                fp.appendFilters(fp.filterXML);
                
                // If cancelled, return
                if (fp.show() == fp.returnCancel)
                    return;
                
                if (fp.file.exists())
                    fp.file.remove(true);
                
                fp.file.create(fp.file.NORMAL_FILE_TYPE, 0666);
                stream.init(fp.file, 0x02, 0x200, null);
                
                var xml = this.export();
                
                stream.write(xml, xml.length);
                stream.close();
                
                passwordExporter.debug('Disabled hosts export complete.');
                
                alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-rejected-exported'));
            },
            
            // Gets disabled hosts from Login Manager
            export: function() {
                var xml = '<xml>' + passwordExporter.linebreak;
                xml += '<entries ext="Password Exporter" extxmlversion="1.0.2" type="rejected">' + passwordExporter.linebreak;
                
                var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
                var disabledHosts = loginManager.getAllDisabledHosts({});
                
                for (var i = 0; i < disabledHosts.length; i++) {
                    xml += '<entry host="' + disabledHosts[i] + '"/>' + passwordExporter.linebreak;
                }
                
                xml += '</entries>' + passwordExporter.linebreak + '</xml>';
                
                return xml;
            }
        }
	
    },
    
    import: {
        totalCount: 0, // total number of logins
        currentCount: 0, // number of logins currently imported
        cancelled: false, // whether the operation was cancelled
        failed: '', // list of failed hosts
        
        // Starts the import of logins from a CSV or XML file
        start: function() {
            passwordExporter.debug('Starting Import...');
            
            var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
            var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
            var streamIO = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
            var input, inputArray, importType, doc, header, name, type, version, encrypt;
            
            fp.init(window, passwordExporter.bundle.GetStringFromName('passwordexporter.filepicker-title'), fp.modeOpen);
            fp.appendFilter(passwordExporter.bundle.GetStringFromName('passwordexporter.filepicker-open-xmlcsv'), '*.xml; *.csv; *');
            
            // If cancelled, return
            if (fp.show() == fp.returnCancel)
                return;
            
            stream.init(fp.file, 0x01, 0444, null);
            streamIO.init(stream);
            input = streamIO.read(stream.available());
            streamIO.close();
            stream.close();
            
            var parser = new DOMParser();
            
            // If CSV format, parse for header info
            if (fp.file.path.indexOf('.csv') != -1) {
                // Starting in 1.1, header is in a "comment" at the top
                var header = /# Generated by (.+); Export format (.{3,6}); Encrypted: (true|false)/i.exec(input);
                if (!header) {
                    // Previously, the header was in CSV form in the first line
                    header = /(.+?),(.{3,6}),(true|false)/i.exec(input);
                }
                if (!header) {
                    // If we still can't read header, there's a problem with the file
                    alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-cannot-import'));
                    return;
                }
                var properties = {'extension': header[1],
                                  'importtype': 'saved',
                                  'importversion': header[2],
                                  'encrypt': header[3]};
                this.import('csv', properties, input);
            }
            // If XML format, parse for header info
            else {
                var doc = parser.parseFromString(input, "text/xml");
                var header = doc.documentElement.getElementsByTagName('entries')[0];
                
                if (doc.documentElement.nodeName == 'parsererror') {
                    alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-xml-error'));
                    return;
                }
                
                var properties = {'extension': header.getAttribute('ext'),
                                  'importtype': header.getAttribute('type'),
                                  'importversion': header.getAttribute('extxmlversion'),
                                  'encrypt': header.getAttribute('encrypt')};
                var entries = doc.documentElement.getElementsByTagName('entry');
                this.import('xml', properties, entries);
            }
        },
        
        // Validates import file and parses it
        import: function (type, properties, entries) {
            passwordExporter.debug(type + ' file read...');
            
            // Make sure this is a Password Exporter export
            if (properties.extension != 'Password Exporter') {
                alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-cannot-import'));
                return;
            }
            
            // Make sure this is a saved passwords file, as opposed to disabled hosts
            if (properties.importtype != 'saved') {
                alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-wrong-file-reject'));
                return;
            }
            
            // Make sure this was exported from a version supported (not a future version)
            if (properties.importversion in {'1.0.2':'', '1.0.4':'', '1.1':''}) {
                // Import
                var logins = [];
                this.totalCount = 0;
                this.currentCount = 0;
                
                passwordExporter.disableAllButtons();
                document.getElementById('pwdex-import-finished').hidden = true;
                document.getElementById('pwdex-import-view-details').hidden = true;
                document.getElementById('pwdex-import-complete').hidden = true;
                document.getElementById('pwdex-import-cancelled').hidden = true;
                document.getElementById('pwdex-import-status').value = '';
                document.getElementById('pwdex-import-underway').hidden = false;
                document.getElementById('pwdex-import-cancel').hidden = false;
                
                var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
                var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                         Components.interfaces.nsILoginInfo, "init");
                if (type == 'xml') {
                    this.totalCount = entries.length;
                    
                    for (var i = 0; i < entries.length; i++) {
                        var loginInfo = new nsLoginInfo(
                                                (entries[i].getAttribute('host') == null ? null : unescape(entries[i].getAttribute('host'))),
                                                (entries[i].getAttribute('formSubmitURL') == null ? "" : unescape(entries[i].getAttribute('formSubmitURL'))),
                                                ((entries[i].getAttribute('httpRealm') == null || entries[i].getAttribute('httpRealm') == "") ? null : unescape(entries[i].getAttribute('httpRealm'))),
                                                unescape(entries[i].getAttribute('user')),
                                                unescape(entries[i].getAttribute('password')),
                                                (entries[i].getAttribute('userFieldName') == null ? null : unescape(entries[i].getAttribute('userFieldName'))),
                                                (entries[i].getAttribute('passFieldName') == null ? null : unescape(entries[i].getAttribute('passFieldName')))
                                            );
                        
                        var formattedLogins = this.getFormattedLogin(properties, loginInfo);
                        for each (var login in formattedLogins) {
                            logins.push(login);
                        }
                    }
                }
                else if (type == 'csv') {
                    if (/\r\n/i.test(entries))
                        var entryArray = entries.split("\r\n");
                    else if (/\r/i.test(entries))
                        var entryArray = entries.split("\r");
                    else
                        var entryArray = entries.split("\n");
                    
                    // Prior to version 1.1, we only had one line of header
                    // After 1.1, there was a header comment and a labels line
                    if (properties.importversion == '1.0.2' || properties.importversion == '1.0.4')
                        var start = 1;
                    else
                        var start = 2;
                    
                    for (var i = start; i < (entryArray.length - 1); i++) {
                        if (properties.importversion == '1.0.2' || properties.importversion == '1.0.4') {
                            // Before version 1.1, csv didn't have quotes
                            var fields = entryArray[i].split(',');
                            
                            var loginInfo = new nsLoginInfo(
                                                    (fields[0] == '' ? null : unescape(fields[0])),
                                                    "", // formSubmitURL
                                                    null, // httpRealm
                                                    unescape(fields[1]), // username
                                                    unescape(fields[2]), // password
                                                    (fields[3] == '' ? null : unescape(fields[3])), // usernameField
                                                    (fields[4] == '' ? null : unescape(fields[4])) // passwordField
                                                );
                        }
                        else {
                            // Version 1.1 CSV has quotes and 2 new fields
                            var fields = entryArray[i].split('","');
                            
                            var loginInfo = new nsLoginInfo(
                                                    (fields[0] == '"' ? null : unescape(fields[0].replace('"', ''))), // hostname
                                                    (fields[3] == '' ? "" : unescape(fields[3])), // formSubmitURL
                                                    (fields[4] == '' ? null : unescape(fields[4])), // httpRealm
                                                    unescape(fields[1]), // username
                                                    unescape(fields[2]), // password
                                                    (fields[5] == '' ? null : unescape(fields[5])), // usernameField
                                                    (fields[6] == '"' ? null : unescape(fields[6].replace('"', ''))) // passwordField
                                                );
                        }
                        
                        var formattedLogins = this.getFormattedLogin(properties, loginInfo);
                        for each (var login in formattedLogins) {
                            logins.push(login);
                        }
                    }
                }
                
                this.insertEntries(logins);
                
                // because of window timers, we can't put post-insert steps here
                // they are now located in passwordExporterLoginMgr.import.finished()
            }
            else
                alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-wrong-version'));
        },
        
        // Makes sure logins are formatted correctly for Firefox 3
        getFormattedLogin: function(properties, loginInfo) {
            passwordExporter.debug('pre-getFormattedLogin: [hostname: ' + loginInfo.hostname + ', httpRealm: ' + loginInfo.httpRealm + ', formSubmitURL: ' + loginInfo.formSubmitURL + ', usernameField: ' + loginInfo.usernameField + ', passwordField: ' + loginInfo.passwordField + ']');
            
            // in version 1.0.2, encryption was only for passwords... in 1.0.4 we encrypt usernames as well    
            if (properties.encrypt == 'true') {
                loginInfo.password = atob(loginInfo.password);
                
                if (properties.importversion != '1.0.2')
                    loginInfo.username = atob(loginInfo.username);
            }
            
            // No null usernames or passwords
            if (loginInfo.username == null)
                loginInfo.username = '';
            if (loginInfo.password == null)
                loginInfo.password = '';
                
            // If no httpRealm, check to see if it's in the hostname
            if (!loginInfo.httpRealm) {
                var hostnameParts = /(.*) \((.*)\)/.exec(loginInfo.hostname);
                if (hostnameParts) {
                    loginInfo.hostname = hostnameParts[1];
                    loginInfo.httpRealm = hostnameParts[2];
                }
            }
            
            // Convert to 2E (remove httpRealm from hostname, convert protocol logins, etc)
            loginInfo = passwordExporterStorageLegacy._upgrade_entry_to_2E(loginInfo);
            for each (var login in loginInfo) {
                if (login.httpRealm != null)
                    login.formSubmitURL = null;
                
                passwordExporter.debug('post-getFormattedLogin: [hostname: ' + login.hostname + ', httpRealm: ' + login.httpRealm + ', formSubmitURL: ' + login.formSubmitURL + ', usernameField: ' + login.usernameField + ', passwordField: ' + login.passwordField + ']');
            }
            
            return loginInfo;
        },
        
        // Starts the generator to insert the logins
        insertEntries: function(entries) {
            this.totalCount = entries.length;
            this.cancelled = false;
            this.failed = '';
            
            this.insertGenerator = this.doInsert(entries);
            window.setTimeout("passwordExporter.import.updateProgress()", 0);
        },
        
        // Updates the progress bar and iterates the generator
        updateProgress: function() {
            var i = this.insertGenerator.next();
            var percentage = Math.floor((this.currentCount / this.totalCount) * 100);
            document.getElementById('pwdex-import-progress').value = percentage;
            document.getElementById('pwdex-import-status').value = this.currentCount + '/' + this.totalCount;
            
            // If cancelled, don't add another timer
            if (this.cancelled) {
                passwordExporter.import.finished();
                return;
            }
            5
            // Add another timer if there are more logins
            if (i < this.totalCount)
                window.setTimeout("passwordExporter.import.updateProgress()", 0);
            else if (i == this.totalCount)
                passwordExporter.import.finished();
        },
        
        // Insert the new login into Login Manager
        doInsert: function(entries) {
            var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
            var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                         Components.interfaces.nsILoginInfo, "init");
            var i = 0;
            while (true) {
                yield i;
                passwordExporter.debug('Adding: [hostname: ' + entries[i].hostname + ', httpRealm: ' + entries[i].httpRealm + ', formSubmitURL: ' + entries[i].formSubmitURL + ', username: ' + entries[i].username + ', usernameField: ' + entries[i].usernameField + ', passwordField: ' + entries[i].passwordField + ']');
                
                /* Due to a Login Manager bug (https://bugzilla.mozilla.org/show_bug.cgi?id=407567)
                   we have to use a bogus formSubmitURL and modify it to be the real one, in case
                   it's blank. */
                
                var bogusLoginInfo = new nsLoginInfo(entries[i].hostname, 'http://passwordexporter',
                            entries[i].httpRealm, entries[i].username,
                            entries[i].password, entries[i].usernameField,
                            entries[i].passwordField);
                try {
                    // Add the login
                    loginManager.addLogin(bogusLoginInfo);
                    loginManager.modifyLogin(bogusLoginInfo, entries[i]);
                    
                    this.currentCount++;
                }
                catch (e) {
                    this.failed += entries[i].hostname + ' (' + e.message + ')' + passwordExporter.linebreak;
                }
                i++;
            }
        },
        
        // Cancel the import
        cancel: function() {
            this.cancelled = true;
        },
        
        // Update UI to reflect import completion or cancellation
        finished: function() {
            if (document.getElementById('tabbox')) {
                // Refresh the listbox of passwords only if we are using the tab... the dialog version does not need to
                LoadSignons();
            }
            document.getElementById('pwdex-import-cancel').hidden = true;
            document.getElementById('pwdex-import-finished').hidden = false;
            
            if (this.cancelled) {
                passwordExporter.debug('Import cancelled by user.');
                document.getElementById('pwdex-import-cancelled').hidden = false;
            }
            else {
                passwordExporter.debug('Import complete.');
                //alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-passwords-imported'));
                document.getElementById('pwdex-import-complete').hidden = false;
            }
            
            // If there were failed entries, show a details link
            if (this.failed != '')
                document.getElementById('pwdex-import-view-details').hidden = false;
            
            passwordExporter.enableAllButtons();
        },
        
        // Open the import details window
        showDetailsWindow: function() {
            window.openDialog("chrome://passwordexporter/content/pwdex-details-import.xul", "","chrome,resizable,centerscreen,close=no,modal");
        },
        
        // populate details textbox with failed entries
        populateFailed: function(textbox) {
            textbox.value = this.failed;
        },
        
        disabled: {
            // Starts import of disabled hosts from XML file
            start: function() {
                var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
                var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
                var streamIO = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
                var input;
                
                fp.init(window, passwordExporter.bundle.GetStringFromName('passwordexporter.filepicker-title'), fp.modeOpen);
                fp.appendFilter(passwordExporter.bundle.GetStringFromName('passwordexporter.filepicker-open-xml'), '*.xml; *');
                
                // If canceled, return
                if (fp.show() == fp.returnCancel)
                    return;
                
                stream.init(fp.file, 0x01, 0444, null);
                streamIO.init(stream);
                input = streamIO.read(stream.available());
                streamIO.close();
                stream.close();
                
                var parser = new DOMParser();
                var doc = parser.parseFromString(input, "text/xml");
                
                var header = doc.documentElement.getElementsByTagName('entries')[0];
                
                // Return if parser error or no header
                if (doc.documentElement.nodeName == 'parsererror' || !header) {
                    alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-xml-error'));
                    return;
                }
                
                // Return if not Password Exporter
                if (header.getAttribute('ext') != 'Password Exporter') {
                    alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-cannot-import'));
                    return;
                }
                
                // Make sure it's a disabled hosts file
                if (header.getAttribute('type') != 'rejected') {
                    alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-wrong-file-saved'));
                    return;
                }
                
                var entries = doc.documentElement.getElementsByTagName('entry');
                this.import(entries);
                
                if (document.getElementById('tabbox')) {
                    // Refresh the listbox of rejects only if we are using the tab... the dialog version does not need to
                    LoadRejects();
                }
                
                alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-rejected-imported'));
            },
            
            // Import disabled hosts
            import: function(entries) {
                var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
                
                for (var i = 0; i < entries.length; i++) {
                    loginManager.setLoginSavingEnabled(entries[i].getAttribute('host'), false);                    
                }
            }
        }
    }
};