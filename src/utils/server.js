exports.addUserToRoom = ({ roomId, userId, username, role }, usersArr, socket) => {
  if (usersArr[roomId]) {
    const { length } = usersArr[roomId];
    if (length === 15) {
      socket.emit('room full');
      return;
    }
    usersArr[roomId].push({
      socketId: socket.id,
      username,
      userId,
      role,
    });
  } else {
    // eslint-disable-next-line no-param-reassign
    usersArr[roomId] = [{ socketId: socket.id, username, userId, role }];
  }
};
