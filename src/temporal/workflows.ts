import { ApplicationFailure, proxyActivities } from "@temporalio/workflow";
import { MemberAttributes } from "../models/Member";

const { standardizeMember } = proxyActivities<typeof import("./activities")>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 2,
    initialInterval: '5s',
    backoffCoefficient: 2,
    nonRetryableErrorTypes: ['BadInputError'], // TODO: define and throw your own error types based on the real world case
  },
});

export async function standardizeBatchWorkflow(members: MemberAttributes[]) {
  try {
    await standardizeMember(members);
  } catch (err) {
    if (err instanceof ApplicationFailure) {
      if (err.type === 'BadInputError') {
        console.warn('Workflow skipped due to known bad input');
        return 'SKIPPED_BAD_INPUT';
      }
    }
    throw err; 
  }
}
