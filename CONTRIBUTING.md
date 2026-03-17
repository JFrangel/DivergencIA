# Guia de Contribucion — DivergencIA

Gracias por tu interes en contribuir al proyecto DivergencIA.

## Requisitos

- Node.js >= 18
- npm >= 9
- Cuenta de Supabase (para desarrollo local)

## Setup de desarrollo

1. Fork/clone el repositorio
2. `cd frontend && npm install`
3. Copia `.env.example` a `.env` y configura las credenciales
4. `npm run dev` para iniciar el servidor de desarrollo

## Convenciones de codigo

### Estructura de archivos
- **Componentes**: `PascalCase.jsx` en la carpeta correspondiente al modulo
- **Hooks**: `useCamelCase.js` en `src/hooks/`
- **Paginas**: `PascalCase.jsx` en `src/pages/app|public|admin/`
- **Utilidades**: `camelCase.js` en `src/lib/`

### Estilos
- Usar **Tailwind CSS v4** (utility-first)
- Usar **variables CSS** (`var(--c-primary)`, etc.) para colores del tema
- Clases utilitarias del proyecto: `.glass`, `.neon-border`, `.shimmer`, `.gradient-text`
- **No usar inline styles** cuando Tailwind puede manejar el caso
- Tipografia: `font-title` (Space Grotesk), `font-body` (Inter), `font-mono` (JetBrains Mono)

### Componentes
- JSX puro (sin TypeScript)
- Framer Motion para animaciones
- Iconos de `react-icons/fi` (Feather Icons)
- Exportar como `export default function ComponentName()`

### Base de datos
- Migraciones SQL en `supabase/migrations/`
- RLS obligatorio en toda tabla nueva
- Triggers para logica automatica (logros, contadores)

## Ramas

- `main` — produccion
- `develop` — desarrollo activo
- `feature/nombre` — features nuevas
- `fix/nombre` — bug fixes

## Commits

Formato: `tipo: descripcion corta`

Tipos: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`

Ejemplo: `feat: add /suggest command to ATHENIA terminal`

## Pull Requests

1. Crear PR contra `develop`
2. Incluir descripcion de cambios
3. Verificar que no hay errores en consola
4. Screenshots si hay cambios visuales

## Arquitectura

- **Modular**: cada feature es un modulo independiente en `components/`
- **Lazy loading**: paginas se cargan bajo demanda con `React.lazy()`
- **3D selectivo**: Three.js solo en Landing, Login, Universo, Zen, Athenia
- **Realtime**: Supabase subscriptions para feeds y comentarios
- **Temas**: CSS custom properties cambiadas dinamicamente

## Contacto

Semillero DivergencIA — semillero@universidad.edu
