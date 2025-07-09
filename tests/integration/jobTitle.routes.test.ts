import request from "supertest";
import app from "../../src/app";

describe("Job Titles API", () => {
  it("should validate and standardize job titles", async () => {
    const response = await request(app)
      .post("/job-titles/standardize")
      .send({ titles: ["Developer", "Marketing Lead"] });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.message).toBe("Job titles standardized successfully");
  });

  it("should reject invalid payloads", async () => {
    const response = await request(app)
      .post("/job-titles/standardize")
      .send({ titles: "Not an array" });

    expect(response.status).toBe(400);
  });
});
