import { proxyActivities } from '@temporalio/workflow';

const { standardizeMember } = proxyActivities<typeof import('./activities')>({
  startToCloseTimeout: '5 minutes',
});

export async function standardizeBatchWorkflow(members: any[]) {
  for (const member of members) {
    await standardizeMember(member);
  }
}
