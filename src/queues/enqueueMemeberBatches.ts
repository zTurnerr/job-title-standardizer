import { sequelize } from "../utils/sequelize";
import { MemberAttributes } from "../models/Member";
import { memberQueue } from "./memberQueue";
import { QueryTypes } from "sequelize";
import dotenv from "dotenv";
import { memberQueueName } from "./memberQueue";
import { WorkflowClient } from "@temporalio/client";
import { standardizeBatchWorkflow } from "../temporal/workflows";

dotenv.config();

const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 1000;
const NUM_BATCHES = Number(process.env.NUM_BATCHES) || 1;

/*
SELECT id, name, first_name, last_name, title, url, hash, location, industry, summary,
connections, recommendations_count, logo_url, last_response_code, created, last_updated,
outdated, deleted, country, connections_count, experience_count, last_updated_ux,
member_shorthand_name, member_shorthand_name_hash, canonical_url, canonical_hash,
canonical_shorthand_name, canonical_shorthand_name_hash
*/

const fetchMemberBatchWithSkipLocked = async (
  transaction: any
): Promise<MemberAttributes[]> => {
  const rows = await sequelize.query<MemberAttributes>(
    `
    SELECT id, title, name
    FROM public.member
    WHERE title_standerlization_status = 'not_processed'
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

// export const enqueueMemberBatches = async () => {
//   const transaction = await sequelize.transaction();
//   try {
//     for (let i = 0; i < NUM_BATCHES; i++) {
//       const members = await fetchMemberBatchWithSkipLocked(transaction);

//       if (members.length === 0) {
//         console.log(
//           `No unprocessed members found at batch ${i + 1}. Stopping early.`
//         );
//         break;
//       }
//       const memberIds = members.map((member) => member.id);
//       console.log(memberIds);
//       await sequelize.query(
//         `UPDATE public.member
//         SET title_standerlization_status = 'fetched'
//         WHERE id in (:ids)
//         `, // check the difference between using IN () and = ANY()
//         { replacements: { ids: memberIds }, transaction }
//       );

//       console.log(`Fetched batch ${i + 1} with ${members.length} members. Enqueuing... ${members[0].id} - ${members[0].name} - ${members[0].title}`);
//       await memberQueue.add(memberQueueName, members, {
//         jobId: `batch-${i + 1}-${Date.now()}`,
//         removeOnComplete: true,
//         removeOnFail: false,
//       });

//       console.log(`Enqueued batch ${i + 1} with ${members.length} members.`);
//     }

//     await transaction.commit();
//   } catch (error) {
//     console.error("Failed to enqueue member batches:", error);
//     await transaction.rollback();
//   }
// };

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
        taskQueue: "member-standardization",
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
