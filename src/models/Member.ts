import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/sequelize";

export interface MemberAttributes {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  url: string;
  hash: string;
  title_standerlization_status: string;
  standardized_title: string;
  department: string;
  function: string[];
  seniority: string;
  location: string;
  industry: string;
  summary: string;
  connections: number | null;
  recommendations_count: number | null;
  logo_url: string;
  last_response_code: number | null;
  created: Date | string;
  last_updated: Date | string;
  outdated: boolean;
  deleted: boolean;
  country: string;
  connections_count: number | null;
  experience_count: number | null;
  last_updated_ux: string;
  member_shorthand_name: string;
  member_shorthand_name_hash: string;
  canonical_url: string;
  canonical_hash: string;
  canonical_shorthand_name: string;
  canonical_shorthand_name_hash: string;
}

export class Member
  extends Model<MemberAttributes>
  implements MemberAttributes
{
  public id!: number;
  public name!: string;
  public first_name!: string;
  public last_name!: string;
  public title!: string;
  public url!: string;
  public hash!: string;
  public location!: string;
  public industry!: string;
  public title_standerlization_status!: string;
  public standardized_title!: string;
  public department!: string;
  public function!: string[];
  public seniority!: string;
  public summary!: string;
  public connections!: number | null;
  public recommendations_count!: number | null;
  public logo_url!: string;
  public last_response_code!: number | null;
  public created!: Date | string;
  public last_updated!: Date | string;
  public outdated!: boolean;
  public deleted!: boolean;
  public country!: string;
  public connections_count!: number | null;
  public experience_count!: number | null;
  public last_updated_ux!: string;
  public member_shorthand_name!: string;
  public member_shorthand_name_hash!: string;
  public canonical_url!: string;
  public canonical_hash!: string;
  public canonical_shorthand_name!: string;
  public canonical_shorthand_name_hash!: string;
}

Member.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    first_name: { type: DataTypes.STRING },
    title_standerlization_status: {
      type: DataTypes.STRING,
      defaultValue: "not_processed",
    },
    standardized_title: { type: DataTypes.STRING, defaultValue: "" },
    department: { type: DataTypes.STRING, defaultValue: "" },
    function: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    seniority: { type: DataTypes.STRING, defaultValue: "" },
    last_name: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    url: { type: DataTypes.STRING },
    hash: { type: DataTypes.STRING },
    location: { type: DataTypes.STRING },
    industry: { type: DataTypes.STRING },
    summary: { type: DataTypes.TEXT },
    connections: { type: DataTypes.INTEGER, allowNull: true },
    recommendations_count: { type: DataTypes.INTEGER, allowNull: true },
    logo_url: { type: DataTypes.STRING },
    last_response_code: { type: DataTypes.INTEGER, allowNull: true },
    created: { type: DataTypes.DATE },
    last_updated: { type: DataTypes.DATE },
    outdated: { type: DataTypes.BOOLEAN },
    deleted: { type: DataTypes.BOOLEAN },
    country: { type: DataTypes.STRING },
    connections_count: { type: DataTypes.INTEGER, allowNull: true },
    experience_count: { type: DataTypes.INTEGER, allowNull: true },
    last_updated_ux: { type: DataTypes.STRING },
    member_shorthand_name: { type: DataTypes.STRING },
    member_shorthand_name_hash: { type: DataTypes.STRING },
    canonical_url: { type: DataTypes.STRING },
    canonical_hash: { type: DataTypes.STRING },
    canonical_shorthand_name: { type: DataTypes.STRING },
    canonical_shorthand_name_hash: { type: DataTypes.STRING },
  },
  {
    sequelize,
    tableName: "member",
    schema: "public",
    timestamps: false,
  }
);
