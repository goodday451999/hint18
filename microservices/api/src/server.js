var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => {
	res.send('Hello, world!');
});

app.get('/path1', (req, res) => {
	res.send({
		msg: 'Got GET path 1!'
	});
});

app.post('/path1', (req, res) => {
	res.send({
		msg: 'Got POST path 1!'
	});
});

const server = app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});
