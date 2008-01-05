ADDON=passwordexporter

echo "Starting build of $ADDON..."

mkdir build
cp -R $ADDON/* build
cp ./chrome.manifest build

VERSION=`grep -e "version>.*</" -o build/install.rdf | grep -e "[0-9][^<]*" -o`

cd build/chrome

echo "Making jar..."
zip -r ../$ADDON.jar . -x@../../exclude.lst
cd ..
rm -rf chrome/*
mv $ADDON.jar chrome

echo "Making xpi..."
zip -r "$ADDON-$VERSION.xpi" ./* -x@../exclude.lst
mv "$ADDON-$VERSION.xpi" ../builds

echo "builds/$ADDON-$VERSION.xpi created..."
echo "Cleaning up..."
cd ..
rm -rf build

echo "Done."

