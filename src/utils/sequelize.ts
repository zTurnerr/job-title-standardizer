import { Sequelize } from "sequelize";
import { config } from "../config";


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
