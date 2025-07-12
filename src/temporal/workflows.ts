import { proxyActivities } from '@temporalio/workflow';
import { MemberAttributes } from '../models/Member';

const { standardizeMember } = proxyActivities<typeof import('./activities')>({
  startToCloseTimeout: '5 minutes',
});

export async function standardizeBatchWorkflow(members: MemberAttributes[]) {
    await standardizeMember(members);
}
