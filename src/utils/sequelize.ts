import { Sequelize } from "sequelize";
import { config } from "../config";
import { Member, MemberAttributes } from "../models/Member";
import { Fn, Col, Literal } from "sequelize/types/utils";


export const sequelize = new Sequelize({
  host: config.pgHost,
  port: config.pgPort,
  database: config.pgDatabase,
  username: config.pgUser,
  password: config.pgPassword,
  dialect: "postgres",
  pool: {
    max: 10,
    min: 0,
    idle: 10000,
  },
  logging: false,
});

export async function retryMemberUpdate(updateObj: unknown, whereObj: { where: { id: number; }; }, retries = 3) { // TODO: fix this unknown type
  for (let i = 0; i < retries; i++) {
    try {
      await Member.update(updateObj as MemberAttributes, { where: whereObj });
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // exponential-ish backoff
    }
  }
}