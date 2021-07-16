const express = require('express');
const cors = require('cors');
const redis = require('redis');

// must configure url for production
const redisClient = redis.createClient();

const app = express();

app.use(cors());

app.get('/', (req, res) => {
  res.send('Server is running on 8080');
});

const server = app.listen(process.env.PORT || 8080);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const users = {};
const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on('join room', (payload) => {
    if (users[payload.roomID]) {
      const { length } = users[payload.roomID];
      if (length === 4) {
        socket.emit('room full');
        return;
      }
      users[payload.roomID].push({
        socketID: socket.id,
        username: payload.username,
      });
    } else {
      users[payload.roomID] = [{ socketID: socket.id, username: payload.username }];
    }
    socketToRoom[socket.id] = payload.roomID;
    const usersInThisRoom = users[payload.roomID].filter((user) => user.socketID !== socket.id);

    redisClient.lrange(payload.roomID, 0, -1, (error, conversation) => {
      if (error) {
        console.debug(error);
      } else if (conversation != null) {
        console.debug(JSON.parse(JSON.stringify(conversation)));
        socket.emit('all users', { users: usersInThisRoom, conversation });
      } else {
        socket.emit('all users', { users: usersInThisRoom });
      }
    });
  });

  socket.on('sending signal', (payload) => {
    io.to(payload.userToSignal).emit('user joined', {
      username: payload.username,
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on('send message', ({ roomID, message, username }) => {
    redisClient.lpush(roomID, JSON.stringify({ message, username }));
    io.emit('return message', { message, username });
  });

  socket.on('disconnect', () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((user) => user.socketID !== socket.id);
      users[roomID] = room;
    }
    io.emit('user disconnect', {
      room,
      roomID,
      users: users[roomID],
    });
  });
});
