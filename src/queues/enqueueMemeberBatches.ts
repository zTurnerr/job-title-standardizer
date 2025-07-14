import { sequelize } from "../utils/sequelize";
import { MemberAttributes } from "../models/Member";
import { QueryTypes } from "sequelize";
import { WorkflowClient } from "@temporalio/client";
import { standardizeBatchWorkflow } from "../temporal/workflows";
import { config } from "../config";
import { logger } from "../utils/logger";

const BATCH_SIZE = Number(config.batchSize) || 1000;
const NUM_BATCHES = Number(config.numBatches) || 1;

const fetchMemberBatches = async (
  transaction: any,
  titles?: string[]
): Promise<MemberAttributes[]> => {
  if (titles && titles.length > 0) {
    const rows = await sequelize.query<MemberAttributes>(
      `
      SELECT id, title, name
      FROM public.member
      WHERE title IN (:titles)
      AND title_standerlization_status = 'not_processed'
      `,
      {
        replacements: { titles },
        type: QueryTypes.SELECT,
        transaction,
      }
    );
    logger.info(`Fetched ${rows.length} members from DB for provided titles.`);
    return rows;
  }

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
    AND title != 'Retired'
    ) 
    or 
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

  return rows;
};

export const enqueueMemberBatches = async (
  client: WorkflowClient,
  inputTitles?: string[]
) => {
  const transaction = await sequelize.transaction();
  try {
    if (inputTitles && inputTitles.length > 0) {
      logger.info(
        `Using manual payload: validating ${inputTitles.length} titles`
      );

      const titleChunks: string[][] = [];
      for (let i = 0; i < inputTitles.length; i += BATCH_SIZE) {
        titleChunks.push(inputTitles.slice(i, i + BATCH_SIZE));
      }
      logger.info(`Chunked into ${titleChunks.length} batches of titles.`);
      for (let i = 0; i < titleChunks.length; i++) {
        const titlesChunk = titleChunks[i];
        logger.info(`Processing payload batch ${i + 1} with ${titlesChunk.length} titles.`);


        const members = await fetchMemberBatches(transaction, titlesChunk);

        if (members.length === 0) {
          logger.warn(`No valid members found for payload batch ${i + 1}`);
          continue;
        }

        const ids = members.map((m) => m.id);
        await sequelize.query(
          `UPDATE public.member
            SET title_standerlization_status = 'fetched'
            WHERE id IN (:ids)`,
          { replacements: { ids }, transaction }
        );

        await client.start(standardizeBatchWorkflow, {
          args: [members],
          taskQueue: config.taskQueue,
          workflowId: `standardize-payload-${Date.now()}-${process.pid}-${
            i + 1
          }`,
        });

        logger.info(`Workflow started for payload batch ${i + 1}`);
      }
    } else {
      for (let i = 0; i < NUM_BATCHES; i++) {
        const members = await fetchMemberBatches(transaction);

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
    }

    await transaction.commit();
  } catch (error) {
    logger.error("Failed to enqueue member batches:", error);
    await transaction.rollback();
  }
};
