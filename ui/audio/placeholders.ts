import EmptyAAC from '../Empty.aac';
import EmptyOGG from '../Empty.ogg';

const placeholderSources = new Set([EmptyOGG, EmptyAAC]);

export { EmptyAAC, EmptyOGG };

export function isPlaceholderSource(source: string | undefined): boolean {
  return source == null || placeholderSources.has(source);
}
