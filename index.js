let express = require('express');
let stream = require('express-stream');
let fs = require('fs');
let chrome = require('chrome-remote-interface');
let bodyParser = require('body-parser');
let spawn = require('child_process').spawn;

// Inspired by http://www.zackarychapple.guru/chrome/2016/08/24/chrome-headless.html
// and also inspired by https://hub.docker.com/r/justinribeiro/chrome-headless/ 

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

  return instance.DOM.getDocument(-1).then(document => {

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
      })
      .then(() => {
        instance.close();
      })
      .catch((err) => {
        console.error(err);
        instance.close();
      });
  })
  .catch((err) => {
    console.error(err);
    instance.close();
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

app.use(bodyParser.json({type: 'application/json'}));

// Just to demonstrate the app working fetch on root of the app causes the PDF to be generated.
app.get('/', (req, res) => {
  let url = req.query.url;

  chrome.New(() => {
     chrome(instance => {
      instance.Page.loadEventFired(render.bind(this, instance, res));
      instance.Page.enable(); 
      instance.once('ready', () => {
        instance.Page.navigate({ url: url });
      });
      instance.once('error', (err) => {
        console.error(err);
        res.send(`{
          "speech": "Sorry, there was an error",
          "displayText": "Sorry, there was an error",
          "source": "Paul Kinlan"
        }`);
        instance.close();
      });
    })
  });
});

app.post('/', (req, res) => {
  let query = req.body;

  console.log(query);

  if(query.result.action == 'browse.open') {
    let url = query.result.resolvedQuery;
    let parameters = query.result.parameters;
  
    chrome.New(() => {
     chrome(instance => {
      instance.Page.loadEventFired(render.bind(this, instance, res));
      instance.Page.enable(); 
      instance.once('ready', () => {
        instance.Page.navigate({ url: url });
      });
      instance.once('error', (err) => {
        res.send(`{
          "speech": "Sorry, there was an error",
          "displayText": "Sorry, there was an error",
          "source": "Paul Kinlan"
        }`);
        console.error(err);
        instance.close();
      });
    })
  });
  }
  else {
    res.send(`{
          "speech": "Sorry, there was an error",
          "displayText": "Sorry, there was an error",
          "source": "Paul Kinlan"
        }`);
  }
});

app.listen(8080, function () {
  chrome.Version().then(version => {
    console.log(version)
  })
  .catch(err=> console.log('Error in Version', err));
  console.log('Export app running on 8080!');
});