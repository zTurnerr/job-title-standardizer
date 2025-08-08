import { sequelize } from "../utils/sequelize";
import { ExperienceAttributes } from "../models/experience";
import { EducationAttributes } from "../models/education"; // You'll need to import this model
import { QueryTypes } from "sequelize";
import { WorkflowClient } from "@temporalio/client";
import { standardizeBatchWorkflow } from "../temporal/workflows";
import { config } from "../config";
import { logger } from "../utils/logger";

const BATCH_SIZE = Number(config.batchSize) || 1000;
const NUM_BATCHES = Number(config.numBatches) || 1;

// ---- GENERIC BATCH FETCHER ----
const fetchMemberBatches = async (
  transaction: any,
  target: string //"experience" | "education"
): Promise<any[]> => {
  let rows: any[] = [];

  if (target === "experience") {
    rows = await sequelize.query<ExperienceAttributes>(
      `
      SELECT id, title
      FROM public.experience
      WHERE 
      (
        title_standerlization_status = 'not_processed' 
        AND title IS NOT NULL
        AND title != '--'
        AND title != '[default]'
        AND title != 'Retired'
      )
      OR 
      (
        title != old_title 
        AND title IS NOT NULL
        AND title != '--'
        AND title != '[default]' 
        AND title != 'Retired'
        AND title_standerlization_status = 'standarized'
      )
      ORDER BY id
      FOR UPDATE SKIP LOCKED
      LIMIT :limit
      `,
      {
        replacements: { limit: BATCH_SIZE },
        type: QueryTypes.SELECT,
        transaction,
      }
    );
  } else if (target === "education") {
    rows = await sequelize.query<EducationAttributes>(
      `
      SELECT id, degrees
      FROM public.education
      WHERE 
      (
        education_standardize_status = 'not_processed'
        AND degrees::jsonb != '[]'::jsonb
        AND degrees IS NOT NULL
      )
      OR
      (
        degrees != old_degrees
        AND degrees IS NOT NULL
        AND degrees::jsonb != '[]'::jsonb
        AND education_standardize_status = 'standarized'
      )
      ORDER BY id
      FOR UPDATE SKIP LOCKED
      LIMIT :limit
      `,
      {
        replacements: { limit: BATCH_SIZE },
        type: QueryTypes.SELECT,
        transaction,
      }
    );
  }
  return rows;
};

// ---- GENERIC BATCH ENQUEUE ----
export const enqueueMemberBatches = async (
  client: WorkflowClient,
  target: string // "experience" | "education"
) => {
  const transaction = await sequelize.transaction();
  try {
    for (let i = 0; i < NUM_BATCHES; i++) {
      const rows = await fetchMemberBatches(transaction, target);

      if (rows.length === 0) {
        logger.info(
          `No unprocessed ${target} found at batch ${i + 1}. Stopping early.`
        );
        break;
      }

      const rowIds = rows.map((row) => row.id);

      // Status field and table name depends on target
      const table = target === "experience" ? "experience" : "education";
      const statusField = target === "experience"
        ? "title_standerlization_status"
        : "education_standardize_status";

      await sequelize.query(
        `UPDATE public.${table}
         SET ${statusField} = 'fetched'
         WHERE id IN (:ids)`,
        { replacements: { ids: rowIds }, transaction }
      );

      logger.info(`Fetched batch ${i + 1} (${target}), enqueuing Workflow...`);

      await client.start(standardizeBatchWorkflow, {
        args: [rows, target], // Pass target to workflow!
        taskQueue: config.taskQueue as string,
        workflowId: `standardize-${target}-batch${Date.now()}-${process.pid}-${i + 1}`,
      });

      logger.info(`Workflow started for batch ${i + 1} (${target}).`);
    }

    await transaction.commit();
  } catch (error) {
    logger.error(`Failed to enqueue ${target} batches:`, error);
    await transaction.rollback();
  }
};
