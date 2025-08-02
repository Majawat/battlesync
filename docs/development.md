# Development Setup

Get BattleSync v2 running locally for development.

## Prerequisites

- **Node.js 20 LTS** or higher
- **Docker** and **Docker Compose** (optional but recommended)
- **Git**

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Majawat/battlesync.git
   cd battlesync
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Visit:** http://localhost:4019

## Development Commands

### Local Development
```bash
npm run dev          # Start dev server with hot reload
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run typecheck    # Check TypeScript types
npm run build        # Build for production
npm start            # Start production server
```

### Docker Development
```bash
npm run docker:build    # Build Docker image
npm run docker:run      # Run single container
npm run docker:up       # Start with Docker Compose
npm run docker:down     # Stop Docker Compose
npm run docker:dev      # Development with hot reload
npm run docker:logs     # View container logs
```

## Project Structure

```
src/
  server.ts           # Main Express server (TypeScript)
tests/
  server.test.ts      # API tests (TypeScript)
docs/                 # Documentation
dist/                 # Compiled JavaScript (generated)
Dockerfile            # Production Docker image
Dockerfile.dev        # Development Docker image
docker-compose.yml    # Production Docker Compose
docker-compose.dev.yml # Development Docker Compose
tsconfig.json         # TypeScript configuration
jest.config.js        # Jest configuration with ts-jest
package.json          # Dependencies and scripts
CLAUDE.md             # Claude Code guidance
```

## Development Workflow

**ALWAYS follow this workflow for any changes:**

1. **Write/modify TypeScript code** with proper types
2. **Run type checking:** `npm run typecheck`
3. **Run tests:** `npm test`
4. **Update version numbers** in package.json and code
5. **Update documentation** (CLAUDE.md, docs/)
6. **Commit with descriptive messages** and push

## Testing

- **Framework:** Jest + ts-jest + Supertest
- **Location:** `tests/` directory
- **Run:** `npm test` or `npm run test:watch`

### Adding Tests

```typescript
import request from 'supertest';
import { app, server } from '../src/server';

describe('Feature Tests', () => {
  afterAll(() => {
    server.close();
  });

  test('should do something', async () => {
    const response = await request(app).get('/endpoint');
    expect(response.status).toBe(200);
  });
});
```

## Docker Development

### Production Container
- Uses Node.js 20 LTS Alpine
- Multi-stage build for optimized size
- Health checks included
- Runs on port 4019

### Development Container
- Hot reloading with volume mounts
- All dev dependencies included
- Same port (4019)

## Port Information

**Port 4019** - Warhammer 40k + Horus Heresy reference
- Avoids high port connectivity issues
- Memorable for Warhammer fans
- Reliable port range for development

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:4019 | xargs -r kill -9
```

### Docker Issues
```bash
docker system prune    # Clean up Docker
npm run docker:down    # Stop all containers
```

### TypeScript Errors
```bash
npm run typecheck      # Check types
rm -rf dist/ && npm run build  # Clean rebuild
```

## Contributing

1. Follow the development workflow above
2. Keep changes focused and atomic
3. Update tests for new features
4. Update documentation
5. Ensure all checks pass before committing

---

*Happy coding! 🎯*