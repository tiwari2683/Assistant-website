import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, ExternalLink, Eye, X, Loader2, Cloud, Clock, RefreshCw, Trash2 } from 'lucide-react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_ENDPOINTS } from '../../../../config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface S3FileRow {
  url: string;
  s3Key: string;
  name: string;
  type: string;
  size?: number;
  category?: string;
  dateAdded?: string;
  isS3: true;
}

interface PendingFileRow {
  previewUri: string | null;
  name: string;
  type: 'image' | 'document';
  size: string;
  isPending: true;
  fileId: string;
}

type Filter = 'all' | 'cloud' | 'pending';

interface PendingReport {
  fileId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  isPending?: boolean;
  category?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  pendingReports: PendingReport[];
  pendingFileMap: Record<string, File>;
  onRemovePending?: (fileId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAuthHeaders = async () => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
};

const parseResponse = (data: unknown) => {
  const d = data as Record<string, unknown>;
  if (d?.body) return typeof d.body === 'string' ? JSON.parse(d.body) : d.body;
  return d;
};

function guessType(name: string): string {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image/jpeg';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch {
    return iso;
  }
}

const isImage = (type: string) =>
  type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(e => type.includes(e));

// ─── Component ────────────────────────────────────────────────────────────────

export const ViewUploadedFilesPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  patientId,
  pendingReports,
  pendingFileMap,
  onRemovePending,
}) => {
  const [s3Files, setS3Files] = useState<S3FileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

  const isLocalId = (id: string | null) =>
    !id || id.startsWith('draft_') || id.startsWith('checkin_');

  const fetchS3Files = async () => {
    if (isLocalId(patientId)) {
      setS3Files([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        API_ENDPOINTS.PATIENT_DATA,
        { action: 'getPatient', patientId },
        { headers }
      );
      const data = parseResponse(response.data) as Record<string, unknown>;
      const patient = (data.patient ?? data) as Record<string, unknown>;

      const patientFiles: unknown[] = Array.isArray(patient.reportFiles) ? patient.reportFiles : [];
      const activeVisit = data.activeVisit as Record<string, unknown> | null | undefined;
      const visitFiles: unknown[] = Array.isArray(activeVisit?.reportFiles)
        ? (activeVisit!.reportFiles as unknown[])
        : [];

      // Deduplicate by s3Key
      const seenKeys = new Set<string>();
      const allFiles: unknown[] = [];
      for (const f of [...visitFiles, ...patientFiles]) {
        const key = (f as Record<string, unknown>).s3Key as string | undefined;
        if (key && seenKeys.has(key)) continue;
        if (key) seenKeys.add(key);
        allFiles.push(f);
      }

      const rows: S3FileRow[] = allFiles.map((f: unknown) => {
        const file = f as Record<string, unknown>;
        const name = String(file.fileName ?? file.name ?? file.key ?? 'Unknown file');
        return {
          url: String(file.url ?? file.signedUrl ?? ''),
          s3Key: String(file.s3Key ?? file.key ?? ''),
          name,
          type: String(file.fileType ?? file.type ?? guessType(name)),
          size: typeof file.fileSize === 'number' ? file.fileSize
            : typeof file.size === 'number' ? file.size : undefined,
          category: file.category ? String(file.category) : undefined,
          dateAdded:
            file.uploadedAt ?? file.uploadDate
              ? String(file.uploadedAt ?? file.uploadDate)
              : undefined,
          isS3: true,
        };
      });

      setS3Files(rows);
    } catch (err) {
      console.error('[ViewUploadedFilesPanel] fetch failed', err);
      setError('Could not load cloud files. Check your connection and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchS3Files();
      setFilter('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patientId]);

  const handleRemoveFile = async (file: S3FileRow) => {
    if (!patientId || !file.s3Key) return;
    const confirmed = window.confirm(`Remove "${file.name}" permanently? This cannot be undone.`);
    if (!confirmed) return;
    setRemovingKey(file.s3Key);
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        API_ENDPOINTS.PATIENT_DATA,
        { action: 'deletePatientFile', patientId, s3Key: file.s3Key, fileName: file.name },
        { headers }
      );
      setS3Files(prev => prev.filter(f => f.s3Key !== file.s3Key));
    } catch (err) {
      console.error('[ViewUploadedFilesPanel] remove failed', err);
      alert('Failed to remove file. Please try again.');
    } finally {
      setRemovingKey(null);
    }
  };

  // Build pending rows from the Redux reports + pending file map
  const pendingFiles: PendingFileRow[] = pendingReports
    .filter(r => r.isPending && r.fileId && pendingFileMap[r.fileId])
    .filter(r => !s3Files.some(s => s.name === r.fileName))
    .map(r => ({
      previewUri: r.fileUrl || null,
      name: r.fileName,
      type: (r.fileType || '').startsWith('image/') ? 'image' : 'document',
      size: formatBytes(r.fileSize),
      isPending: true,
      fileId: r.fileId!,
    }));

  const visibleS3 = filter !== 'pending' ? s3Files : [];
  const visiblePending = filter !== 'cloud' ? pendingFiles : [];
  const totalAll = s3Files.length + pendingFiles.length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Panel */}
        <div
          className="relative z-10 w-full sm:max-w-lg mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-900">Uploaded Files</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {s3Files.length} in cloud · {pendingFiles.length} pending upload
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-5 py-3 border-b border-gray-50 shrink-0">
            {(['all', 'cloud', 'pending'] as Filter[]).map(tab => {
              const count =
                tab === 'all' ? totalAll : tab === 'cloud' ? s3Files.length : pendingFiles.length;
              const label = tab === 'all' ? 'All' : tab === 'cloud' ? '☁ Cloud' : '⏳ Pending';
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filter === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                      filter === tab ? 'bg-white/20' : 'bg-white'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            <button
              onClick={fetchS3Files}
              disabled={isLoading}
              className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {isLoading && s3Files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-sm">Loading cloud files…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={fetchS3Files}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            ) : visibleS3.length + visiblePending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <FileText className="w-10 h-10 text-gray-200" />
                <p className="text-sm font-medium">
                  {filter === 'cloud'
                    ? 'No files in the cloud yet'
                    : filter === 'pending'
                    ? 'No pending files'
                    : 'No files uploaded yet'}
                </p>
              </div>
            ) : (
              <>
                {/* ── Cloud files (S3) ── */}
                {visibleS3.length > 0 && (
                  <div>
                    {filter === 'all' && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        ☁ Cloud Storage
                      </p>
                    )}
                    <div className="space-y-2">
                      {visibleS3.map((file, idx) => (
                        <FileCard
                          key={`s3-${idx}`}
                          name={file.name}
                          type={file.type}
                          meta={[
                            file.size ? formatBytes(file.size) : null,
                            file.category ?? null,
                            file.dateAdded ? formatDate(file.dateAdded) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          badge={<CloudBadge />}
                          actions={
                            <div className="flex items-center gap-1.5">
                              {isImage(file.type) ? (
                                <button
                                  onClick={() => file.url && setZoomedUrl(file.url)}
                                  disabled={!file.url}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-30"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                              ) : (
                                <button
                                  onClick={() => file.url && window.open(file.url, '_blank')}
                                  disabled={!file.url}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-30"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Open
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveFile(file)}
                                disabled={removingKey === file.s3Key}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-40"
                                title="Remove file"
                              >
                                {removingKey === file.s3Key ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Pending files ── */}
                {visiblePending.length > 0 && (
                  <div className={visibleS3.length > 0 && filter === 'all' ? 'mt-4' : ''}>
                    {filter === 'all' && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        ⏳ Pending Upload
                      </p>
                    )}
                    <div className="space-y-2">
                      {visiblePending.map((file, idx) => (
                        <FileCard
                          key={`local-${idx}`}
                          name={file.name}
                          type={file.type === 'image' ? 'image/jpeg' : 'application/pdf'}
                          meta={file.size}
                          badge={<PendingBadge />}
                          actions={
                            <div className="flex items-center gap-1.5">
                              {file.type === 'image' && file.previewUri ? (
                                <button
                                  onClick={() => setZoomedUrl(file.previewUri!)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Preview
                                </button>
                              ) : null}
                              {onRemovePending && file.fileId && (
                                <button
                                  onClick={() => onRemovePending(file.fileId)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                  title="Remove file"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="px-5 py-3 border-t border-gray-50 shrink-0">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              Cloud URLs are valid for 10 minutes. Pending files will be uploaded when you send to
              doctor.
            </p>
          </div>
        </div>
      </div>

      {/* Image Zoom Overlay */}
      {zoomedUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomedUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setZoomedUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomedUrl}
            alt="Report preview"
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FileCardProps {
  name: string;
  type: string;
  meta: string;
  badge: React.ReactNode;
  actions: React.ReactNode;
}

const FileCard: React.FC<FileCardProps> = ({ name, type, meta, badge, actions }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="p-2 bg-white rounded-lg border border-gray-100 shrink-0">
        {isImage(type) ? (
          <ImageIcon className="w-4 h-4 text-blue-500" />
        ) : (
          <FileText className="w-4 h-4 text-gray-500" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-800 truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {badge}
          {meta && <span className="text-[10px] text-gray-400">{meta}</span>}
        </div>
      </div>
    </div>
    {actions && <div className="shrink-0">{actions}</div>}
  </div>
);

const CloudBadge = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
    <Cloud className="w-2.5 h-2.5" /> Cloud
  </span>
);

const PendingBadge = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
    <Clock className="w-2.5 h-2.5" /> Pending
  </span>
);
