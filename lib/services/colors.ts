import type { WorkPackage } from "../openProjectTypes";
import {fetchTypes, fetchStatuses} from "./openProjectApi";

const FALLBACK_TYPE_COLOR = "#D4A72C";
const FALLBACK_STATUS_COLOR = "#F1E5FF";

const statusColors:Record<string, string> = {};
const typeColors:Record<string, string> = {};

export function typeColor(workPackage: WorkPackage) {
  cacheTypeColors();

  // In work packages the type id is not included, only title and link.
  // Since the title is not necessarily unique, the id is derived from the link./
  const typeId = workPackage._links.type.href.split("/").at(-1);
  return typeColors[typeId] || FALLBACK_TYPE_COLOR;
}

export function statusColor(workPackage: WorkPackage) {
  cacheStatusColors();

  // In work packages the status id is not included, only title and link.
  // Since the title is not necessarily unique, the id is derived from the link.
  const statusId = workPackage._links.status.href.split("/").at(-1);
  return statusColors[statusId] || FALLBACK_STATUS_COLOR;
}

export function cacheColors() {
  cacheTypeColors();
  cacheStatusColors();
}

function cacheTypeColors(){
  if (Object.keys(typeColors).length > 0) return;

  const response = fetchTypes();
  response.then(data => {
    data._embedded?.elements?.forEach(element => {
      typeColors[element.id] = element.color;
    })
  });
}

function cacheStatusColors(){
  if (Object.keys(statusColors).length > 0) return;

  const response = fetchStatuses();
  response.then(data => {
    data._embedded?.elements?.forEach(element => {
      statusColors[element.id] = element.color;
    })
  });
}


