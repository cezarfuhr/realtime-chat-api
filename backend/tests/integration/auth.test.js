const request = require('supertest');
const app = require('../../src/index');
const User = require('../../src/models/User');

// Wait for app to initialize
beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
});

describe('Auth API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.email).toBe('test@example.com');
    });

    test('should not register with duplicate email', async () => {
      await User.create({
        username: 'existing',
        email: 'existing@example.com',
        password: 'password123'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });

    test('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'password123'
      });
    });

    test('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      expect(res.body.user.status).toBe('online');
    });

    test('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    test('should not login with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'profileuser',
          email: 'profile@example.com',
          password: 'password123'
        });

      token = res.body.token;
    });

    test('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('profileuser');
    });

    test('should not get profile without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    test('should not get profile with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'updateuser',
          email: 'update@example.com',
          password: 'password123'
        });

      token = res.body.token;
    });

    test('should update user profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newusername',
          avatar: 'https://example.com/avatar.jpg'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('newusername');
      expect(res.body.user.avatar).toBe('https://example.com/avatar.jpg');
    });
  });
});
