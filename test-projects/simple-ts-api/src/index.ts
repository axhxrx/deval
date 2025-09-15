// Simple TypeScript API
export interface User
{
  id: number;
  name: string;
  email: string;
}

export class ApiClient
{
  private baseUrl: string;

  constructor(baseUrl: string)
  {
    this.baseUrl = baseUrl;
  }

  getUser(id: number): User
  {
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
    };
  }

  listUsers(): User[]
  {
    return [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    ];
  }
}

// Main entry point
if (require.main === module)
{
  console.log('Simple TypeScript API Client');
  const client = new ApiClient('https://api.example.com');
  client.listUsers().then(users =>
  {
    console.log('Users:', users);
  });
}
