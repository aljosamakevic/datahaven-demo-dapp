import { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressStepper } from '../components/ProgressStepper';
import {
  createBucket,
  verifyBucketCreation,
  waitForBackendBucketReady,
  deleteBucket,
  getBucketsFromMSP,
} from '../services/bucketOperations';
import type { Bucket, BucketInfo, BucketCreationProgress } from '../types';

export function Buckets() {
  const { isAuthenticated, isMspConnected } = useAppState();

  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<BucketInfo | null>(null);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [isLoadingBuckets, setIsLoadingBuckets] = useState(false);
  const [isLoadingBucketInfo, setIsLoadingBucketInfo] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create bucket form
  const [bucketName, setBucketName] = useState('');
  const [createProgress, setCreateProgress] = useState<BucketCreationProgress>({
    step: 'idle',
    message: '',
  });

  const loadBuckets = useCallback(async () => {
    if (!isMspConnected) return;
    setIsLoadingBuckets(true);
    setError(null);
    try {
      const data = await getBucketsFromMSP();
      setBuckets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buckets');
    } finally {
      setIsLoadingBuckets(false);
    }
  }, [isMspConnected]);

  useEffect(() => {
    if (isMspConnected) {
      loadBuckets();
    }
  }, [isMspConnected, loadBuckets]);

  const handleViewBucket = async (bucketId: string) => {
    setSelectedBucketId(bucketId);
    setIsLoadingBucketInfo(true);
    setError(null);
    try {
      const info = await verifyBucketCreation(bucketId);
      setSelectedBucket(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bucket info');
    } finally {
      setIsLoadingBucketInfo(false);
    }
  };

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketName.trim()) return;

    setError(null);

    try {
      // Step 1: Create bucket on-chain
      setCreateProgress({ step: 'creating', message: 'Creating bucket on-chain...' });
      const { bucketId } = await createBucket(bucketName);

      // Step 2: Verify on-chain
      setCreateProgress({ step: 'verifying', message: 'Verifying bucket on-chain...' });
      await verifyBucketCreation(bucketId);

      // Step 3: Wait for backend
      setCreateProgress({ step: 'waiting', message: 'Waiting for backend to index...' });
      await waitForBackendBucketReady(bucketId);

      // Done
      setCreateProgress({ step: 'done', message: 'Bucket created successfully!' });
      setBucketName('');

      // Refresh bucket list
      await loadBuckets();

      // Reset progress after a delay
      setTimeout(() => {
        setCreateProgress({ step: 'idle', message: '' });
      }, 2000);
    } catch (err) {
      setCreateProgress({
        step: 'error',
        message: err instanceof Error ? err.message : 'Failed to create bucket',
      });
      setError(err instanceof Error ? err.message : 'Failed to create bucket');
    }
  };

  const handleDeleteBucket = async (bucketId: string) => {
    if (!confirm('Are you sure you want to delete this bucket?')) return;

    setIsDeleting(bucketId);
    setError(null);
    try {
      await deleteBucket(bucketId);
      await loadBuckets();
      if (selectedBucketId === bucketId) {
        setSelectedBucket(null);
        setSelectedBucketId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bucket');
    } finally {
      setIsDeleting(null);
    }
  };

  const getProgressSteps = () => {
    const steps = [
      { label: 'Creating bucket on-chain...', status: 'pending' as const },
      { label: 'Verifying on-chain...', status: 'pending' as const },
      { label: 'Waiting for backend...', status: 'pending' as const },
      { label: 'Done!', status: 'pending' as const },
    ];

    const stepMap: Record<string, number> = {
      creating: 0,
      verifying: 1,
      waiting: 2,
      done: 3,
    };

    const currentStep = stepMap[createProgress.step] ?? -1;

    return steps.map((step, index) => ({
      ...step,
      status:
        createProgress.step === 'error' && index === currentStep
          ? 'error'
          : index < currentStep
          ? 'completed'
          : index === currentStep
          ? 'active'
          : 'pending',
    })) as { label: string; status: 'pending' | 'active' | 'completed' | 'error' }[];
  };

  const truncateHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
        <p className="text-gray-400">
          Please connect your wallet and authenticate on the Dashboard first.
        </p>
        <a href="/" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
          Go to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Buckets</h1>
        <p className="mt-1 text-gray-400">Create and manage your storage buckets.</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Bucket Form */}
        <Card title="Create Bucket" className="lg:col-span-1">
          <form onSubmit={handleCreateBucket} className="space-y-4">
            <div>
              <label htmlFor="bucketName" className="block text-sm font-medium text-gray-300 mb-1">
                Bucket Name
              </label>
              <input
                type="text"
                id="bucketName"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="my-bucket"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={createProgress.step !== 'idle' && createProgress.step !== 'done' && createProgress.step !== 'error'}
              />
            </div>

            <Button
              type="submit"
              isLoading={createProgress.step !== 'idle' && createProgress.step !== 'done' && createProgress.step !== 'error'}
              disabled={!bucketName.trim() || (createProgress.step !== 'idle' && createProgress.step !== 'done' && createProgress.step !== 'error')}
              className="w-full"
            >
              Create Bucket
            </Button>

            {createProgress.step !== 'idle' && (
              <div className="mt-4">
                <ProgressStepper steps={getProgressSteps()} />
              </div>
            )}
          </form>
        </Card>

        {/* Bucket List */}
        <Card title="Your Buckets" className="lg:col-span-2">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={loadBuckets} isLoading={isLoadingBuckets}>
                Refresh
              </Button>
            </div>

            {isLoadingBuckets ? (
              <div className="text-center py-8 text-gray-400">Loading buckets...</div>
            ) : buckets.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No buckets found. Create your first bucket to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Bucket ID</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map((bucket) => (
                      <tr
                        key={bucket.bucketId}
                        className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${
                          selectedBucketId === bucket.bucketId ? 'bg-gray-700/50' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-sm text-white">{bucket.name || 'Unnamed'}</td>
                        <td className="py-3 px-4 text-sm font-mono text-gray-300">
                          {truncateHash(bucket.bucketId)}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewBucket(bucket.bucketId)}
                            isLoading={isLoadingBucketInfo && selectedBucketId === bucket.bucketId}
                          >
                            View
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteBucket(bucket.bucketId)}
                            isLoading={isDeleting === bucket.bucketId}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Bucket Info Panel */}
      {selectedBucket && (
        <Card title="Bucket Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Bucket ID</p>
              <p className="text-sm font-mono text-gray-300 break-all">{selectedBucketId}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Owner (User ID)</p>
              <p className="text-sm font-mono text-gray-300 break-all">{selectedBucket.userId}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">MSP ID</p>
              <p className="text-sm font-mono text-gray-300 break-all">{selectedBucket.mspId}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Privacy</p>
              <StatusBadge
                status={selectedBucket.private ? 'pending' : 'healthy'}
                label={selectedBucket.private ? 'Private' : 'Public'}
              />
            </div>
            {selectedBucket.root && (
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Root Hash</p>
                <p className="text-sm font-mono text-gray-300 break-all">{selectedBucket.root}</p>
              </div>
            )}
            {selectedBucket.valuePropositionId && (
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Value Proposition ID</p>
                <p className="text-sm font-mono text-gray-300 break-all">
                  {selectedBucket.valuePropositionId}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
