const express = require('express')

const app = express()

const server = app.listen(process.env.PORT || 8080)
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})