import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/sequelize";

export interface ExperienceAttributes {
  id: number;
  person_id?: number;
  source_profile_id: string;
  company_id?: number;
  company_name?: string;
  title: string;
  description?: string;
  location?: string;
  start_date?: Date;
  end_date?: Date;
  duration_months_driven?: number;
  social_url?: string;
  image_url?: string;
  created_at?: Date;
  updated_at?: Date;
  title_tsv?: string; // Sequelize doesn’t support tsvector natively
  title_standerlization_status?: string;
  standardized_title?: string;
  department?: string;
  function?: string[];
  seniority?: string;
  old_title?: string;
}

export class Experience extends Model<ExperienceAttributes> implements ExperienceAttributes {
  public id!: number;
  public person_id?: number;
  public source_profile_id!: string;
  public company_id?: number;
  public company_name?: string;
  public title!: string;
  public description?: string;
  public location?: string;
  public start_date?: Date;
  public end_date?: Date;
  public duration_months_driven?: number;
  public social_url?: string;
  public image_url?: string;
  public created_at?: Date;
  public updated_at?: Date;
  public title_tsv?: string;
  public title_standerlization_status?: string;
  public standardized_title?: string;
  public department?: string;
  public function?: string[];
  public seniority?: string;
  public old_title?: string;
}

Experience.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    person_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    source_profile_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    company_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    company_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    duration_months_driven: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    social_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    title_tsv: {
      type: DataTypes.TEXT, // tsvector not directly supported; handled via raw SQL if needed
      allowNull: true,
    },
    title_standerlization_status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "not_processed",
      validate: {
        isIn: [['fetched', 'standardized', 'failed', 'not_processed']],
      },
    },
    standardized_title: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    function: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    seniority: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    old_title: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
  },
  {
    sequelize,
    tableName: "experience",
    schema: "public",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["person_id", "company_id", "title", "start_date"],
        name: "unique_person_company_title_start",
      },
    ],
  }
);
