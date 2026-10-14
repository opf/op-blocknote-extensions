import { onTestFinished } from 'vitest';
import { contextCurrentUserId, contextProjectId, initEditorContext } from '../../lib/services/editorContext';

/** Makes `userId` the current user for the rest of the test. */
export function signInAs(userId:string | number):void {
  const projectId = contextProjectId();
  const previousUserId = contextCurrentUserId();
  initEditorContext({ projectId, currentUserId: userId });
  onTestFinished(() => initEditorContext({ projectId, currentUserId: previousUserId }));
}
