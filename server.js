const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())

app.get('/', (req, res) => {
  res.send('Server is running')
})

const server = app.listen(process.env.PORT || 8080)
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
io.on('connection', (socket) => {
  console.log('connection!', socket.id)
  socket.on('getId', () => {
    socket.emit('me', socket.id)
  })
  socket.on('disconnect', () => {
    socket.broadcast.emit('callended')
  })
  socket.on('callUser', ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit('callUser', {
      signal: signalData,
      from,
      name,
    })
  })
  socket.on('answerCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal)
  })
})
