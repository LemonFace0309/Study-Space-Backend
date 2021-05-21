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
  socket.emit('me', socket.id)
  socket.on('disconnect', () => {
    socket.broadcast.emit('callended')
  })
  socket.on('calluser', ({ userToCall, signalData, from, name }) => {
    io.to(
      userToCall.emit('calluser', {
        signal: signalData,
        from,
        name,
      })
    )
  })
  socket.on('answercall', (data) => {
    io.to(data.to).emit('callaccepted', data.signal)
  })
})
