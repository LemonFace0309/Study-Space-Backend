const { MongoClient } = require('mongodb');

let dbClient;

const dbConnect = async () => {
  if (!dbClient) {
    dbClient = new MongoClient(process.env.DATABASE_URL);
    try {
      await dbClient.connect();
    } catch (err) {
      console.debug('Unable to connect to database:', err);
    }
  }
  return dbClient;
};

module.exports = dbConnect;
