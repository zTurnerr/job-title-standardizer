import { ApplicationFailure, proxyActivities } from "@temporalio/workflow";
// import models for types
import { ExperienceAttributes } from "../models/experience";
import { EducationAttributes } from "../models/education";

const { standardizeMember } = proxyActivities<typeof import("./activities")>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 2,
    initialInterval: '5s',
    backoffCoefficient: 2,
    nonRetryableErrorTypes: ['BadInputError'],
  },
});

// Make input type flexible
type StandardizeBatchInput =
  | [ExperienceAttributes[], "experience"]
  | [EducationAttributes[], "education"];

export async function standardizeBatchWorkflow(
  members: ExperienceAttributes[] | EducationAttributes[],
  target: string // "experience" | "education"
) {
  try {
    await standardizeMember(members, target);
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

// For compatibility with your enqueue function, you can set this as the default export if needed:
export default standardizeBatchWorkflow;
