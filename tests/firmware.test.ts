import request from 'supertest';
import { app } from '../src/server';
import { db } from '../src/database/db';
import path from 'path';
import { promises as fs } from 'fs';

describe('Firmware API', () => {
  beforeAll(async () => {
    await db.initialize();
  });

  beforeEach(async () => {
    // Clean up firmware table and files before each test
    await db.run('DELETE FROM firmware');
    
    // Clean up any test firmware files
    try {
      const firmwareDir = path.join(__dirname, '../firmware');
      const files = await fs.readdir(firmwareDir);
      for (const file of files) {
        if (file.startsWith('battleaura-') && file.endsWith('.bin')) {
          await fs.unlink(path.join(firmwareDir, file));
        }
      }
    } catch (error) {
      // Directory might not exist, ignore
    }
  });

  afterAll(async () => {
    await db.close();
  });

  describe('GET /api/battleaura/firmware/latest', () => {
    it('should return 404 when no firmware exists', async () => {
      const response = await request(app)
        .get('/api/battleaura/firmware/latest');

      expect(response.status).toBe(404);
      expect(response.body.version).toBe('');
      expect(response.body.changelog).toBe('No firmware available');
    });

    it('should return latest firmware when available', async () => {
      // Insert test firmware
      await db.run(`
        INSERT INTO firmware (version, filename, changelog, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
      `, ['1.0.0', 'battleaura-1.0.0.bin', 'Initial release', 1024, '2025-01-15T10:30:00Z']);

      await db.run(`
        INSERT INTO firmware (version, filename, changelog, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
      `, ['1.0.1', 'battleaura-1.0.1.bin', 'Bug fixes', 1050, '2025-01-16T10:30:00Z']);

      const response = await request(app)
        .get('/api/battleaura/firmware/latest');

      expect(response.status).toBe(200);
      expect(response.body.version).toBe('1.0.1');
      expect(response.body.changelog).toBe('Bug fixes');
      expect(response.body.file_size).toBe(1050);
      expect(response.body.download_url).toContain('/firmware/battleaura-1.0.1.bin');
      expect(response.body.released).toBe('2025-01-16T10:30:00Z');
    });
  });

  describe('POST /api/firmware/upload', () => {
    const createTestBinary = () => Buffer.from('fake firmware binary data');

    it('should upload firmware successfully', async () => {
      const testBinary = createTestBinary();
      
      const response = await request(app)
        .post('/api/firmware/upload')
        .field('version', '1.2.3')
        .field('changelog', 'Test release')
        .attach('file', testBinary, 'firmware.bin');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.firmware).toBeDefined();
      expect(response.body.firmware.version).toBe('1.2.3');
      expect(response.body.firmware.changelog).toBe('Test release');
      expect(response.body.firmware.file_size).toBe(testBinary.length);
      expect(response.body.firmware.download_url).toContain('/firmware/battleaura-1.2.3.bin');

      // Verify firmware was stored in database
      const stored = await db.get('SELECT * FROM firmware WHERE version = ?', ['1.2.3']);
      expect(stored).toBeDefined();
      expect(stored.filename).toBe('battleaura-1.2.3.bin');
      expect(stored.changelog).toBe('Test release');
    });

    it('should handle version with v prefix', async () => {
      const testBinary = createTestBinary();
      
      const response = await request(app)
        .post('/api/firmware/upload')
        .field('version', 'v1.2.3')
        .field('changelog', 'Test release')
        .attach('file', testBinary, 'firmware.bin');

      expect(response.status).toBe(201);
      expect(response.body.firmware.version).toBe('1.2.3'); // Should strip 'v' prefix
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/firmware/upload')
        .field('version', '1.2.3');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should reject upload without version', async () => {
      const testBinary = createTestBinary();
      
      const response = await request(app)
        .post('/api/firmware/upload')
        .attach('file', testBinary, 'firmware.bin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Version is required');
    });

    it('should reject invalid semantic version', async () => {
      const testBinary = createTestBinary();
      
      const response = await request(app)
        .post('/api/firmware/upload')
        .field('version', 'invalid-version')
        .attach('file', testBinary, 'firmware.bin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Version must be in semantic version format (e.g., 1.2.3)');
    });

    it('should reject duplicate version', async () => {
      const testBinary = createTestBinary();
      
      // First upload
      await request(app)
        .post('/api/firmware/upload')
        .field('version', '1.2.3')
        .attach('file', testBinary, 'firmware.bin');

      // Second upload with same version
      const response = await request(app)
        .post('/api/firmware/upload')
        .field('version', '1.2.3')
        .attach('file', testBinary, 'firmware.bin');

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Version 1.2.3 already exists');
    });

    it('should handle changelog parameter', async () => {
      const testBinary = createTestBinary();
      
      const response = await request(app)
        .post('/api/firmware/upload')
        .field('version', '1.2.3')
        .field('changelog', 'Fixed critical bug in LED handling')
        .attach('file', testBinary, 'firmware.bin');

      expect(response.status).toBe(201);
      expect(response.body.firmware.changelog).toBe('Fixed critical bug in LED handling');
    });

    it('should work without changelog', async () => {
      const testBinary = createTestBinary();
      
      const response = await request(app)
        .post('/api/firmware/upload')
        .field('version', '1.2.3')
        .attach('file', testBinary, 'firmware.bin');

      expect(response.status).toBe(201);
      expect(response.body.firmware.changelog).toBe('');
    });
  });

  describe('GET /api/battleaura/firmware', () => {
    it('should return empty list when no firmware exists', async () => {
      const response = await request(app)
        .get('/api/battleaura/firmware');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.firmware).toEqual([]);
    });

    it('should return all firmware versions in reverse chronological order', async () => {
      // Insert test firmware in specific order
      await db.run(`
        INSERT INTO firmware (version, filename, changelog, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
      `, ['1.0.0', 'battleaura-1.0.0.bin', 'Initial release', 1024, '2025-01-15T10:30:00Z']);

      await db.run(`
        INSERT INTO firmware (version, filename, changelog, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
      `, ['1.0.1', 'battleaura-1.0.1.bin', 'Bug fixes', 1050, '2025-01-16T10:30:00Z']);

      await db.run(`
        INSERT INTO firmware (version, filename, changelog, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
      `, ['1.1.0', 'battleaura-1.1.0.bin', 'New features', 1100, '2025-01-17T10:30:00Z']);

      const response = await request(app)
        .get('/api/battleaura/firmware');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.firmware).toHaveLength(3);
      
      // Should be in reverse chronological order (newest first)
      expect(response.body.firmware[0].version).toBe('1.1.0');
      expect(response.body.firmware[1].version).toBe('1.0.1');
      expect(response.body.firmware[2].version).toBe('1.0.0');
      
      // Verify structure of first item
      expect(response.body.firmware[0]).toEqual({
        version: '1.1.0',
        download_url: expect.stringContaining('/firmware/battleaura-1.1.0.bin'),
        changelog: 'New features',
        released: '2025-01-17T10:30:00Z',
        file_size: 1100
      });
    });
  });

  describe('GET /api/battleaura/firmware/:version', () => {
    beforeEach(async () => {
      // Insert test firmware
      await db.run(`
        INSERT INTO firmware (version, filename, changelog, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
      `, ['1.2.3', 'battleaura-1.2.3.bin', 'Test version', 2048, '2025-01-18T10:30:00Z']);
    });

    it('should return specific firmware version', async () => {
      const response = await request(app)
        .get('/api/battleaura/firmware/1.2.3');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.firmware).toEqual({
        version: '1.2.3',
        download_url: expect.stringContaining('/firmware/battleaura-1.2.3.bin'),
        changelog: 'Test version',
        released: '2025-01-18T10:30:00Z',
        file_size: 2048
      });
    });

    it('should return 404 for non-existent version', async () => {
      const response = await request(app)
        .get('/api/battleaura/firmware/9.9.9');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Firmware version 9.9.9 not found');
    });

    it('should reject invalid version format', async () => {
      const response = await request(app)
        .get('/api/battleaura/firmware/invalid-version');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid version format. Expected semantic version (e.g., 1.2.3)');
    });

    it('should handle version with missing changelog', async () => {
      // Insert firmware without changelog
      await db.run(`
        INSERT INTO firmware (version, filename, file_size, uploaded_at)
        VALUES (?, ?, ?, ?)
      `, ['2.0.0', 'battleaura-2.0.0.bin', 3000, '2025-01-19T10:30:00Z']);

      const response = await request(app)
        .get('/api/battleaura/firmware/2.0.0');

      expect(response.status).toBe(200);
      expect(response.body.firmware.changelog).toBe('');
    });
  });

  describe('Firmware file serving', () => {
    it('should serve firmware files with correct headers', async () => {
      // Create a test firmware file
      const testBinary = Buffer.from('fake firmware binary data');
      const firmwarePath = path.join(__dirname, '../firmware/battleaura-1.0.0.bin');
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(firmwarePath), { recursive: true });
      await fs.writeFile(firmwarePath, testBinary);

      const response = await request(app)
        .get('/firmware/battleaura-1.0.0.bin');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('battleaura-1.0.0.bin');
      expect(response.body).toEqual(testBinary);

      // Clean up
      await fs.unlink(firmwarePath);
    });

    it('should return 404 for non-existent firmware', async () => {
      const response = await request(app)
        .get('/firmware/non-existent.bin');

      expect(response.status).toBe(404);
    });
  });
});