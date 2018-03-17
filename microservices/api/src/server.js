const request = require('request');
const bodyParser = require('body-parser');
const express = require('express');
const mdb = require('moviedb')('9b73a582469557fdf21162630f9e1bd1');

const FACEBOOK_VERIFY_TOKEN = "my_tv_series_bot_password";
const FACEBOOK_PAGE_ACCESS_TOKEN = "EAACZA6NOIb8UBACRTwM5sr1vYphDNhvjBZAs46ZACbBAZByWpTnXv1cxL0MsQJ9cHsJZAgsjdjVZBu1ZC7dTz5DcZCrZCZAJ6ZAuoypfjLeUyTjrQxFD4JVoPyBH4hApMNdid6we6PpNL9oG7wa5MEZBRJGXpNUY1luBSbJkkZCYhXxCjHpBZA4iOw2BH6Ubt3xVZCzrpAZD";
const FACEBOOK_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN;
const MOVIE_DB_PLACEHOLDER_URL = 'http://image.tmdb.org/t/p/w185/';
const MOVIE_DB_BASE_URL = 'https://www.themoviedb.org/discover/tv';

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
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

app.get('/webhook/', function(req, res) {
  console.log(JSON.stringify(req.query, null, 4));
  if (req.query['hub.verify_token'] === FACEBOOK_VERIFY_TOKEN) {
        const challenge = req.query['hub.challenge'];
        res.send(challenge);
    }
    res.send('Error, wrong token');
});

app.post('/webhook/', function(req, res) {
  console.log(JSON.stringify(req.body, null, 4));
  if (req.body.object === 'page') {
    if (req.body.entry) {
      req.body.entry.forEach(function(entry) {
        if (entry.messaging) {
          entry.messaging.forEach(function(messagingObject) {
              const senderId = messagingObject.sender.id;
              if (messagingObject.message) {
                if (!messagingObject.message.is_echo) {
                  //Assuming that everything sent to this bot is a movie name.
                  const movieName = messagingObject.message.text;
                  getMovieDetails(senderId, movieName);
                }
              } else if (messagingObject.postback) {
                console.log('Received Postback message from ' + senderId);
              }
          });
        } else {
          console.log('Error: No messaging key found');
        }
      });
    } else {
      console.log('Error: No entry key found');
    }
  } else {
    console.log('Error: Not a page object');
  }
  res.sendStatus(200);
})

const server = app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});

function sendUIMessageToUser(senderId, elementList) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: elementList
          }
        }
      }
    }
  }, function(error, response, body) {
        if (error) {
          console.log('Error sending UI message to user: ' + error.toString());
        } else if (response.body.error){
          console.log('Error sending UI message to user: ' + JSON.stringify(response.body.error));
        }
  });
}

function sendMessageToUser(senderId, message) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        text: message
      }
    }
  }, function(error, response, body) {
        if (error) {
          console.log('Error sending message to user: ' + error);
        } else if (response.body.error){
          console.log('Error sending message to user: ' + response.body.error);
        }
  });
}

function showTypingIndicatorToUser(senderId, isTyping) {
  var senderAction = isTyping ? 'typing_on' : 'typing_off';
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      sender_action: senderAction
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending typing indicator to user: ' + error);
    } else if (response.body.error){
      console.log('Error sending typing indicator to user: ' + response.body.error);
    }
  });
}

function getElementObject(result) {
  var movieName  = result.original_title;
  var overview = result.overview;
  var posterPath = MOVIE_DB_PLACEHOLDER_URL + result.poster_path;
  return {
    title: movieName,
    subtitle: overview,
    image_url: posterPath,
    buttons: [
        {
          type: "web_url",
          url: MOVIE_DB_BASE_URL + result.id,
          title: "View more details"
        }
    ]
  };
}

function getMovieDetails(senderId, movieName) {
  showTypingIndicatorToUser(senderId, true);
  const message = 'Found details on ' + movieName;
  mdb.searchMovie({ query: movieName }, (err, res) => {
    showTypingIndicatorToUser(senderId, false);
    if (err) {
      console.log('Error using movieDB: ' + err);
      sendMessageToUser(senderId, 'Error finding details on ' + movieName);
    } else {
      console.log(res);
      if (res.results) {
        if (res.results.length > 0) {
          const elements = [];
          const resultCount =  res.results.length > 5 ? 5 : res.results.length;
          for (let i = 0; i < resultCount; i++) {
            let result = res.results[i];
            elements.push(getElementObject(result));
          }
          sendUIMessageToUser(senderId, elements);
        } else {
          sendMessageToUser(senderId, 'Could not find any informationg on ' + movieName);
        }
      } else {
        sendMessageToUser(senderId, message);
      }
    }
  });
}
