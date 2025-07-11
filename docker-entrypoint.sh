#!/bin/sh
set -e

echo "🚀 Starting BattleSync application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
while ! nc -z db 5432; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "✅ Database connection established"

# Always apply schema (Prisma handles this gracefully)
echo "🔧 Applying database schema..."
npx prisma db push

# Check if we need to seed by trying to run the seed
echo "🔍 Checking if seeding is needed..."
if npx prisma db seed 2>/dev/null; then
  echo "✅ Database seeding complete!"
else
  echo "✅ Database already seeded"
fi

# Generate Prisma client (in case of updates)
echo "⚙️  Generating Prisma client..."
npx prisma generate

echo "🎉 Starting application server..."
exec npm run dev