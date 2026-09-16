import { pool } from '../server/mysql.js';

async function check() {
  for (const tbl of ['courses', 'modules', 'lessons', 'assessments', 'questions', 'enrollments']) {
    const [cols]: any = await pool.query(`DESCRIBE \`${tbl}\``);
    console.log(`\n=== Table: ${tbl} ===`);
    cols.forEach((c: any) => {
      console.log(`  ${c.Field}: ${c.Type} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${c.Default ? 'DEFAULT ' + c.Default : ''}`);
    });
  }
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
