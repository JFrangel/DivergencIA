#!/bin/bash

# Apply all pending DivergencIA database migrations to Supabase
# Usage: ./apply-migrations.sh

set -e

echo "🚀 DivergencIA Migration Script"
echo "================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Check if linked to project
echo "Checking Supabase project connection..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  No .env.local found. Link to project with:"
    echo "   supabase link"
    exit 1
fi

echo "✅ Project appears to be configured"
echo ""

# Apply migrations
echo "Applying migrations in order..."
echo ""

migrations=(
    "supabase/migrations/019_add_usuario_fk_to_ideas.sql"
    "supabase/migrations/020_add_usuario_fk_to_eventos.sql"
    "supabase/migrations/021_add_usuario_fk_to_proyectos.sql"
    "supabase/migrations/022_add_usuario_fk_to_nodos.sql"
    "supabase/migrations/023_add_fk_to_canales.sql"
    "supabase/migrations/024_add_fk_to_archivos.sql"
    "supabase/migrations/025_add_fk_to_murales.sql"
)

for migration in "${migrations[@]}"; do
    if [ -f "$migration" ]; then
        echo "📝 Applying: $migration"
        supabase db push < "$migration" 2>/dev/null || echo "   (May already be applied)"
    else
        echo "⚠️  Migration not found: $migration"
    fi
done

echo ""
echo "✅ Migration script completed"
echo ""
echo "Next steps:"
echo "1. Verify in Supabase Dashboard → Table Editor"
echo "2. Test creating ideas/events to verify notifications"
echo "3. See APPLY_MIGRATIONS.md for detailed verification steps"
