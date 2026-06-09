import { buildEmailHTML } from './server/src/services/email.service';
import { writeFileSync } from 'fs';
const langs: Array<[string,string|undefined]> = [['fr','Allianz Suisse'],['en',undefined],['ar','التأمين الوطني'],['ja','東京海上日動'],['ru','Росгосстрах']];
for (const [lang, insurer] of langs) {
  const html = buildEmailHTML({ driverEmail:'a@b.c', driverName:'Test', role:'A', sessionId:'A7F3K9', pdfBase64:'', insurerName:insurer, language:lang } as any);
  writeFileSync(`/tmp/mail_${lang}.html`, html);
}
console.log('HTML écrits');
