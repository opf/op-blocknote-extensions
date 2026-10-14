let projectId:string | number | undefined;
let currentUserId:string | undefined;

/**
 * `projectId` is the project the edited document belongs to, where the application knows it.
 * `currentUserId` is the user editing, recorded on the user mentions they insert.
 */
export function initEditorContext(context:{ projectId?:string | number, currentUserId?:string | number }):void {
  projectId = context.projectId === '' ? undefined : context.projectId;
  currentUserId = context.currentUserId === undefined || context.currentUserId === '' ? undefined : String(context.currentUserId);
}

export function contextProjectId():string | number | undefined {
  return projectId;
}

export function contextCurrentUserId():string | undefined {
  return currentUserId;
}
