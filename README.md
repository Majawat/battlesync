# BattleSync

A self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with comprehensive army management and real-time battle tracking.

## ✨ Features

🟢 **Production Ready**
- ✅ Multi-user authentication with role-based access control
- ✅ Gaming group management with invite codes
- ✅ Campaign system with configurable settings
- ✅ Mission management with objectives and special rules
- ✅ Army management with ArmyForge integration
- ✅ Real-time battle tracking with WebSockets
- ✅ Mobile-first responsive design
- ✅ Docker deployment ready

🟡 **In Development**
- ⚠️ Enhanced battle features (individual unit tracking)
- ⚠️ Advanced army validation and composition checking
- ⚠️ Battle analytics and reporting

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone and start**:
```bash
git clone https://github.com/yourusername/battlesync.git
cd battlesync
docker-compose up -d
```

2. **Access the application**:
- Frontend: http://localhost:3002
- API: http://localhost:3001
- Health check: http://localhost:3001/health

3. **Demo credentials**:
- Username: `admin`
- Password: `admin123`

### Local Development

1. **Prerequisites**: Node.js 18+, PostgreSQL 15+, Docker & Docker Compose

2. **Install dependencies**:
```bash
npm install
cd frontend && npm install
```

3. **Start development**:
```bash
docker-compose up -d
npm run dev              # Backend
cd frontend && npm run dev  # Frontend
```

4. **Development tools**:
```bash
npm run db:studio        # Database GUI
npm run test            # Test suite
npm run lint            # Code linting
```

## 🏗️ Architecture

**Full-stack TypeScript application:**
- **Backend**: Node.js/Express with Prisma ORM
- **Frontend**: React 18+ with TailwindCSS
- **Database**: PostgreSQL with real-time WebSockets
- **Deployment**: Docker Compose ready
- **Authentication**: JWT with role-based access control

## 📚 Documentation

### **🎯 For New Users**
- **[Quick Start](#-quick-start)** - Get BattleSync running in 5 minutes
- **[Features Guide](./docs/user/FEATURES.md)** - What BattleSync can do

### **🔧 For Developers**  
- **[Project Overview](./docs/PROJECT_OVERVIEW.md)** - Comprehensive project status and roadmap
- **[Architecture](./docs/technical/ARCHITECTURE.md)** - System design at `src/` level
- **[API Reference](./docs/technical/API_REFERENCE.md)** - All REST endpoints and WebSocket events
- **[Data Models](./docs/technical/DATA_MODELS.md)** - Database schema and TypeScript interfaces
- **[External APIs](./docs/technical/API_INTEGRATIONS.md)** - ArmyForge and other integrations

### **🤖 For AI Assistants**
- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive project context and instructions
- **[AI Project Map](./docs/AI_PROJECT_MAP.md)** - Machine-readable codebase overview with file purposes
- **[OPR Conversion](./docs/technical/OPR_ARMY_CONVERSION.md)** - Complex army conversion system details  
- **[Current Tasks](./docs/development/TODO.md)** - Active development priorities

## 🎯 One Page Rules Integration

BattleSync specializes in **One Page Rules** tabletop gaming:
- **ArmyForge Integration**: Import armies directly from army-forge.onepagerules.com
- **OPR Game Systems**: Support for Grimdark Future, Age of Fantasy, Firefight, Warfleets FTL
- **Combined Units**: Smart handling of OPR combined unit rules
- **Hero Joining**: Proper hero-to-unit joining mechanics
- **Battle Tracking**: Real-time damage tracking optimized for tablet use

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/battlesync/issues)
- **AI Assistant**: This project includes comprehensive [Claude.md](./CLAUDE.md) instructions for AI-assisted development

---

**BattleSync v1.1.2** - Built for the One Page Rules community 🎲