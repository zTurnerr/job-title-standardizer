import { sequelize } from "../utils/sequelize";
import { MemberAttributes } from "../models/Member";
import { QueryTypes } from "sequelize";
import { WorkflowClient } from "@temporalio/client";
import { standardizeBatchWorkflow } from "../temporal/workflows";
import { config } from "../config";
import { logger } from "../utils/logger";

const BATCH_SIZE = Number(config.batchSize) || 1000;
const NUM_BATCHES = Number(config.numBatches) || 1;

const fetchMemberBatchWithSkipLocked = async (
  transaction: any
): Promise<MemberAttributes[]> => {
  const rows = await sequelize.query<MemberAttributes>(
    `
    SELECT id, title, name
    FROM public.member
    WHERE 
    (
    title_standerlization_status = 'not_processed' 
    AND title IS NOT NULL
    AND title != '--'
    AND title != '[default]'
    ) 
    or 
	  (
    title != old_title 
    AND title IS NOT NULL
    AND title != '--'
    AND title != '[default]' 
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

  return rows;
};

export const enqueueMemberBatchesWithTemporal = async (
  client: WorkflowClient
) => {
  const transaction = await sequelize.transaction();
  try {
    for (let i = 0; i < NUM_BATCHES; i++) {
      const members = await fetchMemberBatchWithSkipLocked(transaction);

      if (members.length === 0) {
        logger.info(
          `No unprocessed members found at batch ${i + 1}. Stopping early.`
        );
        break;
      }

      const memberIds = members.map((member) => member.id);
      await sequelize.query(
        `UPDATE public.member
         SET title_standerlization_status = 'fetched'
         WHERE id IN (:ids)`,
        { replacements: { ids: memberIds }, transaction }
      );

      logger.info(`Fetched batch ${i + 1}, enqueuing Workflow...`);

      await client.start(standardizeBatchWorkflow, {
        args: [members],
        taskQueue: config.taskQueue as string,
        workflowId: `standardize-batch${Date.now()}-${process.pid}-${i + 1}`,
      });

      logger.info(`Workflow started for batch ${i + 1}.`);
    }

    await transaction.commit();
  } catch (error) {
    logger.error("Failed to enqueue member batches:", error);
    await transaction.rollback();
  }
};
