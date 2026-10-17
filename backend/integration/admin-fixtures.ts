import { randomBytes, scryptSync } from 'node:crypto';
import { UserModel } from '../models/user.model.js';

export function makeIntegrationPasswordHash(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function createIntegrationAdmin(input: {
  email: string;
  password: string;
  firstName: string;
  createdBy: string;
  permissions: string[];
}) {
  return UserModel.create({
    _id: `usr_${randomBytes(12).toString('hex')}`,
    email: input.email.trim().toLowerCase(),
    passwordHash: makeIntegrationPasswordHash(input.password),
    firstName: input.firstName,
    lastName: '',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdBy: input.createdBy,
    adminPermissions: input.permissions,
  });
}
