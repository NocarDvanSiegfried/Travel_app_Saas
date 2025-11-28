# Code Style and Conventions

## General Principles

### TypeScript Configuration
- **Strict Mode**: Enabled for both backend and frontend
- **Null Safety**: Backend uses relaxed null checks, frontend uses strict
- **Module Resolution**: Node.js resolution for backend, bundler resolution for frontend
- **Path Aliases**: Frontend uses `@/*` for relative imports

### Backend Conventions

#### File Structure
```
src/
├── domain/               # Business entities and rules
├── application/          # Use cases and business logic
├── infrastructure/       # External integrations
├── presentation/        # API controllers and middleware
├── shared/              # Common utilities
└── types/               # Shared type definitions
```

#### Naming Conventions
- **Files**: kebab-case for files (`user-service.ts`, `route-builder.ts`)
- **Classes**: PascalCase for classes (`UserService`, `RouteBuilder`)
- **Interfaces**: PascalCase with 'I' prefix optional (`IUserRepository`)
- **Functions**: camelCase (`findUserById`, `createRouteTemplate`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`, `DEFAULT_TTL`)
- **Variables**: camelCase with descriptive names (`userId`, `routeRepository`)

#### Type Definitions
```typescript
// Entity interfaces
interface B2BUser {
  id: string;
  fullName: string;
  email: string;
  role: B2BUserRole;
  twoFactorEnabled: boolean;
}

// Union types for enums
type B2BUserRole = 'super_admin' | 'company_admin' | 'department_manager' | 'accountant' | 'booking_agent' | 'employee';

// Generic repository interfaces
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

#### Error Handling
```typescript
// Custom error classes
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Centralized error middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Error classification and response formatting
};
```

### Frontend Conventions

#### Component Structure
```
components/
├── ui/                   # Base UI components (shadcn/ui)
├── b2b-portal/         # B2B specific components
│   ├── layout/         # Layout components
│   ├── dashboard/      # Dashboard components
│   ├── tables/         # Data tables
│   └── admin/          # Admin interface components
└── shared/             # Shared application components
```

#### React Components
```typescript
// Functional components with TypeScript
interface ComponentProps {
  title: string;
  onAction?: (data: any) => void;
  variant?: 'primary' | 'secondary';
  children?: React.ReactNode;
}

export const Component: React.FC<ComponentProps> = ({
  title,
  onAction,
  variant = 'primary',
  children
}) => {
  // Component implementation
};
```

#### Hooks Usage
```typescript
// Custom hooks with proper typing
interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useApi = <T>(endpoint: string): UseApiResult<T> => {
  // Hook implementation
};
```

#### State Management (Zustand)
```typescript
// Store interfaces with proper typing
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  setUser: (user: User | null) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  theme: 'light',
  setUser: (user) => set({ user }),
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
}));
```

### Styling Conventions

#### Tailwind CSS Classes
- **Utility First**: Use utility classes over custom CSS
- **Responsive Design**: Mobile-first approach with responsive prefixes
- **Consistent Spacing**: Use spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48)
- **Color System**: Use semantic color tokens (text-gray-900, bg-blue-50)

```tsx
// Component styling example
<div className="flex flex-col space-y-4 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">
    Section Title
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Content */}
  </div>
</div>
```

#### Component Variants
```typescript
// Using class-variance-authority for variants
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Database Conventions

#### Naming Standards
- **Table Names**: snake_case (b2b_users, transaction_logs)
- **Column Names**: snake_case (user_id, created_at, is_active)
- **Foreign Keys**: Reference table name with _id suffix (user_id, company_id)
- **Indexes**: Use descriptive names (idx_b2b_users_email, idx_transactions_date)

#### Migration Files
```sql
-- Migration naming convention: XXX_description.sql
-- Example: 005_create_b2b_companies_table.sql

CREATE TABLE b2b_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Always include created_at and updated_at timestamps
-- Use UUID for primary keys in new tables
-- Add proper indexes for performance
```

### API Conventions

#### REST API Design
- **Endpoints**: Use plural nouns for collections, singular for resources
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Status Codes**: Proper HTTP status codes (200, 201, 400, 404, 500)
- **Response Format**: Consistent JSON structure

```typescript
// API Response structure
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}
```

#### Route Definitions
```typescript
// Consistent route structure
app.get('/api/v1/routes', findRoutes);
app.post('/api/v1/routes', createRoute);
app.get('/api/v1/routes/:id', findRouteById);
app.patch('/api/v1/routes/:id', updateRoute);
app.delete('/api/v1/routes/:id', deleteRoute);
```

### Testing Conventions

#### Test File Naming
- **Unit Tests**: `*.test.ts` or `*.spec.ts`
- **Integration Tests**: `*.integration.test.ts`
- **E2E Tests**: `*.e2e.test.ts` or `.spec.ts`

#### Test Structure
```typescript
// AAA pattern: Arrange, Act, Assert
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'employee' as const
      };

      // Act
      const result = await userService.create(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.id).toBeDefined();
    });
  });
});
```

### Security Conventions

#### Input Validation
```typescript
// Use Zod schemas for validation
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'user', 'manager']),
});

// Validate and sanitize inputs
export const validateCreateUser = (data: unknown) => {
  return createUserSchema.parse(data);
};
```

#### Environment Variables
```typescript
// Use proper environment variable handling
const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbHost: process.env.DB_HOST || 'localhost',
  jwtSecret: process.env.JWT_SECRET,
  // Always provide defaults for development
};
```

### Documentation Conventions

#### Code Comments
```typescript
/**
 * User service for managing user operations
 * Implements business rules for user creation and management
 */
export class UserService {
  /**
   * Creates a new user with validation and security checks
   * @param userData - User data excluding auto-generated fields
   * @returns Created user with ID and timestamps
   * @throws ValidationError if validation fails
   */
  async create(userData: CreateUserData): Promise<User> {
    // Implementation
  }
}
```

#### README Files
- Clear setup instructions
- API documentation links
- Architecture overview
- Development workflow
- Troubleshooting guide

### Performance Conventions

#### Database Queries
- Use prepared statements
- Implement proper indexing
- Use connection pooling
- Avoid N+1 query problems

#### Frontend Optimization
- Implement lazy loading for images
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Use code splitting by route

#### Caching Strategy
- Database query results (Redis)
- API responses (application-level)
- Static assets (CDN/long-term caching)
- User sessions (Redis with TTL)

This guide ensures consistency across the codebase and helps new developers understand the project's conventions quickly.