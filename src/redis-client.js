const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient({
  post: process.env.REDIS_PORT,
  host: process.env.REDIS_URL,
});

module.exports = {
  lrange: promisify(client.lrange).bind(client),
  lpush: promisify(client.lpush).bind(client),
  rpush: promisify(client.rpush).bind(client),
  getAsync: promisify(client.get).bind(client),
  setAsync: promisify(client.set).bind(client),
  keysAsync: promisify(client.keys).bind(client),
};
