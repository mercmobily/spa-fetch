. ../node_modules/web-sites-common/makeDocsBase.sh

cp ../spa-fetch.js literate-code.js 
../node_modules/docco-next/bin/docco \
  -p ../node_modules/web-sites-common/plugin.js\
  -c ../node_modules/web-sites-common/template.css\
  -t ../node_modules/web-sites-common/template.ejs\
  -o ../docs\
  index.md\
  documentation.md\
  codelabs.md\
  codelabs/how-to/index.md\
  literate-code.js

cp -r ./images ../docs/
