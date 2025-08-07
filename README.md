# BattleSync v2 - Simple OPR Battle Tracker

A clean rewrite focused on core battle tracking functionality.

## 🎯 What This Does

- Import armies from ArmyForge  
- Track damage during OPR battles
- Basic undo for mistakes
- View battle history

## 🔄 v1 Archive

The previous complex version (v1.5.2) is archived at git tag `v1.5.2-final-archive`.

```bash
# View archived v1 code
git show v1.5.2-final-archive

# See what we had before
git ls-tree -r v1.5.2-final-archive | wc -l  # 170+ files
```

## 🚀 v2 Philosophy

- **Simple**: Minimal database schema (9 tables vs v1's 17)
- **Fast**: Express + SQLite + React (no complex ORM)  
- **Focused**: Battle tracking only (no premature features)
- **Mobile**: Built mobile-first with TailwindCSS

## 🚀 Current Status (v2.6.1)

✅ **Army Import System**: Complete ArmyForge integration with OPR unit processing  
✅ **Backend Complete**: TypeScript Express server with SQLite storage and Docker  
✅ **Testing**: 17 comprehensive tests covering all functionality  
📋 **Next**: React frontend and battle tracking features

**Server**: http://localhost:4019 (Warhammer 40k themed port!)

## 📚 Documentation

Full documentation is available in the [docs/](docs/) folder:

- **[Features & Roadmap](docs/features.md)** - What we're building
- **[API Reference](docs/api.md)** - BattleSync API endpoints
- **[OPR API Reference](docs/opr-api-reference.md)** - One Page Rules API docs
- **[OPR Game Guide](docs/opr-guide.md)** - Grimdark Future mechanics
- **[Development Setup](docs/development.md)** - Get up and running
- **[Architecture](docs/architecture.md)** - Technical design

## 🛠️ Quick Start

```bash
# Clone and install
git clone https://github.com/Majawat/battlesync.git
cd battlesync
npm install

# Start development server
npm run dev

# Or use Docker
npm run docker:dev
```

Visit http://localhost:4019/health to verify it's running!

---
*Starting fresh with lessons learned from v1's complexity.*