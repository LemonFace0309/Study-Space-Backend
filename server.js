const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())

app.get('/', (req, res) => {
  res.send('Server is running on 8080')
})

const server = app.listen(process.env.PORT || 8080)
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})


const users = {};
const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on("join room", payload => {
    if (users[payload.roomID]) {
      const length = users[payload.roomID].length;
      if (length === 4) {
        socket.emit("room full");
        return;
      }
      users[payload.roomID].push({socketID: socket.id, username: payload.username});
    } else {
      users[payload.roomID] = [{socketID: socket.id, username: payload.username}];
    }
    socketToRoom[socket.id] = payload.roomID;
    const usersInThisRoom = users[payload.roomID].filter(user => user.socketID !== socket.id);

    socket.emit("all users", usersInThisRoom);
  });

  socket.on("sending signal", payload => {
    io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
  });

  socket.on("returning signal", payload => {
    io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
  });

  socket.on("send message", (message, username) => {
    io.emit("return message", message, username);
  });

  socket.on('disconnect', () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter(user => user.socketID !== socket.id);
      users[roomID] = room;
    }
    io.emit("user disconnect", {room: room, roomID: roomID, users: users[roomID] } );
  });
})