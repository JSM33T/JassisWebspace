# JassSpace API Client

TypeScript API client for the JassSpace .NET API with automatic `ApiResponse<T>` unwrapping and `ProblemDetails` error handling.

## Features

✅ **Automatic Response Unwrapping** - Extracts `data` from `ApiResponse<T>` wrapper  
✅ **ProblemDetails Error Handling** - Converts ASP.NET Core errors to `ApiError`  
✅ **TypeScript Support** - Full type safety with generics  
✅ **Request Timeout** - Configurable timeout with abort controller  
✅ **Correlation ID Tracking** - Automatic correlation ID for request tracing  
✅ **Cookie Support** - Includes credentials for httpOnly refresh tokens  
✅ **File Upload** - Multipart form-data support  
✅ **Bearer Token Auth** - Automatic Authorization header handling  

## Installation

No installation needed - files are already in your project:

```
ui/src/lib/api/
├── types.ts          # TypeScript types
├── client.ts         # Core API client
├── auth.service.ts   # Example auth service
├── index.ts          # Barrel exports
└── README.md         # This file
```

## Configuration

Set your API base URL in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Basic Usage

### Simple GET Request

```typescript
import { get } from '@/lib/api';

// API returns: { data: { id: 1, name: "John" }, meta: null }
// Client returns: { id: 1, name: "John" }
const user = await get<User>('/users/1');
console.log(user.id); // 1
```

### Simple POST Request

```typescript
import { post } from '@/lib/api';

interface CreateUserRequest {
  email: string;
  username: string;
}

const newUser = await post<User, CreateUserRequest>('/users', {
  email: 'user@example.com',
  username: 'johndoe',
});
```

### With Authentication

```typescript
import { get } from '@/lib/api';

const profile = await get<UserProfile>('/profile', {
  token: 'your-jwt-token-here',
});
```

### Error Handling

```typescript
import { get, ApiError } from '@/lib/api';

try {
  const user = await get<User>('/users/999');
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Status:', error.statusCode);
    console.log('Title:', error.problemDetails.title);
    console.log('Detail:', error.problemDetails.detail);
    
    // Check specific error types
    if (error.isNotFound()) {
      console.log('User not found');
    } else if (error.isUnauthorized()) {
      console.log('Please login');
    } else if (error.isRateLimited()) {
      console.log('Too many requests');
    }
  }
}
```

## API Methods

### GET Request

```typescript
import { get } from '@/lib/api';

const data = await get<ResponseType>('/endpoint', {
  token: 'optional-jwt-token',
  headers: { 'Custom-Header': 'value' },
});
```

### POST Request

```typescript
import { post } from '@/lib/api';

const result = await post<ResponseType, RequestType>(
  '/endpoint',
  { key: 'value' },
  { token: 'optional-jwt-token' }
);
```

### PUT Request

```typescript
import { put } from '@/lib/api';

const updated = await put<ResponseType, RequestType>(
  '/endpoint/123',
  { key: 'new-value' },
  { token: 'jwt-token' }
);
```

### DELETE Request

```typescript
import { del } from '@/lib/api';

await del<void>('/endpoint/123', {
  token: 'jwt-token',
});
```

### File Upload

```typescript
import { upload } from '@/lib/api';

const formData = new FormData();
formData.append('file', file);
formData.append('name', 'avatar');

const result = await upload<UploadResponse>('/media/upload', formData, {
  token: 'jwt-token',
});
```

## Using the Auth Service

Example service demonstrating best practices:

```typescript
import authService from '@/lib/api/auth.service';

// Login
const authResponse = await authService.login({
  emailOrUsername: 'user@example.com',
  password: 'password123',
  rememberMe: true,
});

console.log(authResponse.accessToken);
console.log(authResponse.user);

// Check username availability
const availability = await authService.checkUsernameAvailability('johndoe');
if (availability.available) {
  console.log('Username is available!');
}

// Get current user
const user = await authService.getCurrentUser(token);
```

## Creating Your Own Services

Follow the pattern in `auth.service.ts`:

```typescript
// services/user.service.ts
import { get, post, put, del } from '@/lib/api';

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface UpdateUserRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
}

export const userService = {
  async getProfile(token: string): Promise<User> {
    return get<User>('/profile', { token });
  },

  async updateProfile(
    data: UpdateUserRequest,
    token: string
  ): Promise<User> {
    return put<User, UpdateUserRequest>('/profile', data, { token });
  },

  async deleteAccount(token: string): Promise<void> {
    return del<void>('/profile', { token });
  },
};
```

## Advanced Configuration

### Custom Base URL

```typescript
import { get } from '@/lib/api';

const data = await get<Data>('/endpoint', {
  baseUrl: 'https://api.example.com',
});
```

### Custom Timeout

```typescript
import { post } from '@/lib/api';

const result = await post<Result>('/slow-endpoint', data, {
  timeout: 60000, // 60 seconds
});
```

### Custom Correlation ID

```typescript
import { get } from '@/lib/api';

const data = await get<Data>('/endpoint', {
  correlationId: 'custom-trace-id-123',
});
```

### Custom Headers

```typescript
import { post } from '@/lib/api';

const result = await post<Result>('/endpoint', data, {
  headers: {
    'X-Custom-Header': 'value',
    'X-API-Version': '2.0',
  },
});
```

## Response Types

### Success Response

The API returns:
```json
{
  "data": { "id": 1, "name": "John" },
  "meta": null
}
```

The client automatically unwraps and returns:
```typescript
{ id: 1, name: "John" }
```

### Paged Response

The API returns:
```json
{
  "data": [{ "id": 1 }, { "id": 2 }],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 50
  }
}
```

The client returns:
```typescript
[{ id: 1 }, { id: 2 }]
// Meta is discarded (access via raw request if needed)
```

### Error Response (ProblemDetails)

The API returns:
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Email is already registered",
  "traceId": "00-abc123...",
  "requestId": "xyz789",
  "correlationId": "correlation-123"
}
```

The client throws `ApiError`:
```typescript
catch (error) {
  if (error instanceof ApiError) {
    error.statusCode // 400
    error.problemDetails.title // "Bad Request"
    error.problemDetails.detail // "Email is already registered"
  }
}
```

## Error Helper Methods

```typescript
if (error instanceof ApiError) {
  error.is(400)           // Check specific status
  error.isBadRequest()    // 400
  error.isUnauthorized()  // 401
  error.isForbidden()     // 403
  error.isNotFound()      // 404
  error.isConflict()      // 409
  error.isRateLimited()   // 429
  error.isServerError()   // 5xx
}
```

## React Hook Example

```typescript
// hooks/useAuth.ts
import { useState } from 'react';
import authService, { LoginRequest, ApiError } from '@/lib/api';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(credentials);
      // Store token, update state, etc.
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails.detail || err.problemDetails.title);
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
```

## Next.js Server Actions Example

```typescript
// app/actions/auth.ts
'use server';

import { cookies } from 'next/headers';
import authService from '@/lib/api/auth.service';

export async function loginAction(formData: FormData) {
  try {
    const response = await authService.login({
      emailOrUsername: formData.get('email') as string,
      password: formData.get('password') as string,
      rememberMe: true,
    });

    // Store token in cookie
    cookies().set('accessToken', response.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return { success: true, user: response.user };
  } catch (error) {
    if (error instanceof ApiError) {
      return { 
        success: false, 
        error: error.problemDetails.detail || error.problemDetails.title 
      };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

## Testing

```typescript
import { get, ApiError } from '@/lib/api';

// Mock fetch for testing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: { id: 1 }, meta: null }),
  })
) as jest.Mock;

test('should unwrap ApiResponse', async () => {
  const result = await get<{ id: number }>('/test');
  expect(result).toEqual({ id: 1 });
});
```

## Best Practices

1. **Create service files** for each API domain (auth, users, posts, etc.)
2. **Define TypeScript interfaces** for all request/response types
3. **Use ApiError helpers** for specific error handling
4. **Store tokens securely** (httpOnly cookies or secure storage)
5. **Handle loading states** in your UI components
6. **Add retry logic** for failed requests if needed
7. **Use correlation IDs** for debugging production issues

## Troubleshooting

### CORS Issues

Make sure your .NET API has CORS configured:

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowCredentials()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

### Cookie Not Being Sent

Ensure `credentials: 'include'` is set (it's default in this client).

### TypeScript Errors

Make sure your types match the API response structure exactly.

## License

Part of the JassSpace project.
