# Development Workflow and Task Completion Guidelines

## When a Task is Completed

### Code Quality Checks
```bash
# Backend - always run before commit
cd backend
npm run lint
npm run type-check
npm run test:unit

# Frontend - always run before commit  
cd frontend
npm run lint
npm run type-check
npm run test

# Full test suite for major changes
npm run test:all
```

### Pre-commit Requirements
- **Type Safety**: All TypeScript errors must be resolved
- **Linting**: No linting errors or warnings
- **Tests**: New features must have corresponding tests
- **Documentation**: Update relevant documentation if API changes
- **Security**: Review for security implications

### Git Commit Standards
```bash
# Use conventional commit messages
git commit -m "feat: add B2B portal session timeout"
git commit -m "fix: resolve authentication token validation"
git commit -m "docs: update API documentation"
git commit -m "refactor: optimize audit log table performance"
git commit -m "test: add unit tests for user service"
```

## Development Workflow

### 1. Task Understanding
- Read the full task description carefully
- Ask clarifying questions if requirements are ambiguous
- Identify dependencies and prerequisites
- Estimate complexity and time required

### 2. Code Discovery Phase
- Use `find` and `grep` to locate relevant files
- Read existing code to understand patterns
- Check database schema for new features
- Review existing API contracts

### 3. Implementation Phase
- Follow established code style conventions
- Implement error handling and validation
- Add comprehensive TypeScript types
- Write tests alongside implementation

### 4. Testing Phase
- Unit tests for business logic
- Integration tests for API endpoints
- Manual testing for UI components
- Performance testing for critical paths

### 5. Review and Refine
- Self-review code for quality
- Check for security vulnerabilities
- Optimize for performance
- Update documentation

## B2B Portal Development Guidelines

### Role-Based Development
- Always check permissions using `useCanAccessSection()`
- Implement proper role restrictions in UI and API
- Test different user roles during development

### Security Considerations
- Never hardcode sensitive information
- Validate all user inputs with Zod schemas
- Implement proper error messages without exposing system details
- Use parameterized queries to prevent SQL injection

### State Management
- Use Zustand for global state
- Keep component state local when possible
- Implement proper loading and error states
- Cache API responses appropriately

### Performance Requirements
- Implement virtual scrolling for large datasets
- Use React.memo for expensive components
- Optimize bundle size with code splitting
- Monitor Core Web Vitals

## API Development Standards

### Endpoint Design
```typescript
// Follow RESTful conventions
GET    /api/b2b/users           // List users
POST   /api/b2b/users           // Create user
GET    /api/b2b/users/:id       // Get specific user
PATCH  /api/b2b/users/:id       // Update user
DELETE /api/b2b/users/:id       // Delete user
```

### Response Format
```typescript
// Always use consistent response structure
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: PaginationInfo;
}
```

### Error Handling
```typescript
// Use proper HTTP status codes
200 - Success
201 - Created
400 - Bad Request (validation errors)
401 - Unauthorized
403 - Forbidden
404 - Not Found
500 - Internal Server Error

// Include error details in development
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

## Database Development Standards

### Migration Naming
```
001_create_initial_tables.sql
002_add_user_authentication.sql
003_create_b2b_companies.sql
004_add_audit_log_table.sql
```

### Schema Design
- Use UUID for primary keys in new tables
- Always include created_at and updated_at timestamps
- Add proper foreign key constraints
- Create indexes for frequently queried columns
- Use descriptive column names

## Frontend Development Standards

### Component Architecture
```typescript
// Use compound components pattern
const Card = ({ children, ...props }) => <div {...props}>{children}</div>;
Card.Header = ({ children, ...props }) => <div {...props}>{children}</div>;
Card.Content = ({ children, ...props }) => <div {...props}>{children}</div>;
Card.Footer = ({ children, ...props }) => <div {...props}>{children}</div>;
```

### State Management
```typescript
// Use Zustand with proper typing
interface B2BPortalStore {
  user: B2BUser | null;
  permissions: B2BPermissions;
  setUser: (user: B2BUser | null) => void;
}

// Use selective subscriptions for performance
const user = useB2BPortalStore(state => state.user);
const { setUser } = useB2BPortalStore();
```

### Form Handling
```typescript
// Use React Hook Form with Zod validation
const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

## Testing Requirements

### Unit Tests
- Test business logic separately from infrastructure
- Mock external dependencies
- Achieve >70% code coverage
- Test edge cases and error conditions

### Integration Tests
- Test API endpoints with real database
- Test component interactions
- Verify database constraints
- Test authentication and authorization

### E2E Tests
- Test critical user journeys
- Test responsive design
- Test accessibility
- Test performance under load

## Security Guidelines

### Authentication
- Always verify JWT tokens in API endpoints
- Implement proper session management
- Use secure cookie settings
- Implement rate limiting

### Data Protection
- Never log sensitive information
- Encrypt PII data at rest
- Use HTTPS in production
- Implement proper CORS policies

### Input Validation
- Validate all user inputs
- Sanitize file uploads
- Prevent SQL injection
- Use parameterized queries

## Performance Guidelines

### Database Optimization
- Use connection pooling
- Implement proper indexing
- Avoid N+1 queries
- Use database-level filtering

### Frontend Optimization
- Implement lazy loading
- Use virtual scrolling
- Optimize bundle size
- Implement caching strategies

### API Performance
- Implement caching with Redis
- Use pagination for large datasets
- Optimize database queries
- Monitor response times

## Documentation Requirements

### Code Documentation
- Add JSDoc comments for complex functions
- Document component props with TypeScript
- Include usage examples for complex components
- Document API endpoints

### README Updates
- Update setup instructions for new dependencies
- Document new environment variables
- Include troubleshooting steps for common issues
- Update architecture documentation

## Debugging Guidelines

### Backend Debugging
- Use structured logging with context
- Include correlation IDs for request tracking
- Log errors with proper context
- Use appropriate log levels

### Frontend Debugging
- Use React DevTools for component debugging
- Use browser network tab for API debugging
- Implement error boundaries for better UX
- Log user interactions for debugging

### Database Debugging
- Use EXPLAIN ANALYZE for query optimization
- Monitor connection pool usage
- Check for long-running queries
- Review query execution plans

## When to Ask for Help

### Technical Blockers
- Architecture decisions that affect multiple components
- Security concerns or vulnerabilities
- Performance optimization challenges
- Integration with third-party services

### Process Questions
- Code review requests
- Deployment procedures
- Testing strategy questions
- Documentation improvements

These guidelines ensure consistent, high-quality development while maintaining security and performance standards across the Travel App SaaS codebase.