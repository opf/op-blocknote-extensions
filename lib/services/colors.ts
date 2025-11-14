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

export function statusBackgroundColor(workPackage: WorkPackage) {
  cacheStatusColors();

  // In work packages the status id is not included, only title and link.
  // Since the title is not necessarily unique, the id is derived from the link.
  const statusId = workPackage._links.status.href.split("/").at(-1);
  return statusColors[statusId] || FALLBACK_STATUS_COLOR;
}

export function statusTextColor(workPackage: WorkPackage) {
  const backgroundColor = statusBackgroundColor(workPackage);
  return contrastingFontColor(backgroundColor);
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

function contrastingFontColor(backgroundColor: string) {
  if(isBright(backgroundColor)) {
    return "#333333"
  } else {
    return "#FFFFFF"
  }
}

// Adapted from OpenProject's Colors::HexColor
function isBright(givenColor: string) {
  const color = cleanColorString(givenColor);

  const redHex = parseInt(color.substring(0, 2), 16);
  const greenHex = parseInt(color.substring(2, 4), 16);
  const blueHex = parseInt(color.substring(4, 6), 16);

  return ((redHex * 0.299) + (greenHex * 0.587) + (blueHex * 0.114)) >= 150;
}

function cleanColorString(colorString: string) {
  return colorString
    .replace("#", "")
    .padEnd(6, "0");
}