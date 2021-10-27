const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');

// const redisClient = require('./redis-client');
const dbConnect = require('./utils/dbConnect');
const utils = require('./utils/server');

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

const redisClient = {
  lrange: async () => null,
  rpush: async () => null,
};

const users = {};
const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on('join room', async (payload) => {
    socket.join(payload.roomId);

    utils.addUserToRoom(payload, users, socket);

    socketToRoom[socket.id] = payload.roomId;
    const usersInThisRoom = users[payload.roomId].filter((user) => user.socketId !== socket.id);

    try {
      const filter = { spaceId: payload.roomId };
      const userIdOrNull = payload.userId ? ObjectId(payload.userId) : null;
      const update = {
        $push: { participants: { userId: userIdOrNull, username: payload.username } },
      };
      const client = await dbConnect();
      await client.db(process.env.DATABASE).collection('spaces').updateOne(filter, update);
    } catch (err) {
      console.warn('Unable to add user to space:', err);
    }

    redisClient
      .lrange(payload.roomId, 0, -1)
      .then((conversation) => {
        if (conversation != null) {
          socket.emit('other users', {
            users: usersInThisRoom,
            conversation: JSON.stringify(conversation),
          });
        } else {
          socket.emit('other users', { users: usersInThisRoom });
        }
      })
      .catch((err) => {
        console.warn(err);
      });
  });

  socket.on('offer', (payload) => {
    io.to(payload.userToSignal).emit('offer', {
      username: payload.username,
      role: payload.role,
      signal: payload.signal,
      callerID: payload.callerID,
      isAudioEnabled: payload.isAudioEnabled,
      isVideoEnabled: payload.isVideoEnabled,
    });
  });

  socket.on('answer', (payload) => {
    io.to(payload.callerID).emit('answer', {
      signal: payload.signal,
      id: socket.id,
      isAudioEnabled: payload.isAudioEnabled,
      isVideoEnabled: payload.isVideoEnabled,
    });
  });

  socket.on('message', ({ message, username }) => {
    const roomId = socketToRoom[socket.id];
    redisClient.rpush(roomId, JSON.stringify({ message, username }));
    io.to(roomId).emit('message', { message, username });
  });

  socket.on('isAudioEnabled', ({ enabled }) => {
    const roomId = socketToRoom[socket.id];
    socket.to(roomId).emit('isAudioEnabled', { id: socket.id, enabled });
  });

  socket.on('isVideoEnabled', ({ enabled }) => {
    const roomId = socketToRoom[socket.id];
    socket.to(roomId).emit('isVideoEnabled', { id: socket.id, enabled });
  });

  socket.on('disconnect', async () => {
    const roomId = socketToRoom[socket.id];
    let room = users[roomId];
    if (room) {
      // removes user from room
      room = room.filter((user) => user.socketId !== socket.id);
      users[roomId] = room;
    }
    try {
      const filter = { spaceId: roomId };
      const participants = users[roomId].map((user) => ({ username: user.username, userId: ObjectId(user.userId) }));
      const update = {
        $set: { participants },
      };
      const client = await dbConnect();
      await client.db(process.env.DATABASE).collection('spaces').updateOne(filter, update);
    } catch (err) {
      console.warn('Unable to remove user from space:', err);
    }
    io.emit('user disconnect', {
      room,
      roomId,
      users: users[roomId],
    });
  });
});
