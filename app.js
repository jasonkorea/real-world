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





//clear all units
dbm.clearAllUnits();






// 클라이언트 연결 이벤트 처리
io.on('connection', (socket) => {

  console.log('A user connected');
  socket.emit('serverTime', { currentTime: Date.now() });
  socket.emit('message', { type: 'notice', sender: 'server', message: '현재 위치를 인식중입니다. 인식 후 "내 유닛으로 이동" 버튼을 눌러주세요.' });

  // 연결 해제 이벤트 처리
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  // 클라이언트로부터 메시지 받기
  socket.on('message', async (msg) => {
    console.log('Received', msg);
    if (msg.type === 'serverTime') {
      socket.emit('message', { type: 'serverTime', data: Date.now() });
    } else if (msg.type === 'move') {
      const freshUnit = await dbm.createOrUpdateUnit(msg);
      console.log('freshUnit : id', freshUnit.id);
      const response = {
        type: 'move',
        sender: msg.sender,
        unitInfo: {
          id: freshUnit.id,
          startPosition: { lat: parseFloat(freshUnit.startPosition.lat), lng: parseFloat(freshUnit.startPosition.lng) },
          destinationPosition: { lat: parseFloat(freshUnit.destinationPosition.lat), lng: parseFloat(freshUnit.destinationPosition.lng) },
          size: freshUnit.size,
          speed: freshUnit.speed,
          image: freshUnit.image,
          startTime: freshUnit.startTime
        }
      };
      io.emit('message', response);
    } else if (msg.type === 'chat') {
      io.emit('message', msg);
    } else if (msg.type === 'requestInitialData' ||
      (msg.type === 'visibilitychange' && msg.visibility === 'visible')) {
      const units = await dbm.getAllUnits();
      console.log('unitssssss', units);

      units.forEach(unit => {
        if (!unit.startPosition.lat) {
          console.log('unit.startPosition.lat is null');
          return;
        }
        const startLatString = unit.startPosition.lat.toString();
        const startLngString = unit.startPosition.lng.toString();
        const startPosition = { lat: parseFloat(startLatString), lng: parseFloat(startLngString) };
        const destLatString = unit.destinationPosition.lat.toString();
        const destLngString = unit.destinationPosition.lng.toString();
        const destinationPosition = { lat: parseFloat(destLatString), lng: parseFloat(destLngString) };
        const idString = unit.id.toString();

        const serverTime = Date.now();
        io.emit('serverTime', { currentTime: Date.now() });

        console.log('server time', serverTime);
        console.log('unit.startTime', unit.startTime);
        console.log('serverTime > unit.startTime', serverTime > unit.startTime);

        const response = {
          type: 'move',
          sender: idString,
          unitInfo: {
            startPosition: startPosition,
            destinationPosition: destinationPosition,
            size: unit.size,
            speed: unit.speed,
            image: unit.image,
            startTime: serverTime > unit.startTime ? unit.startTime : unit.startTime,
            fromDb: true
          }
        };
        socket.emit('message', response);
      });
    } else if (msg.type == 'serverTime') {
      socket.emit('message', { type: 'serverTime', data: Date.now() });
    }
  });
});

server.listen(PORT, () => {
  console.log(`listening at ${PORT}`);
});
