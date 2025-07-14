import request from "supertest";
import app from "../../src/app";
import { sequelize } from "../../src/utils/sequelize";

describe("POST /maualBatchStandardize", () => {
  const testTitle = "Software Engineer";
  const testId = 180503910;

  beforeAll(async () => {
    await sequelize.query(
      `INSERT INTO public.member (
        id, name, first_name, last_name, title,
        url, hash, location, industry, summary,
        connections, recommendations_count, logo_url,
        last_response_code, created, last_updated,
        outdated, deleted, country, connections_count,
        experience_count, last_updated_ux,
        member_shorthand_name, member_shorthand_name_hash,
        canonical_url, canonical_hash, canonical_shorthand_name,
        canonical_shorthand_name_hash, title_standerlization_status,
        standardized_title, department, function, seniority, old_title
      )
      VALUES (
        '${testId}',
        'Joseph Mancillas TEST',
        'Joseph TEST',
        'Mancillas',
        '${testTitle}',
        'https://www.linkedin.com/in/josephmancillas',
        '6ce0a2040a030bec856ab961723a4207',
        'Cedar Park, Texas, United States',
        'Computer Software',
        'Test summary',
        '296 connections',
        0,
        'https://media.licdn.com/example.jpg',
        200,
        '2016-08-13 00:53:39',
        '2024-02-03 18:29:51',
        false,
        false,
        'United States',
        296,
        6,
        1706984991,
        'josephmancillas',
        '404cf76158441fcd3cdb9fca1eb4160d',
        'https://www.linkedin.com/in/josephmancillas',
        '6ce0a2040a030bec856ab961723a4207',
        'josephmancillas',
        '404cf76158441fcd3cdb9fca1eb4160d',
        'not_processed',
        'Software Engineer',
        'Engineering & Technical',
        '{Software Development}',
        'Entry',
        'Software Engineer'
      )
      ON CONFLICT (id) DO UPDATE SET title_standerlization_status = 'not_processed', standardized_title = '', department = '', function = '{}', seniority = '', old_title = '';
`
    );
  });

  it("should trigger job title standardization and update member record", async () => {
    const res = await request(app)
      .post("/job-titles/maualBatchStandardize")
      .send({ titles: [testTitle] });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/success/i);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const [results]: any = await sequelize.query(
      `
      SELECT title_standerlization_status
      FROM public.member
      WHERE id = :id
      `,
      {
        replacements: { id: testId },
      }
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title_standerlization_status).not.toBe("not_processed");
  }, 15000);

});
