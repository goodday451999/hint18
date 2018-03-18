/*var express = require('express');
var app = express();
var request = require('request');
var router = express.Router();
var morgan = require('morgan');
var bodyParser = require('body-parser');
var exphbs  = require('express-handlebars');
require('request-debug')(request);

var hasuraExamplesRouter = require('./hasuraExamples');

var server = require('http').Server(app);

router.use(morgan('dev'));

app.engine('handlebars', exphbs({
	defaultLayout: 'main',
	helpers: {
	    toJSON : function(object) {
	      return JSON.stringify(object, null, 4);
	    }
  	}
	})
);
app.set('view engine', 'handlebars');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('/', hasuraExamplesRouter);

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});
*/

var request = require('request');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();

let mdb = require('moviedb')('9b73a582469557fdf21162630f9e1bd1');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

let FB_VERIFY_TOKEN = "my_bot_password";
let FB_PAGE_ACCESS_TOKEN ="EAACXZBDKj3RQBAD94QtXuObnvhZAZBdMU7bHosgVyugtHTCGtHrSVZB0lbaZBJRMxQ8Rd3uzqhICpMKQx8PAm2Llx3OTNPH0N15Jk6T4ZAb0b3AvxOHoQZBo1zKAqLmbWYxwMH4NycG6G7qmggTirwi4lT1wD5oI6HAXCeyZAHeToyAYBSxvTi3BjjcV578ruD4ZD";
let FB_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FB_PAGE_ACCESS_TOKEN;

let MOVIE_DB_PLACEHOLDER_URL = 'http://image.tmdb.org/t/p/w185/';

app.get('/', function (req, res) {
    res.send("Hello World, I am a bot.");
});


app.get('/webhook/', function(req, res) {
  if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
});

app.post('/webhook/', function(req, res) {
	console.log('Request received at webhook: ' + JSON.stringify(req.body));
	if(req.body.object == "page") {
		req.body.entry.forEach(function(entry) {
			if(entry.messaging) {
				entry.messaging.forEach(function(event) {
					if(event.message) {
						handleMessageFromUser(event);
					}
					// if(event.postback) {
					// 	handlePostback(event);
					// } else if(event.message) {
					// 	handleMessageFromUser(event);
					// }
				});
			}
		});
		res.sendStatus(200);
	}
});

function handleMessageFromUser(event) {
	if(!event.message.is_echo) {
		var message = event.message;
		var senderId = event.sender.id;

		console.log("Received message from senderId: " + senderId);
		console.log("Message is: " + JSON.stringify(message));

		if(message.text) {
			let movieName = message.text;
			findMovie(senderId, movieName);
		} else if (message.attachments) {
			sendMessage(senderId, "Sorry:( Currently,I can understand the text messages");
		}
	}
}

function findMovie(userId, movieName) {
	sendTypingIndicator(userId, true);
	console.log('Movie Name: ' + movieName);
	mdb.searchMovie({ query: movieName }, (err, res) => {
		sendTypingIndicator(userId, false);
		if(err) {
			sendMessage(userId, "Something went wrong.That is all I can say for now");
			console.log('Error fetching data from DB: ' + err);
		} else {
			console.log('Response from DB: ' + JSON.stringify(res));
			if(res.results) {
				if(res.results.length > 0) {
					var dataElements = [];
					var count = 0;
					res.results.forEach(function(result) {
						count = count + 1;
						if(count < 6) {
							dataElements.push(getMovieElement(result));
						}
					});
					var messageData = {
						attachment: {
							type: "templete",
							playload: {
								templete_type: "generic",
								elements: dataElements
							}
						}
					};
					senderGenericMessage(userId, messageData);
				} else {
					sendMessage(userId, 'I have nothing to say about' + movieName);
				}
			} else {
				sendMessage(userId, 'I have nothing to say about' + movieName);
				console.log('Error fetching data from DB: ' + err);
			}
		}
	});
}

function sendTypingIndicator(senderId, shouldShowIndicator) {
	let senderAction = shouldShowIndicator ? 'typing_on' : 'typing_off';
	request({
		url: FB_SEND_MESSAGE_URL,
		qs: {
			access_token: FB_PAGE_TOKEN
		},
		method: 'POST',
		json: {
			recipient: { id: senderId },
			sender_action: senderAction
		}
	}, function(error, response, body) {
		if(error) {
			console.log('Error sending Typing Indicator: ShouldShow: ' + senderAction, error)
		} else if(response.body.error) {
			console.log('Error sending Typing Indicator: ShouldShow: ' + senderAction, response.body.error)
		}
	});
}

function sendMessage(sender, cotent) {
	request({
		url: FB_SEND_MESSAGE_URL,
		qs: {
			access_token:FB_PAGE_TOKEN
		},
		method: 'POST',
		json: {
			recipient: { id:sender },
			message: {
				text: content
			},
		}
	}, function(error, response, body) {
		if(error) {
			console.log('Error sending messages: ', error)
		} else if(response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function getMovieElement(data) {
	var playload = {

	};
	return {
		title: data.original_title,
		subtitle: data.overview,
		image_url: !data.poster_path ? "http://placehold.it/350x150" : MOVIE_DB_PLACEHOLDER_URL + data.poster_path,
		buttons: [
			{
				type:'web_url',
				url:'https://www.themoviedb.org/movie/' + data.id + '-' + data.original_title,
				title: 'More Details',
				webview_height_ratio: 'compact'
			}
		]
	}
}

/*function handlePostback(event) {
	var senderId = event.sender.id;
	var payload = event.postback.payload;
	if(payload === "Greeting") {
		var message = "My name is dearest bot made with Hasura...I can only now help you by providing the informations related to movies";
		sendMessage(senderId, message);
	}
}
*/
function sendGenericMessage(sender, messageData) {
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token: FB_PAGE_TOKEN},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if(error) {
			console.log('Error sending messages: ', error)
		} else if(response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});

