const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const fs = require('fs');
const path = require('path');
const https = require('https');
const socketio = require('socket.io');

dotenv.config({ path: './config/config.env' });
var app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then
  (() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

// Passport config
require('./config/passport')(passport);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('views', path.join(__dirname, 'public', 'views'))
app.set('view engine', 'ejs');

app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(require("./routes/index"));
app.use('/auth', require('./routes/auth'));

// SSL options
var sslOptions = {
  ca: fs.readFileSync('./SSL/ca_bundle.crt'),
  key: fs.readFileSync('./SSL/private.key'),
  cert: fs.readFileSync('./SSL/certificate.crt'),
};

var server = https.createServer(sslOptions, app);
const io = socketio(server);

// 클라이언트 연결 이벤트 처리
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.emit('message', { sender: 'server', message: 'Welcome to the Real World!' });

  // 연결 해제 이벤트 처리
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  // 클라이언트로부터 메시지 받기
  socket.on('message', (msg) => {
    console.log('Received', msg);
    if (msg.type === 'move') {
      io.emit('message', msg);
    } else if (msg.type === 'chat') {
      io.emit('message', msg);
    } else if (msg.type === 'visibilitychange') {
      // 메시지를 받은 클라이언트에게만 메시지를 전송
      socket.emit('message', {
        type: 'updateAllClients',
        sender: 'server',
        message: msg.visibility
      });

    }
  });
});

server.listen(PORT, () => {
  console.log(`listening at ${PORT}`);
});
