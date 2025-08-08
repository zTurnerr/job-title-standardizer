import { Education } from "../models/education";
import { Experience } from "../models/experience";

export const retryMemberUpdate = async (
  model: "experience" | "education",
  updateObj: Partial<typeof Experience.prototype> | Partial<typeof Education.prototype>,
  whereObj: { where: { id: number } },
  retries = 3
) => {
  for (let i = 0; i < retries; i++) {
    try {
      if (model === "experience") {
        await Experience.update(updateObj as Partial<typeof Experience.prototype>, whereObj);
      } else {
        await Education.update(updateObj as Partial<typeof Education.prototype>, whereObj);
      }
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
