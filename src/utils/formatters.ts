/**
 * Formats file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formats timestamp to readable date
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Gets file type icon identifier
 */
export function getFileTypeIcon(file: File): 'pdf' | 'image' {
  return file.type === 'application/pdf' ? 'pdf' : 'image';
}
