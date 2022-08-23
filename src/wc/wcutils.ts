import { dbg } from '../helpers.js';

// do out best to normalize formatting of phone numbers...
const nonPhoneRe = /[^0-9]/g;
const noneRe = /^(?:none|n\/?a|no fax|[10()-]+|x+|\s+)$/i;

export function normalizePhone(phone: string) {
  if (!phone || noneRe.test(phone)) {
    if (phone) {
      dbg(2, `normalizing ${phone} to (none)`);
    }
    return '(none)';
  }

  let p = phone;

  p = p.replace(nonPhoneRe, '');

  if (p.length === 11 && p[0] === '1') {
    p = p.slice(1);
  }

  switch (p.length) {
    case 10:
      p = `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;
      break;
    case 7:
      p = `${p.slice(0, 3)}-${p.slice(3)}`;
      break;
    case 9:
      // we have a couple of 9-digit numbers where they missed 1 in the
      // *second* set: '206-12-3456'
      p = `(${p.slice(0, 3)}) ${p.slice(3, 5)}?-${p.slice(5)}`;
      dbg(1, `short phone: ${phone}, treating as ${p}`);
      break;
    default:
      if (p.length >= 11 && p.length <= 14) {
        // we have a couple of 11-digit that look like an extra digit...
        p = `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6, 10)} (+${p.slice(
          10
        )})`;
        dbg(1, `long phone: ${phone}, treating as ${p}`);
      } else {
        dbg(1, `unexpected phone: ${phone}, leaving as-is`);
        p = phone;
      }
      break;
  }

  return p;
}
