import { MemberAttributes } from '../models/Member';
import { sequelize } from '../utils/sequelize';

export async function standardizeMember(member: MemberAttributes) {
  console.log(`Standardizing member ${member.id}`);
  await sequelize.query(
    `UPDATE public.member SET title_standerlization_status = :status, outdated = TRUE WHERE id = :id`,
    {
      replacements: { id: member.id, status: 'standardized' },
    }
  );
}
