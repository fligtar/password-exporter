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
 * Password Exporter - Password Manager support
 * This file is for use with the password manager in Firefox 1.5/2 and Thunderbird
 */

var passwordExporterPasswordMgr = {
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
                fp.defaultString = 'password-export-' + passwordExporter.getDateString();
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
	
        // Generates XML/CSV from Password/Login Manager entries
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
            
            var passwordManager = CC_passwordManager.createInstance();
            passwordManager.QueryInterface(Components.interfaces.nsIPasswordManager);
            passwordManager.QueryInterface(Components.interfaces.nsIPasswordManagerInternal);
            
            var nextPassword;
            var enumerator = passwordManager.enumerator;
            
            while (enumerator.hasMoreElements()) {
                if (Components.interfaces.nsIPasswordInternal)
                    nextPassword = enumerator.getNext().QueryInterface(Components.interfaces.nsIPasswordInternal);
                else
                    nextPassword = enumerator.getNext().QueryInterface(Components.interfaces.nsIPassword);
                
                if (nextPassword.formSubmitURL)
                    var formSubmitURL = nextPassword.formSubmitURL;
                else
                    var formSubmitURL = null;
                
                if (type == 'xml') {
                    this.entryToXML(nextPassword.host, formSubmitURL, null, nextPassword.user, nextPassword.userFieldName,
                                nextPassword.password, nextPassword.passwordFieldName, encrypt);
                }
                else if (type == 'csv') {
                    this.entryToCSV(nextPassword.host, formSubmitURL, null, nextPassword.user, nextPassword.userFieldName,
                                nextPassword.password, nextPassword.passwordFieldName, encrypt);
                }
            }
            
            if (type == 'xml') {
                this.currentExport += '</entries>' + passwordExporter.linebreak + '</xml>';
            }
            
            return this.currentExport;
        },
        
        // Records an nsILoginInfo or nsIPassword entry to XML
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
        
        // Records an nsILoginInfo or nsIPassword entry to CSV
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
                fp.defaultString = 'disabled-export-' + passwordExporter.getDateString();
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
            
            // Gets disabled hosts from Password/Login Manager
            export: function() {
                var xml = '<xml>' + passwordExporter.linebreak;
                xml += '<entries ext="Password Exporter" extxmlversion="1.0.2" type="rejected">' + passwordExporter.linebreak;
                
                var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance();
                passwordManager = passwordManager.QueryInterface(Components.interfaces.nsIPasswordManager);
                
                var enumerator = passwordManager.rejectEnumerator;
                var nextPassword;
                
                while (enumerator.hasMoreElements()) {
                    try {
                        nextPassword = enumerator.getNext();
                    } catch(e) {
                        break;
                    }
                    
                    nextPassword = nextPassword.QueryInterface(Components.interfaces.nsIPassword);
                    
                    xml += '<entry host="' + nextPassword.host + '"/>' + passwordExporter.linebreak;
                }
                
                xml += '</entries>' + passwordExporter.linebreak + '</xml>';
                
                return xml;
            }
        }
	
    },
    
    import: {
        totalCount: 0, // total number of logins
        currentCount: 0, // number of logins currently imported
        
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
                
                if (type == 'xml') {
                    this.totalCount = entries.length;
                    
                    for (var i = 0; i < entries.length; i++) {
                        var login = {
                            'username': unescape(entries[i].getAttribute('user')),
                            'password': unescape(entries[i].getAttribute('password')),
                            'hostname': (entries[i].getAttribute('host') == null ? null : unescape(entries[i].getAttribute('host'))),
                            'httpRealm': ((entries[i].getAttribute('httpRealm') == null || entries[i].getAttribute('httpRealm') == "") ? null : unescape(entries[i].getAttribute('httpRealm'))),
                            'formSubmitURL': (entries[i].getAttribute('formSubmitURL') == null ? "" : unescape(entries[i].getAttribute('formSubmitURL'))),
                            'usernameField': (entries[i].getAttribute('userFieldName') == null ? null : unescape(entries[i].getAttribute('userFieldName'))),
                            'passwordField': (entries[i].getAttribute('passFieldName') == null ? null : unescape(entries[i].getAttribute('passFieldName')))
                        };
                        
                        logins[i] = this.getFormattedLogin(properties, login);
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
                    
                    this.totalCount = entryArray.length - 1;
                    
                    for (var i = start; i < (entryArray.length - 1); i++) {
                        if (properties.importversion == '1.0.2' || properties.importversion == '1.0.4') {
                            // Before version 1.1, csv didn't have quotes
                            var fields = entryArray[i].split(',');
                            
                            var login = {
                                'hostname': (fields[0] == '' ? null : unescape(fields[0])),
                                'username': unescape(fields[1]),
                                'password': unescape(fields[2]),
                                'httpRealm': null,
                                'formSubmitURL': "",
                                'usernameField': (fields[3] == '' ? null : unescape(fields[3])),
                                'passwordField': (fields[4] == '' ? null : unescape(fields[4]))
                            };
                        }
                        else {
                            // Version 1.1 CSV has quotes and 2 new fields
                            var fields = entryArray[i].split('","');
                            
                            var login = {
                                'hostname': (fields[0] == '"' ? null : unescape(fields[0].replace('"', ''))),
                                'formSubmitURL': (fields[3] == '' ? "" : unescape(fields[3])),
                                'httpRealm': (fields[4] == '' ? null : unescape(fields[4])),
                                'username': unescape(fields[1]),
                                'password': unescape(fields[2]),
                                'usernameField': (fields[5] == '' ? null : unescape(fields[5])),
                                'passwordField': (fields[6] == '"' ? null : unescape(fields[6].replace('"', '')))
                            };
                        }
                        
                        logins[(i - start)] = this.getFormattedLogin(properties, login);
                    }
                }
                
                this.insertEntries(logins);
                
                if (document.getElementById('tabbox')) {
                    // Refresh the listbox of passwords only if we are using the tab... the dialog version does not need to
                    LoadSignons();
                }
                passwordExporter.debug('Import complete.');
                
                alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-passwords-imported'));
            }
            else
                alert(passwordExporter.bundle.GetStringFromName('passwordexporter.alert-wrong-version'));
        },
        
        // Makes sure logins are formatted correctly
        getFormattedLogin: function(properties, login) {
            passwordExporter.debug('pre-getFormattedLogin: [hostname: ' + login.hostname + ', httpRealm: ' + login.httpRealm + ', formSubmitURL: ' + login.formSubmitURL + ', usernameField: ' + login.usernameField + ', passwordField: ' + login.passwordField + ']');
            
            // in version 1.0.2, encryption was only for passwords... in 1.0.4 we encrypt usernames as well    
            if (properties.encrypt == 'true') {
                login.password = atob(login.password);
                
                if (properties.importversion != '1.0.2')
                    login.username = atob(login.username);
            }
            
            // If there's a httpRealm, it's an export from Firefox 3
            if (login.httpRealm != null)
                login.hostname += ' (' + login.httpRealm + ')';
            
            // There is no httpRealm to worry about before Firefox 3
            if (login.formSubmitURL == null)
                login.formSubmitURL = '';
            
            passwordExporter.debug('post-getFormattedLogin: [hostname: ' + login.hostname + ', httpRealm: ' + login.httpRealm + ', formSubmitURL: ' + login.formSubmitURL + ', usernameField: ' + login.usernameField + ', passwordField: ' + login.passwordField + ']');
            
            return login;
        },
        
        // Inserts the entries into Password Manager
        insertEntries: function(entries) {
            var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance();
            passwordManager.QueryInterface(Components.interfaces.nsIPasswordManager);
            passwordManager.QueryInterface(Components.interfaces.nsIPasswordManagerInternal);
            
            for (var i = 0; i < entries.length; i++) {
                if (!passwordExporter.isThunderbird) {
                    passwordManager.addUserFull(entries[i].hostname, entries[i].username, 
                                                entries[i].password, entries[i].usernameField,
                                                entries[i].passwordField);
                }
                else {
                    passwordManager.addUser(entries[i].hostname, entries[i].username,
                                            entries[i].password);
                }
                
                this.currentCount++;
            }
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
                var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance();
                passwordManager = passwordManager.QueryInterface(Components.interfaces.nsIPasswordManager);
                
                for (var i = 0; i < entries.length; i++) {
                    passwordManager.addReject(entries[i].getAttribute('host'));
                }
            }
        }
    }
};
