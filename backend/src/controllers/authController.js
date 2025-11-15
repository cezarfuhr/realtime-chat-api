const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const user = await User.create({ username, email, password });

    const token = generateToken(user._id);

    logger.info(`User registered: ${user.username}`);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    // Update user status
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    logger.info(`User logged in: ${user.username}`);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};

    if (username) updates.username = username;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    );

    logger.info(`User profile updated: ${user.username}`);

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update push token
exports.updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;

    await User.findByIdAndUpdate(req.userId, { pushToken });

    logger.info(`Push token updated for user: ${req.user.username}`);

    res.json({ message: 'Push token updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      status: 'offline',
      lastSeen: new Date(),
      socketId: null
    });

    logger.info(`User logged out: ${req.user.username}`);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
