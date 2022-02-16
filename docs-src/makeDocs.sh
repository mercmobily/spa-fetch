. ../node_modules/web-sites-common/makeDocsBase.sh

cp ../spa-fetch.js literate-code.js 
../node_modules/docco-next/bin/docco \
  -p ../node_modules/web-sites-common/plugin.js\
  -c ../node_modules/web-sites-common/template.css\
  -t ../node_modules/web-sites-common/template.ejs\
  -o ../docs\
  index.md\
  documentation.md\
  literate-code.js
  # codelabs.md\
  # codelabs/how-to/index.md\

cp -r ./images ../docs/

cat > ../README.md  <<EOF 
[![npm version][npm-image]][npm-url]
[![install size][install-size-image]][install-size-url]
EOF

cat documentation.md >> ../README.md