/** Which owner-only settings sections to render. Editors see none of them. */
export function ownerSectionVisibility(role: string) {
  const isOwner = role === 'owner';
  return { billing: isOwner, danger: isOwner };
}
