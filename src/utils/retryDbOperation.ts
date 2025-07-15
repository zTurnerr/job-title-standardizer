import { Member } from "../models/Member";


export const retryMemberUpdate = async (
  updateObj: Partial<typeof Member.prototype>,
  whereObj: { where: { id: number } },
  retries = 3
) => {
  for (let i = 0; i < retries; i++) {
    try {
        
      await Member.update(updateObj, whereObj );
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // exponential-ish backoff for retries (Prevents DB hammering)
    }
  }
};