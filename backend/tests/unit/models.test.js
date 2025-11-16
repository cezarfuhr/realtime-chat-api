const User = require('../../src/models/User');
const Room = require('../../src/models/Room');
const Message = require('../../src/models/Message');
const Notification = require('../../src/models/Notification');

describe('User Model', () => {
  test('should create a user successfully', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    const user = await User.create(userData);

    expect(user.username).toBe(userData.username);
    expect(user.email).toBe(userData.email);
    expect(user.password).not.toBe(userData.password); // Should be hashed
    expect(user.status).toBe('offline');
  });

  test('should hash password before saving', async () => {
    const user = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });

    expect(user.password).not.toBe('password123');
    expect(user.password.length).toBeGreaterThan(20);
  });

  test('should compare password correctly', async () => {
    const password = 'password123';
    const user = await User.create({
      username: 'testuser3',
      email: 'test3@example.com',
      password
    });

    const userWithPassword = await User.findById(user._id).select('+password');
    const isMatch = await userWithPassword.comparePassword(password);
    const isNotMatch = await userWithPassword.comparePassword('wrongpassword');

    expect(isMatch).toBe(true);
    expect(isNotMatch).toBe(false);
  });

  test('should validate required fields', async () => {
    const user = new User({});

    let error;
    try {
      await user.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.errors.username).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });

  test('should not include password in JSON', async () => {
    const user = await User.create({
      username: 'testuser4',
      email: 'test4@example.com',
      password: 'password123'
    });

    const json = user.toJSON();
    expect(json.password).toBeUndefined();
  });
});

describe('Room Model', () => {
  let user;

  beforeEach(async () => {
    user = await User.create({
      username: 'roomowner',
      email: 'owner@example.com',
      password: 'password123'
    });
  });

  test('should create a room successfully', async () => {
    const room = await Room.create({
      name: 'Test Room',
      type: 'public',
      owner: user._id,
      members: [{ user: user._id, role: 'admin' }]
    });

    expect(room.name).toBe('Test Room');
    expect(room.type).toBe('public');
    expect(room.owner.toString()).toBe(user._id.toString());
    expect(room.isActive).toBe(true);
  });

  test('should check if user is member', async () => {
    const room = await Room.create({
      name: 'Test Room',
      owner: user._id,
      members: [{ user: user._id, role: 'admin' }]
    });

    expect(room.isMember(user._id)).toBe(true);
    expect(room.isMember('507f1f77bcf86cd799439011')).toBe(false);
  });

  test('should add member to room', async () => {
    const newUser = await User.create({
      username: 'newmember',
      email: 'member@example.com',
      password: 'password123'
    });

    const room = await Room.create({
      name: 'Test Room',
      owner: user._id,
      members: [{ user: user._id, role: 'admin' }]
    });

    room.addMember(newUser._id);
    expect(room.isMember(newUser._id)).toBe(true);
    expect(room.members.length).toBe(2);
  });

  test('should remove member from room', async () => {
    const newUser = await User.create({
      username: 'newmember',
      email: 'member@example.com',
      password: 'password123'
    });

    const room = await Room.create({
      name: 'Test Room',
      owner: user._id,
      members: [
        { user: user._id, role: 'admin' },
        { user: newUser._id, role: 'member' }
      ]
    });

    room.removeMember(newUser._id);
    expect(room.isMember(newUser._id)).toBe(false);
    expect(room.members.length).toBe(1);
  });
});

describe('Message Model', () => {
  let user, room;

  beforeEach(async () => {
    user = await User.create({
      username: 'messageuser',
      email: 'msguser@example.com',
      password: 'password123'
    });

    room = await Room.create({
      name: 'Message Room',
      owner: user._id,
      members: [{ user: user._id, role: 'admin' }]
    });
  });

  test('should create a message successfully', async () => {
    const message = await Message.create({
      room: room._id,
      sender: user._id,
      content: 'Hello, world!',
      type: 'text'
    });

    expect(message.content).toBe('Hello, world!');
    expect(message.type).toBe('text');
    expect(message.deleted).toBe(false);
  });

  test('should mark message as read', async () => {
    const message = await Message.create({
      room: room._id,
      sender: user._id,
      content: 'Test message'
    });

    const reader = await User.create({
      username: 'reader',
      email: 'reader@example.com',
      password: 'password123'
    });

    message.markAsRead(reader._id);
    expect(message.readBy.length).toBe(1);
    expect(message.readBy[0].user.toString()).toBe(reader._id.toString());
  });

  test('should soft delete message', async () => {
    const message = await Message.create({
      room: room._id,
      sender: user._id,
      content: 'To be deleted'
    });

    message.softDelete();
    expect(message.deleted).toBe(true);
    expect(message.content).toBe('[Message deleted]');
    expect(message.deletedAt).toBeDefined();
  });
});

describe('Notification Model', () => {
  let user;

  beforeEach(async () => {
    user = await User.create({
      username: 'notifuser',
      email: 'notif@example.com',
      password: 'password123'
    });
  });

  test('should create a notification successfully', async () => {
    const notification = await Notification.create({
      user: user._id,
      type: 'message',
      title: 'New Message',
      message: 'You have a new message'
    });

    expect(notification.type).toBe('message');
    expect(notification.title).toBe('New Message');
    expect(notification.read).toBe(false);
  });

  test('should mark notification as read', async () => {
    const notification = await Notification.create({
      user: user._id,
      type: 'message',
      title: 'New Message',
      message: 'You have a new message'
    });

    notification.markAsRead();
    expect(notification.read).toBe(true);
    expect(notification.readAt).toBeDefined();
  });
});
