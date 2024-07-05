//https://github.com/atultyagi612/Google-Authentication-nodejs/blob/main/app.js

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
const dbm = require('./db/dbmanager');

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
  socket.emit('message', { type: 'notice', sender: 'server', message: 'Welcome to the Real World!' });

  // 연결 해제 이벤트 처리
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  // 클라이언트로부터 메시지 받기
  socket.on('message', async (msg) => {
    console.log('Received', msg);
    if (msg.type === 'move') {
      const freshUnit = await dbm.createOrUpdateUnit(msg);
      console.log('freshUnit', freshUnit);
      const response = {
        type: 'move',
        sender: msg.sender,
        unitInfo: {
          startPosition: freshUnit.startPosition,
          destinationPosition: freshUnit.destinationPosition,
          size: freshUnit.size,
          speed: freshUnit.speed,
          image: freshUnit.image,
          startTime: freshUnit.startTime
        }
      };
      io.emit('message', response);
    } else if (msg.type === 'chat') {
      io.emit('message', msg);
    } else if (msg.type === 'visibilitychange') {
      // 메시지를 받은 클라이언트에게만 메시지를 전송
      socket.emit('message', {
        type: 'updateAllClients',
        sender: 'server',
        message: msg.visibility
      });
    } else if (msg.type === 'requestInitialData') {
      const units = await dbm.getAllUnits();
      console.log('units', units);
      units.forEach(unit => {
        const response = {
          type: 'move',
          sender: unit.id,
          unitInfo: {
            startPosition: unit.startPosition,
            destinationPosition: unit.destinationPosition,
            size: unit.size,
            speed: unit.speed,
            image: unit.image,
            startTime: unit.startTime,
            fromDb: true
          }
        };
        socket.emit('message', response);
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`listening at ${PORT}`);
});
