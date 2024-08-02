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
const Util = require('./util/util');
const User = require('./models/UserModel');

dotenv.config({ path: './config/config.env' });
var app = express();
const PORT = process.env.PORT || 3000;

createWorldUser();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
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


//================================
const calculateCurrentPosition = (unit, currentTime) => {
  const timeElapsed = (currentTime - unit.startTime) / 1000; // 초 단위 경과 시간
  const distanceTraveled = unit.speed * timeElapsed; // 이동 거리
  const totalDistance = Math.sqrt(
      Math.pow(unit.destinationPosition.lat - unit.startPosition.lat, 2) +
      Math.pow(unit.destinationPosition.lng - unit.startPosition.lng, 2)
  );
  const fractionTraveled = distanceTraveled / totalDistance;

  const currentLat = unit.startPosition.lat + fractionTraveled * (unit.destinationPosition.lat - unit.startPosition.lat);
  const currentLng = unit.startPosition.lng + fractionTraveled * (unit.destinationPosition.lng - unit.startPosition.lng);

  return { lat: currentLat, lng: currentLng };
};

const calculateAngle = (start, end) => {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  return Math.atan2(dy, dx);
}

const calculateCollisionTime = (unit1, unit2) => {
  console.log("Calculating collision time...");
  console.log(`Unit1: ${JSON.stringify(unit1)}`);
  console.log(`Unit2: ${JSON.stringify(unit2)}`);

  const dx = unit1.startPosition.lat - unit2.startPosition.lat;
  const dy = unit1.startPosition.lng - unit2.startPosition.lng;
  console.log(`dx: ${dx}, dy: ${dy}`);

  const angle1 = calculateAngle(unit1.startPosition, unit1.destinationPosition);
  const angle2 = calculateAngle(unit2.startPosition, unit2.destinationPosition);
  console.log(`angle1: ${angle1}, angle2: ${angle2}`);

  const dvx = unit1.speed * Math.cos(angle1) - unit2.speed * Math.cos(angle2);
  const dvy = unit1.speed * Math.sin(angle1) - unit2.speed * Math.sin(angle2);
  console.log(`dvx: ${dvx}, dvy: ${dvy}`);

  const a = dvx * dvx + dvy * dvy;
  const b = 2 * (dx * dvx + dy * dvy);
  const c = dx * dx + dy * dy - Math.pow(unit1.size + unit2.size, 2); // 유닛 크기를 고려한 거리
  console.log(`a: ${a}, b: ${b}, c: ${c}`);

  const discriminant = b * b - 4 * a * c;
  console.log(`discriminant: ${discriminant}`);

  if (discriminant < 0) {
      console.log("No collision: discriminant < 0");
      return null; // 충돌 없음
  }

  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
  console.log(`t1: ${t1}, t2: ${t2}`);

  const collisionTime = Math.min(t1, t2);
  console.log(`collisionTime: ${collisionTime}`);

  if (collisionTime <= 0) {
      console.log("No collision: collisionTime <= 0");
      return null; // 충돌 시간이 현재 또는 이전이면 충돌 없음
  }

  return collisionTime;
}

const handleCollision = async (unit1, unit2, collisionTime, io) => {
  console.log(`Collision detected between unit ${unit1.id} and unit ${unit2.id} at time ${collisionTime}`);

  const currentTime = Date.now();
  unit1.currentPosition = calculateCurrentPosition(unit1, currentTime);
  unit2.currentPosition = calculateCurrentPosition(unit2, currentTime);

  // 충돌 발생 시 유닛을 정지 상태로 설정
  unit1.destinationPosition = unit1.currentPosition;
  unit2.destinationPosition = unit2.currentPosition;

  await unit1.save();
  await unit2.save();

  // 클라이언트에 충돌 정보 전달
  io.emit('message', { type: 'collision', unit1: unit1.id, unit2: unit2.id, time: collisionTime });
};
//================================



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
      //get displayName from googleId
      const freshUnit = await dbm.createOrUpdateUnit(msg);
      if (!freshUnit) {
        console.log('freshUnit is null');
        return;
      }

      const units = await dbm.getAllUnits();
      for (let unit of units) {
          if (unit.id !== freshUnit.id) {
              const collisionTime = calculateCollisionTime(freshUnit, unit);
              console.log('collisionTime', collisionTime);
              if (collisionTime) {
                  await handleCollision(freshUnit, unit, collisionTime, io);
                  break;
              }
          }
      }

      console.log('freshUnit : id', freshUnit.id);
      const userName = await dbm.getDisplayNameByGoogleId(msg.sender);
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
          startTime: freshUnit.startTime,
          userName: userName
        }
      };
      io.emit('message', response);
    } else if (msg.type === 'chat') {
      io.emit('message', msg);
    } else if (msg.type === 'requestInitialData' ||
      (msg.type === 'visibilitychange' && msg.visibility === 'visible')) {
      const units = await dbm.getAllUnits();
      console.log('unitssssss', units);

      units.forEach(async unit => {
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
        const userName = await dbm.getDisplayNameByGoogleId(unit.id);
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
            userName: userName,
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

async function createWorldUser() {
  const worldUser = await User.findOne({ googleId: Util.getWorldId() });
  if (worldUser) {
    console.log('worldUser exists');
  } else {
    console.log('worldUser does not exist. Creating worldUser');
    const worldUser = {
      googleId: Util.getWorldId(),
      displayName: 'world',
      firstName: 'world',
      lastName: 'world',
      image: 'world',
      email: 'world'
    }
    await User.create(worldUser);
  }
}

server.listen(PORT, () => {
  console.log(`listening at ${PORT}`);
});

