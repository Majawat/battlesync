# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BattleSync v2 is a clean rewrite of an OPR (One Page Rules) battle tracker application, focused on simplicity and core functionality. This is a fresh start from a more complex v1 (170+ files) that has been archived.

## Architecture Goals

- **Simple**: Minimuze complexity as needed
- **Fast**: Express + SQLite + React stack with no complex ORM
- **Focused**: Battle tracking only, avoiding premature features
- **Mobile**: Mobile-first design using TailwindCSS

## Current State

TypeScript backend implemented with Express server, health endpoints, and test suite. All code uses strict TypeScript for type safety.

## Tech Stack

- **Backend**: Node.js + Express + SQLite + TypeScript
- **Frontend**: React + Vite (planned)
- **Styling**: TailwindCSS (mobile-first, planned)
- **Database**: SQLite (simple, no ORM)
- **Testing**: Jest + ts-jest + Supertest

## Development Phases

When implementing features, follow this planned progression:
1. Set up basic Node.js + Express backend
2. Set up React + Vite frontend
3. Implement authentication + army import from ArmyForge
4. Build core battle tracking functionality
5. Add polish + mobile optimization

## Core Features to Implement

- Import armies from ArmyForge
- Track damage during OPR battles
- Basic undo functionality for mistakes
- View battle history

## Database Design

Keep database schema simple with maximum 5 tables. Consider tables for:
- Users/Authentication
- Armies
- Battles
- Battle Events/Actions
- Possibly army units or battle participants

## Legacy Reference

Previous v1.5.2 implementation is archived at git tag `v1.5.2-final-archive` and can be referenced for feature ideas, but avoid complexity patterns from v1.

## Development Commands

- `npm install` - Install dependencies
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server from built files (port 3001)
- `npm run dev` - Start development server with ts-node-dev
- `npm test` - Run test suite with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run typecheck` - Check TypeScript types without building

## Development Workflow

**ALWAYS follow this workflow for any changes:**
1. Write/modify TypeScript code with proper types
2. Run `npm run typecheck` to ensure TypeScript compilation
3. Run `npm test` to ensure all tests pass
4. Update version numbers in package.json and code
5. Update documentation (CLAUDE.md, comments)
6. Commit with descriptive messages and push

## API Endpoints

- `GET /` - API info and version
- `GET /health` - Health check endpoint

## Project Structure

```
src/
  server.ts       # Main Express server (TypeScript)
tests/
  server.test.ts  # API tests (TypeScript)
dist/             # Compiled JavaScript (generated)
tsconfig.json     # TypeScript configuration
jest.config.js    # Jest configuration with ts-jest
package.json      # Dependencies and scripts
```