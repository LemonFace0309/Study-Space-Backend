const Spaces = require('../models/Spaces');
const dbConnect = require('../utils/dbConnect');
const removeParticipantFromSpace = async (spaceId, userId) => {
  await dbConnect();
  let space = {};
  try {
    // $pull removes the specified element from an array in mongoDB.
    const filter = { spaceId };
    const update = {
      $pull: { participants: userId },
    };

    // Mongoose returns the space before the update occurs by default.
    // {new:true} is the option argument that tells mongoose to return the space after the update occurs.
    // populate('participants') fetches the corresponding User object for each object ID in the Space's participants attribute.
    // Mongoose queries are not Promises by default. exec() turns the query into a Promise so we can use async/await after calling populate()
    space = await Space.findOneAndUpdate(filter, update, { new: true }).populate('participants').exec();

    console.debug('Updated space after removing a participant:', space);
  } catch (err) {
    console.debug('Cannot upload new space to database: ', err);
  }
  return space;
};
