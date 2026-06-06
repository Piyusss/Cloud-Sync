import { File, FileText, Image, Video, Music, Archive } from 'lucide-react';
import { getFileIconType } from '../utils/format';

export function FileIcon({
  contentType,
  className = 'w-4 h-4 shrink-0 text-surface-400',
}: {
  contentType: string;
  className?: string;
}) {
  const type = getFileIconType(contentType);
  if (type === 'image')   return <Image   className={className} />;
  if (type === 'video')   return <Video   className={className} />;
  if (type === 'audio')   return <Music   className={className} />;
  if (type === 'archive') return <Archive className={className} />;
  if (type !== 'file')    return <FileText className={className} />;
  return <File className={className} />;
}
