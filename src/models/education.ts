import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/sequelize";

export interface EducationAttributes {
  id: number;
  person_id?: number;
  source_profile_id: string;
  institution_name: string;
  social_url?: string;
  degrees?: string[]; 
  start_date?: Date;
  end_date?: Date;
  description?: string;
  standardize_major?: string;
  standardize_degree?: string;
  education_standardize_status?: string;
  image_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class Education extends Model<EducationAttributes> implements EducationAttributes {
  public id!: number;
  public person_id?: number;
  public source_profile_id!: string;
  public institution_name!: string;
  public social_url?: string;
  public degrees?: any;
  public start_date?: Date;
  public end_date?: Date;
  public description?: string;
  public image_url?: string;
  public education_standardize_status?: string;
  public standardize_major?: string;
  public standardize_degree?: string;
  public created_at?: Date;
  public updated_at?: Date;
}

Education.init(
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
    institution_name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    social_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    degrees: {
      type: DataTypes.JSONB,
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    education_standardize_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      standardize_major: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    standardize_degree: {
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
  },
  {
    sequelize,
    tableName: "education",
    schema: "public",
    timestamps: false, // Disable Sequelize's automatic timestamps (your DB handles it)
  }
);
