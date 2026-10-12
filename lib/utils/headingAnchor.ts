// Prefixed so the fragment stays a valid CSS selector even when the block id
// starts with a digit; OpenProject hands the hash to querySelector.
const ANCHOR_PREFIX = 'heading-';

export function headingAnchor(blockId:string):string {
  return `${ANCHOR_PREFIX}${blockId}`;
}

export function blockIdFromHash(hash:string):string | null {
  const anchor = hash.slice(1);
  return anchor.startsWith(ANCHOR_PREFIX) ? anchor.slice(ANCHOR_PREFIX.length) : null;
}
