const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let redisPublisher = null;
let redisSubscriber = null;

const createRedisClient = async () => {
  const client = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
    legacyMode: false
  });

  client.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  client.on('reconnecting', () => {
    logger.warn('Redis reconnecting');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  await client.connect();
  return client;
};

const initRedis = async () => {
  try {
    redisClient = await createRedisClient();
    redisPublisher = redisClient.duplicate();
    redisSubscriber = redisClient.duplicate();

    await redisPublisher.connect();
    await redisSubscriber.connect();

    logger.info('Redis clients initialized successfully');

    return { redisClient, redisPublisher, redisSubscriber };
  } catch (error) {
    logger.error('Redis initialization failed:', error);
    throw error;
  }
};

const getRedisClient = () => redisClient;
const getRedisPublisher = () => redisPublisher;
const getRedisSubscriber = () => redisSubscriber;

const closeRedis = async () => {
  if (redisClient) await redisClient.quit();
  if (redisPublisher) await redisPublisher.quit();
  if (redisSubscriber) await redisSubscriber.quit();
  logger.info('Redis connections closed');
};

module.exports = {
  initRedis,
  getRedisClient,
  getRedisPublisher,
  getRedisSubscriber,
  closeRedis
};
