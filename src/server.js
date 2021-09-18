const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');

const dbConnect = require('./utils/dbConnect');

const app = express();

app.use(cors());

app.get('/', (req, res) => {
  res.send('Server is running on 8080 🥳');
});

const server = app.listen(process.env.PORT || 8080);

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const redisClient = require('./redis-client');

const users = {};
const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on('join room', async ({ roomId, userId, username }) => {
    socket.join(roomId);
    if (users[roomId]) {
      const { length } = users[roomId];
      if (length === 4) {
        socket.emit('room full');
        return;
      }
      users[roomId].push({
        socketId: socket.id,
        username,
      });
    } else {
      users[roomId] = [{ socketId: socket.id, username }];
    }
    socketToRoom[socket.id] = roomId;
    const usersInThisRoom = users[roomId].filter((user) => user.socketId !== socket.id);

    try {
      const filter = { spaceId: roomId };
      const update = {
        $push: { participants: { userId: ObjectId(userId), username } },
      };
      const client = await dbConnect();
      await client.db(process.env.DATABASE).collection('spaces').updateOne(filter, update);
    } catch (err) {
      console.warn('Unable to add user to space:', err);
    }

    redisClient
      .lrange(roomId, 0, -1)
      .then((conversation) => {
        if (conversation != null) {
          socket.emit('all users', { users: usersInThisRoom, conversation: JSON.stringify(conversation) });
        } else {
          socket.emit('all users', { users: usersInThisRoom });
        }
      })
      .catch((err) => {
        console.warn(err);
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

  socket.on('send message', ({ roomId, message, username }) => {
    redisClient.rpush(roomId, JSON.stringify({ message, username }));
    const userRoomID = socketToRoom[socket.id];
    io.to(userRoomID).emit('return message', { message, username });
  });

  socket.on('disconnect', async () => {
    const roomId = socketToRoom[socket.id];
    let room = users[roomId];
    if (room) {
      room = room.filter((user) => user.socketId !== socket.id);
      users[roomId] = room;
    }
    try {
      const filter = { spaceId: roomId };
      const participants = users[roomId].map((user) => user.username);
      const update = {
        $set: { participants },
      };
      const client = await dbConnect();
      await client.db(process.env.DATABASE).collection('spaces').updateOne(filter, update);
    } catch (err) {
      console.warn('Unable to remove user for space:', err);
    }
    io.emit('user disconnect', {
      room,
      roomId,
      users: users[roomId],
    });
  });
});
