let express = require('express');
let fs = require('fs');
let chrome = require('chrome-remote-interface');
let spawn = require('child_process').spawn;

// The second argument when starting node is the location of the headless_shell binary.
if (process.argv[ 2 ] === undefined) {
  throw Error('No headless binary path provided.');
}

// We need to spawn Chrome headless with some parameters, one of which is the debug port.
// I am hard coding window size because I want the screenshot to be a specific size.
// Note: 1280x1696 is the default pixel resolution for a Letter sheet of paper.
spawn(process.argv[ 2 ], ['--no-sandbox', '--remote-debugging-port=9222','--window-size=1280x1696' ]);

let app = express();

function readTitle(instance, response) {
  instance.DOM.getDocument()
    .then(documentNode => {
      console.log(`DocumentNode`, documentNode);
      return instance.Accessibility.getPartialAXTree(documentNode.root, true);
    })
    .then(nodes => {
      return response.send(nodes);
    })
    .catch(err => {
      console.log("error", err);
      response.send(err);
    });
}

// Just to demonstrate the app working fetch on root of the app causes the PDF to be generated.
app.get('/', (req, res) => {
  let url = req.query.url;
 
   chrome.New(function () {
     chrome(chromeInstance => {
       chromeInstance.Page.loadEventFired(readTitle.bind(null, chromeInstance, res));
       chromeInstance.Page.enable();
       chromeInstance.once('ready', () => {
         chromeInstance.Page.navigate({ url: url });
       })
     });
   });
});

app.listen(3000, function () {
  chrome.Version().then(version => {
    console.log(version)
  })
  .catch(err=> console.log('Error in Version', err));
  console.log('Export app running on 3000!');
});