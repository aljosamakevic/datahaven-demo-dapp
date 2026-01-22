import type { Bucket, FileListResponse, HealthStatus, InfoResponse, UserInfo } from '@storagehub-sdk/msp-client';

export type { Bucket, FileListResponse, HealthStatus, InfoResponse, UserInfo };

export interface AppState {
  isWalletConnected: boolean;
  isMspConnected: boolean;
  isAuthenticated: boolean;
  address: string | null;
  mspInfo: InfoResponse | null;
  userProfile: UserInfo | null;
}

export interface BucketCreationProgress {
  step: 'idle' | 'creating' | 'verifying' | 'waiting' | 'done' | 'error';
  message: string;
}

export interface FileUploadProgress {
  step: 'idle' | 'preparing' | 'issuing' | 'uploading' | 'confirming' | 'finalizing' | 'done' | 'error';
  message: string;
}

export interface BucketInfo {
  bucketId: string;
  userId: string;
  mspId: string;
  private: boolean;
  root: string;
  valuePropositionId: string;
}
