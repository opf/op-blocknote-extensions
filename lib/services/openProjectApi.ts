import type { WorkPackage } from "../openProjectTypes";

export const OPENPROJECT_HOST = "https://openproject.local";

export async function fetchWorkPackage(id: string): Promise<WorkPackage> {
  const response = await fetch(`${OPENPROJECT_HOST}/api/v3/work_packages/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch work package: ${response.statusText}`);
  }
  return response.json();
}