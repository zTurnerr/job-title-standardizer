import { standardizeJobTitles } from "../../src/services/jobTitle.service";

describe("Job Title Service", () => {
  it("should standardize job titles (mocked)", async () => {
    const result = await standardizeJobTitles(["Developer"]);
    expect(result).toEqual([
      {
        title: "Developer",
        department: "Engineering",
        function: "Software Development",
        seniority: "Mid-Level",
      },
    ]);
  });
});
