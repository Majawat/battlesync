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

- **Simple**: 5 database tables max (v1 had 17)
- **Fast**: Express + SQLite + React (no complex ORM)  
- **Focused**: Battle tracking only (no premature features)
- **Mobile**: Built mobile-first with TailwindCSS

## 📁 Next Steps

1. Set up basic Node.js + Express backend
2. Set up React + Vite frontend  
3. Implement auth + army import
4. Build core battle tracking
5. Add polish + mobile optimization

---
*Starting fresh with lessons learned from v1's complexity.*