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
 
/*
This tool is accessed from the browser address bar at chrome://passwordexporter/content/debug.xul
It is designed to help users solve their own problems because it's hard for me to troubleshoot the
extension without seeing the password file, which I can't do.
*/

var passwordExporterDebug = {
    linebreak: '',
    
    // Output some basic diagnostics
    debug: function() {
        var debug = document.getElementById('debug');
        this.linebreak = passwordExporter.getLinebreak();
        
        debug.hidden = false;
        
        debug.value = 'Some basic information about this environment:' + this.linebreak + this.linebreak;
        debug.value += this.getInfo();
        debug.value += this.checkComponents();
    },
    
    // returns userAgent info
    getInfo: function() {
        var debug = '';
        
        debug += 'userAgent: ' + navigator.userAgent + this.linebreak + this.linebreak;
        
        debug += 'Detected Firefox Version Equivalent: ' + passwordExporter.fxVersion + this.linebreak;
        
        debug += 'Detected as Thunderbird: ' + passwordExporter.isThunderbird + this.linebreak;
        
        return debug + this.linebreak;
    },
    
    // Checks the existence of the relevant password/login components
    checkComponents: function() {
        var debug = 'Components:' + this.linebreak;
        
        if ("@mozilla.org/passwordmanager;1" in Components.classes)
            debug += '@mozilla.org/passwordmanager;1: exists' + this.linebreak;
        else
            debug += '@mozilla.org/passwordmanager;1: does not exist' + this.linebreak;
        
        if ("@mozilla.org/login-manager;1" in Components.classes)
            debug += '@mozilla.org/login-manager;1: exists' + this.linebreak;
        else
            debug += '@mozilla.org/login-manager;1: does not exist' + this.linebreak;
        
        if ("@mozilla.org/login-manager/storage/legacy;1" in Components.classes)
            debug += '@mozilla.org/login-manager/storage/legacy;1: exists' + this.linebreak;
        else
            debug += '@mozilla.org/login-manager/storage/legacy;1: does not exist' + this.linebreak;
        
        if (Components.interfaces.nsIPasswordManager)
            debug += 'nsIPasswordManager: exists' + this.linebreak;
        else
            debug += 'nsIPasswordManager: does not exist' + this.linebreak;
        
        if (Components.interfaces.nsIPasswordManagerInternal)
            debug += 'nsIPasswordManagerInternal: exists' + this.linebreak;
        else
            debug += 'nsIPasswordManagerInternal: does not exist' + this.linebreak;
        
        if (Components.interfaces.nsIPassword)
            debug += 'nsIPassword: exists' + this.linebreak;
        else
            debug += 'nsIPassword: does not exist' + this.linebreak;
        
        if (Components.interfaces.nsIPasswordInternal)
            debug += 'nsIPasswordInternal: exists' + this.linebreak;
        else
            debug += 'nsIPasswordInternal: does not exist' + this.linebreak;
        
        if (Components.interfaces.nsILoginManager)
            debug += 'nsILoginManager: exists' + this.linebreak;
        else
            debug += 'nsILoginManager: does not exist' + this.linebreak;
            
        if (Components.interfaces.nsILoginInfo)
            debug += 'nsILoginInfo: exists' + this.linebreak;
        else
            debug += 'nsILoginInfo: does not exist' + this.linebreak;
        
        return debug + this.linebreak;
    }
};
