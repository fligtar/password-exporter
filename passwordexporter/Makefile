##
# Copyright 2014 Jorge Villalobos
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
##

# The name of the extension.
extension_name := password-exporter

# The UUID of the extension.
extension_uuid := {B17C1C5A-04B1-11DB-9804-B622A1EF5492}

# The name of the profile dir where the extension can be installed.
profile_dir := password-exporter-dev

# The zip application to be used.
ZIP := zip

# The target XPI file.
xpi_file := ../builds/$(extension_name).xpi

# The type of operating system this make command is running on.
os_type := $(patsubst darwin%,darwin,$(shell echo $(OSTYPE)))

# The location of the extension profile.
ifeq ($(os_type), darwin)
  profile_location := \
    ~/Library/Application\ Support/Firefox/Profiles/$(profile_dir)/extensions/
else
  ifeq ($(os_type), linux-gnu)
    profile_location := \
      ~/.mozilla/firefox/$(profile_dir)/extensions/
  else
    profile_location := \
      "$(subst \,\\,$(APPDATA))\\Mozilla\\Firefox\\Profiles\\$(profile_dir)\\extensions\\"
  endif
endif

# This builds the extension XPI file.
.PHONY: all
all: $(xpi_file)
	@echo
	@echo "Build finished successfully."
	@echo

# This cleans all temporary files and directories created by 'make'.
.PHONY: clean
clean:
	@rm -f $(xpi_file)
	@echo "Cleanup is done."

# The sources for the XPI file. Uses variables defined in the included
# Makefiles.
xpi_built := install.rdf \
             chrome.manifest \
             bootstrap.js \
             license.txt \
             logo.png \
             logo64.png \
             $(wildcard chrome/content/*.js) \
             $(wildcard chrome/content/*.xul) \
             $(wildcard chrome/content/*.xml) \
             $(wildcard chrome/content/*.css) \
             $(wildcard chrome/skin/*.css) \
             $(wildcard chrome/skin/*.png) \
             $(wildcard chrome/locale/*/*.dtd) \
             $(wildcard chrome/locale/*/*.properties) \
             $(wildcard defaults/preferences/prefs.js) \
             $(wildcard modules/*.js)

$(xpi_file): $(xpi_built)
	@echo "Creating XPI file."
	@$(ZIP) $(xpi_file) $(xpi_built)
	@echo "Creating XPI file. Done!"

# This builds the extension XPI file and copies it to a mounted Android device.
.PHONY: android
android: all
	@adb push $(xpi_file) /mnt/sdcard/Download
	@echo "Copied to device."

.PHONY: install
install: $(xpi_file)
	@echo "Installing in profile folder: $(profile_location)"
	@cp -fL $(xpi_file) $(profile_location)/$(extension_uuid).xpi
	@echo "Installing in profile folder. Done!"
	@echo
