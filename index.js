let express = require('express');
let stream = require('express-stream');
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


const DOMProperties = {};

const render = (instance, res) => {

  instance.DOM.getDocument(-1).then(document => {

    const title = getTitle(instance, document)
        .catch(error => error )
        .then(title => DOMProperties.title = title )
        
    const body = getBody(instance, document)
        .catch(error => error)
        .then(body => DOMProperties.body = body )

    Promise.all([title, body])
      .then(() => {
        res.send(`{
          "speech": "${DOMProperties.title}\n\n${DOMProperties.body}",
          "displayText": "${DOMProperties.title}\n\n${DOMProperties.body}",
          "source": "Paul Kinlan"
        }`);
      });
  });
};

const getTitle = function(instance, document) {
  return instance.DOM.querySelector({'nodeId': document.root.nodeId, 'selector': 'title'})
    .then(node => instance.DOM.resolveNode(node))
    .then(node => instance.Runtime.getProperties(node.object))
    .then(properties => properties.result.find(el => el.name  == 'text').value.value);
}

const getBody = function(instance, document) {
  return instance.DOM.querySelector({'nodeId': document.root.nodeId, 'selector': 'body'})
    .then(node => instance.DOM.resolveNode(node))
    .then(node => instance.Runtime.getProperties(node.object))
    .then(properties => properties.result.find(el => el.name  == 'innerText').value.value);
}

// Just to demonstrate the app working fetch on root of the app causes the PDF to be generated.
app.get('/', (req, res) => {
  let url = req.query.url;
 
   chrome.New(function () {
     chrome(chromeInstance => {
       chromeInstance.Page.loadEventFired(render.bind(this, chromeInstance, res));
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