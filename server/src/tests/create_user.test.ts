
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'John Doe',
  company_name: 'Test Company'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with company name', async () => {
    const result = await createUser(testInput);

    // Verify returned data
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('John Doe');
    expect(result.company_name).toEqual('Test Company');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user without company name', async () => {
    const inputWithoutCompany: CreateUserInput = {
      email: 'user@example.com',
      name: 'Jane Smith',
      company_name: null
    };

    const result = await createUser(inputWithoutCompany);

    expect(result.email).toEqual('user@example.com');
    expect(result.name).toEqual('Jane Smith');
    expect(result.company_name).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].company_name).toEqual('Test Company');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce email uniqueness', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com',
      name: 'Different Name',
      company_name: 'Different Company'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle multiple users with different emails', async () => {
    const user1Input: CreateUserInput = {
      email: 'user1@example.com',
      name: 'User One',
      company_name: 'Company A'
    };

    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      name: 'User Two',
      company_name: null
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('user1@example.com');
    expect(user2.email).toEqual('user2@example.com');

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});
