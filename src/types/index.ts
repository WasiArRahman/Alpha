export type Role = 'user' | 'model';

export interface Message {
  id?: string;
  chatId: string;
  userId: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  createdAt: Date;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  url?: string;
  base64?: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  autoDeleteHours?: number; // 0 or undefined means no auto-delete
}

export interface Memory {
  id: string;
  userId: string;
  fact: string;
  category?: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  status: 'pending' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
