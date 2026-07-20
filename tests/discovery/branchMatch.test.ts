import { describe, expect, it } from "vitest";
import { isCsFacultyMember, matchBranches } from "../../lib/discovery/branchMatch";
import fixture from "../fixtures/bgu-staff-search.json";

const [s3Member, theoryMember, appliedAiMember, electricalEngineeringMember] = fixture.staffMembers;

describe("isCsFacultyMember", () => {
  it("accepts a CS faculty department entry", () => {
    expect(isCsFacultyMember(s3Member.departments)).toBe(true);
  });

  it("rejects a non-CS faculty department entry", () => {
    expect(isCsFacultyMember(electricalEngineeringMember.departments)).toBe(false);
  });
});

describe("matchBranches", () => {
  it("matches the S3 institute to both s3 and software_systems_security", () => {
    expect(matchBranches(s3Member.departments).sort()).toEqual(["s3", "software_systems_security"]);
  });

  it("matches the theory-of-computing institute to theory_of_computing", () => {
    expect(matchBranches(theoryMember.departments)).toEqual(["theory_of_computing"]);
  });

  it("returns no branch for an institute outside the five tracked branches", () => {
    expect(matchBranches(appliedAiMember.departments)).toEqual([]);
  });

  it("does not false-positive on a superficially similar non-CS department", () => {
    expect(matchBranches(electricalEngineeringMember.departments)).toEqual([]);
  });
});
