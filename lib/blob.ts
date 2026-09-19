export function isOwnedBlobPath(pathname: string, userId: string) {
  return pathname.startsWith(`apexmind/${userId}/`);
}
