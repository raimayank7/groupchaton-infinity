/* Infinity by GroupChatOn — pregnancy. Designed & Developed by Nivesh Sahayak. See LICENSE. */
GCOTools.engine('calc', 'pregnancy', {
  inputs: [{ k: 'lmp', label: 'First day of your last period', type: 'date', value: '-60', fresh: true }, { k: 'c', label: 'Usual cycle length', suffix: 'days', value: 28 }],
  calc: function (v, X) {
    var l = X.date(v.lmp), due = X.addDays(l, 280 + ((v.c || 28) - 28)), now = new Date(), d = X.days(l, now);
    var wk = Math.floor(d / 7), tri = wk < 13 ? 'First trimester' : wk < 27 ? 'Second trimester' : 'Third trimester';
    var left = X.days(now, due), ok = d >= 0 && d < 300;
    var first = d < 0 ? 'That date is in the future: enter the first day of your last period. ' :
      left < 0 ? 'This due date has already passed (' + (-left) + ' days ago). If you are pregnant now, enter the first day of your most recent period. ' : '';
    return { rows: [['Estimated due date', X.fdate(due)], ['Today you are', ok ? wk + ' weeks ' + d % 7 + ' days' : '—', null, ok ? tri : d < 0 ? 'Date is in the future' : 'More than 42 weeks after this date'],
      ['Conception was around', X.fdate(X.addDays(l, (v.c || 28) - 14))], left < 0 ? ['Days to go', 'Due date has passed'] : ['Days to go', left, 'int']],
      note: first + 'Only about 1 in 20 babies arrive on the due date; most come within two weeks of it. Your doctor or midwife may adjust it after a scan.' };
  },
  test: [{ in: { lmp: '2026-01-01', c: 28 }, expect: { 'Estimated due date': '8' } }]
});
