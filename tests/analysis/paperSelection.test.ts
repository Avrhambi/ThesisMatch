import { describe, expect, it } from "vitest";
import { selectPapersForAnalysis, type SelectablePaper } from "../../lib/analysis/paperSelection";

const profileText = "Research interests: distributed systems, consensus protocols, and fault-tolerant replication.";

function paper(id: string, title: string, abstract: string | null, year: number | null): SelectablePaper {
  return { id, title, abstract, publicationYear: year };
}

describe("selectPapersForAnalysis", () => {
  it("returns an empty selection for no papers", () => {
    expect(selectPapersForAnalysis(profileText, [])).toEqual([]);
  });

  it("selects at most five papers with all three reasons represented when enough papers exist", () => {
    const papers: SelectablePaper[] = [
      paper("1", "Consensus protocols for distributed systems", "Fault-tolerant replication study", 2015),
      paper("2", "Byzantine fault-tolerant consensus", "Replication and consensus in distributed systems", 2016),
      paper("3", "Neural networks for image classification", "Deep learning approach", 2023),
      paper("4", "Reinforcement learning for robotics", "Robotics control study", 2022),
      paper("5", "Quantum computing basics", "Introductory survey", 2010),
    ];

    const result = selectPapersForAnalysis(profileText, papers);
    expect(result.length).toBe(5);

    const ids = result.map((r) => r.paperId);
    expect(new Set(ids).size).toBe(ids.length);

    const reasons = result.map((r) => r.reason);
    expect(reasons.filter((r) => r === "profile_match").length).toBe(2);
    expect(reasons.filter((r) => r === "recent").length).toBe(2);
    expect(reasons.filter((r) => r === "distinct").length).toBe(1);
  });

  it("prefers papers whose title/abstract overlap the profile text as profile matches", () => {
    const papers: SelectablePaper[] = [
      paper("match-1", "Consensus protocols for distributed systems", null, 2018),
      paper("match-2", "Fault-tolerant replication in distributed systems", null, 2017),
      paper("unrelated-1", "History of medieval art", null, 2019),
      paper("unrelated-2", "Culinary traditions of Southeast Asia", null, 2020),
    ];

    const result = selectPapersForAnalysis(profileText, papers);
    const profileMatches = result.filter((r) => r.reason === "profile_match").map((r) => r.paperId);
    expect(profileMatches).toEqual(expect.arrayContaining(["match-1", "match-2"]));
  });

  it("caps selection at the number of available papers when fewer than five exist", () => {
    const papers: SelectablePaper[] = [
      paper("1", "Consensus protocols", "abstract", 2020),
      paper("2", "Distributed replication", "abstract", 2021),
    ];
    const result = selectPapersForAnalysis(profileText, papers);
    expect(result.length).toBe(2);
    expect(new Set(result.map((r) => r.paperId)).size).toBe(2);
  });

  it("is deterministic across repeated calls with the same input", () => {
    const papers: SelectablePaper[] = [
      paper("1", "Consensus protocols", "abstract", 2020),
      paper("2", "Distributed replication", "abstract", 2021),
      paper("3", "Neural networks", "abstract", 2019),
    ];
    const first = selectPapersForAnalysis(profileText, papers);
    const second = selectPapersForAnalysis(profileText, papers);
    expect(first).toEqual(second);
  });
});
