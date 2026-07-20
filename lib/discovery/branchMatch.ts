import type { ResearchBranch } from "../types";

export interface StaffDepartment {
  name: string;
}

// The BGU staff directory encodes faculty and institute affiliation as a
// free-text department name (e.g. "The Stein Faculty of Computer and
// Information Science, Institute for the Theory of Computing"). Matching
// substrings against that field is the discovery source for this app; see
// fetchBguStaffDirectory in bguStaffSearch.ts for why it replaces CRIS.
export const CS_FACULTY_LABEL = "Stein Faculty of Computer and Information Science";

// s3 and software_systems_security are the same real-world institute
// (confirmed by the user); both branch values map to its one department label.
const INSTITUTE_LABELS: Record<ResearchBranch, string> = {
  s3: "Institute for Software, Systems, and Security",
  software_systems_security: "Institute for Software, Systems, and Security",
  interdisciplinary_computational_science: "Institute for Interdisciplinary Computational Science",
  theory_of_computing: "Institute for the Theory of Computing",
  foundations_of_ai: "Institute for the Foundations of AI",
};

export function isCsFacultyMember(departments: StaffDepartment[]): boolean {
  return departments.some((department) => department.name.includes(CS_FACULTY_LABEL));
}

export function matchBranches(departments: StaffDepartment[]): ResearchBranch[] {
  const branches = new Set<ResearchBranch>();
  for (const department of departments) {
    for (const [branch, label] of Object.entries(INSTITUTE_LABELS) as [ResearchBranch, string][]) {
      if (department.name.includes(label)) branches.add(branch);
    }
  }
  return Array.from(branches);
}
