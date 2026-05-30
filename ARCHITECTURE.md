# Church Clerk Frontend Architecture

## Overview

The Church Clerk frontend consists of two completely independent applications:

1. **church-clerk-frontend** - User-facing dashboard for church management
2. **church-clerk-admin** - System admin dashboard for platform administration

Both apps share the same backend API (`church-clerk-backend`) but have independent frontend codebases.

## Architecture Principles

### 1. Separation of Concerns

- **Components** - UI only, no business logic
- **Hooks** - State management and business logic
- **Services** - API calls and data fetching
- **Pages** - Composition of components only

### 2. Shared Component Library

Both apps maintain their own `shared/` directory with reusable components:

```
src/shared/
├── components/
│   ├── KpiCard/          - Metric display card with delta indicators
│   ├── StatusChip/       - Status badge component
│   ├── DateRangeFilter/  - Date range picker for filtering
│   ├── Button/           - Standardized button component (primary, secondary, danger, ghost)
│   ├── Select/           - Standardized select dropdown
│   ├── Input/            - Standardized text input
│   ├── FileUploadButton/ - File upload trigger button
│   ├── Modal/            - Generic modal wrapper
│   └── ProtectedRoute/   - Route protection wrapper
├── hooks/
│   ├── usePagination/    - Pagination state management
│   ├── useFilters/       - Filter state management
│   └── useDashboardNavigator/ - Navigation helper
├── services/
│   └── http.js           - Axios instance with interceptors
└── utils/
    ├── debounce.js       - Debounce utility
    └── toast.js          - Toast notification helpers
```

### 3. Independent Application Structure

Each app has its own:

- **Entry point** (`main.jsx`)
- **App component** (`App/App.jsx`)
- **Routing system** (`App/routes/`)
- **Layouts** (`layouts/`)
- **Feature modules** (`features/`)
- **Context providers** (Auth, Permissions, Church)

## Component Guidelines

### Creating New Components

1. **UI Components** - Place in `shared/components/` if reusable across features
2. **Feature Components** - Place in `features/{feature}/components/` if feature-specific
3. **Page Components** - Place in `features/{feature}/pages/` - should only compose other components

### Component Structure

```jsx
// Good: UI component with props only
function Button({ children, onClick, variant }) {
  return (
    <button onClick={onClick} className={`btn-${variant}`}>
      {children}
    </button>
  );
}

// Good: Hook for business logic
function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await memberService.getAll();
      setMembers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { members, loading, fetchMembers };
}

// Good: Service for API calls
export const memberService = {
  getAll: () => http.get('/members'),
  create: (data) => http.post('/members', data),
  update: (id, data) => http.put(`/members/${id}`, data),
  delete: (id) => http.delete(`/members/${id}`)
};

// Good: Page composition only
function MembersPage() {
  const { members, loading, fetchMembers } = useMembers();
  const { filters, updateFilter } = useFilters();

  return (
    <PageLayout>
      <MemberFilters filters={filters} onFilterChange={updateFilter} />
      <MemberTable members={members} loading={loading} />
    </PageLayout>
  );
}
```

## Service Layer

### HTTP Client

Each app has its own `shared/services/http.js` with:

- Axios instance configured for the app
- Request interceptors for auth headers and CSRF tokens
- Response interceptors for error handling
- Progress indicators (user app uses NProgress)

### API Services

Feature-specific API services are in `features/{feature}/services/`:

```js
// features/member/services/member.api.js
import http from '../../../shared/services/http.js';

export function getMembers(params) {
  return http.get('/members', { params });
}

export function createMember(data) {
  return http.post('/members', data);
}
```

## State Management

### Context Providers

Each app uses React Context for global state:

**User App:**
- `AuthProvider` - Authentication state
- `PermissionProvider` - Permission checks
- `ChurchProvider` - Active church context

**Admin App:**
- `AuthProvider` - Authentication state
- `PermissionProvider` - Permission checks
- `ChurchProvider` - Church viewing context

### Feature State

Feature-specific state uses custom hooks:

```js
// features/member/member.store.js
const MemberContext = createContext(null);

export function MemberProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({});

  const value = useMemo(() => ({
    members,
    setMembers,
    filters,
    setFilters,
    fetchMembers: async (params) => {
      const data = await getMembers(params);
      setMembers(data);
    }
  }), [members, filters]);

  return (
    <MemberContext.Provider value={value}>
      {children}
    </MemberContext.Provider>
  );
}
```

## Routing

### User App Routes

Defined in `src/app/routes.jsx`:
- Dashboard
- Members
- Attendance
- Events
- Financials
- Settings
- etc.

### Admin App Routes

Defined in `src/App/routes/index.jsx`:
- System Dashboard
- Church Management
- User Management
- Activity Logs
- Settings
- etc.

## Styling

Both apps use Tailwind CSS for styling. Responsive design is handled via Tailwind breakpoints:

- `sm:` - 640px+
- `md:` - 768px+
- `lg:` - 1024px+
- `xl:` - 1280px+

Global responsive overrides are in `src/styles/index.css`.

## Key Differences Between Apps

### User App (`church-clerk-frontend`)

- Target: Church administrators and staff
- Features: Member management, attendance, events, financials
- Auth: Church-specific authentication
- Context: Single church context (with branch switching)
- Progress: NProgress integration

### Admin App (`church-clerk-admin`)

- Target: System administrators
- Features: Church management, platform analytics, user management
- Auth: System admin authentication
- Context: Multi-church viewing capability
- Progress: No NProgress (simpler UI)

## Migration Guide

### Extracting a Component to Shared

1. Create component in `shared/components/{ComponentName}/`
2. Add `index.jsx` for clean imports
3. Update consuming files to import from shared
4. Remove local component definition
5. Copy to admin app if needed

### Extracting Business Logic to a Hook

1. Create hook in `shared/hooks/{hookName}/` or `features/{feature}/hooks/`
2. Move state and logic from component to hook
3. Return state and functions from hook
4. Update component to use hook

### Creating a New Feature

1. Create feature directory: `features/{feature}/`
2. Add subdirectories: `components/`, `pages/`, `services/`, `hooks/`
3. Create API service in `services/`
4. Create UI components in `components/`
5. Create page component in `pages/`
6. Add route to app routing
7. Add navigation link if needed

## Testing

Before deploying changes:

1. Test user app locally: `cd church-clerk-frontend && npm run dev`
2. Test admin app locally: `cd church-clerk-admin && npm run dev`
3. Verify responsive design on mobile/tablet
4. Check all API calls work correctly
5. Verify authentication flows
6. Test permission-based UI elements

## File Naming Conventions

- Components: PascalCase (`MemberTable.jsx`)
- Hooks: camelCase with `use` prefix (`useMembers.js`)
- Services: camelCase (`member.api.js`)
- Utils: camelCase (`debounce.js`)
- Pages: PascalCase with `Page` suffix (`MembersPage.jsx`)

## Best Practices

1. **Keep components small** - Single responsibility
2. **Avoid prop drilling** - Use context for deep state
3. **Memoize expensive operations** - Use `useMemo` and `useCallback`
4. **Handle loading states** - Show skeletons or spinners
5. **Handle errors gracefully** - Show user-friendly messages
6. **Use TypeScript** - For type safety (if migrating)
7. **Write tests** - Unit tests for hooks, integration tests for pages
8. **Document complex logic** - Comments for non-obvious code
