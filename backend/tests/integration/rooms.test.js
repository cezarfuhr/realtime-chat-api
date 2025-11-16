const request = require('supertest');
const app = require('../../src/index');
const User = require('../../src/models/User');

let token, userId;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const res = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'roomtester',
      email: 'roomtester@example.com',
      password: 'password123'
    });

  token = res.body.token;
  userId = res.body.user._id;
});

describe('Rooms API Integration Tests', () => {
  describe('POST /api/rooms', () => {
    test('should create a public room', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Room',
          description: 'A test room',
          type: 'public'
        });

      expect(res.status).toBe(201);
      expect(res.body.room).toBeDefined();
      expect(res.body.room.name).toBe('Test Room');
      expect(res.body.room.type).toBe('public');
    });

    test('should create a private room', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Private Room',
          type: 'private'
        });

      expect(res.status).toBe(201);
      expect(res.body.room.type).toBe('private');
    });

    test('should not create room without authentication', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({
          name: 'Test Room'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/rooms', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Room 1',
          type: 'public'
        });

      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Room 2',
          type: 'private'
        });
    });

    test('should get all rooms user is member of', async () => {
      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms).toBeDefined();
      expect(res.body.rooms.length).toBeGreaterThan(0);
    });

    test('should filter rooms by type', async () => {
      const res = await request(app)
        .get('/api/rooms?type=public')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms).toBeDefined();
      res.body.rooms.forEach(room => {
        expect(room.type).toBe('public');
      });
    });
  });

  describe('GET /api/rooms/:id', () => {
    let roomId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Single Room Test'
        });

      roomId = res.body.room._id;
    });

    test('should get room by id', async () => {
      const res = await request(app)
        .get(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.room).toBeDefined();
      expect(res.body.room._id).toBe(roomId);
    });

    test('should return 404 for non-existent room', async () => {
      const res = await request(app)
        .get('/api/rooms/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/rooms/:id', () => {
    let roomId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Update Test Room'
        });

      roomId = res.body.room._id;
    });

    test('should update room', async () => {
      const res = await request(app)
        .put(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Room Name',
          description: 'Updated description'
        });

      expect(res.status).toBe(200);
      expect(res.body.room.name).toBe('Updated Room Name');
      expect(res.body.room.description).toBe('Updated description');
    });
  });
});
