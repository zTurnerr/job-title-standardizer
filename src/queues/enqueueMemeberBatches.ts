import { sequelize } from "../utils/sequelize";
import { MemberAttributes } from "../models/Member";
import { QueryTypes } from "sequelize";
import { WorkflowClient } from "@temporalio/client";
import { standardizeBatchWorkflow } from "../temporal/workflows";
import {config} from "../config";

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
    title_standerlization_status = 'not_processed' 
    AND title IS NOT NULL
    AND title != '--'
    AND title != '[default]'
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
        console.log(
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

      console.log(`Fetched batch ${i + 1}, enqueuing Workflow...`);

      await client.start(standardizeBatchWorkflow, {
        args: [members],
        taskQueue: config.taskQueue as string,
        workflowId: `standardize-batch${Date.now()}-${process.pid}-${i + 1}`,
      });

      console.log(`Workflow started for batch ${i + 1}.`);
    }

    await transaction.commit();
  } catch (error) {
    console.error("Failed to enqueue member batches:", error);
    await transaction.rollback();
  }
};
