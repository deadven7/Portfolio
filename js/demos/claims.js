/* Healthcare claims review — the agent's stages (schema → rule edits → policy retrieval → reasoning → letter) on illustrative claims and rules */
DEMOS.claims = async function (root) {
  const ACC = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#4fb3e8';
  /* Illustrative rules, modelled on the kinds of edits payers run. Not a real payer's rulebook. */
  const CPT = { '99213': 'Office visit, established patient, low complexity', '99214': 'Office visit, established patient, moderate complexity', '12001': 'Simple repair of superficial wound, ≤ 2.5 cm', '80053': 'Comprehensive metabolic panel', '80048': 'Basic metabolic panel', '36415': 'Routine venipuncture', '93000': 'Electrocardiogram, complete', '93010': 'Electrocardiogram, interpretation and report only', '71046': 'Chest X-ray, 2 views', '85025': 'Complete blood count with differential' };
  const ICD = { 'Z00.00': 'General adult exam without abnormal findings', 'S61.411A': 'Laceration of right hand, initial encounter', 'E11.9': 'Type 2 diabetes without complications', 'R07.9': 'Chest pain, unspecified', 'J18.9': 'Pneumonia, unspecified organism', 'I10': 'Essential hypertension' };
  const PAIRS = [['80053', '80048', 0, 'The basic panel is a component of the comprehensive panel.'], ['93000', '93010', 0, 'Interpretation is included in the complete ECG.']];
  const MUE = { '36415': 1, '99213': 1, '99214': 1, '80053': 1 };
  const NECESSITY = { '71046': ['R07.9', 'J18.9'], '93000': ['R07.9', 'I10'] };
  const POLICY = [
    ['Bundled services', 'Laboratory panels include their component tests. When a comprehensive metabolic panel is billed, the basic metabolic panel components are included and are not separately payable on the same date of service.'],
    ['ECG components', 'A complete electrocardiogram includes tracing, interpretation and report. The interpretation-only code is not separately reimbursable when the complete service is billed by the same provider on the same day.'],
    ['Evaluation and management with procedures', 'An office visit billed on the same day as a minor procedure is payable only when it is significant and separately identifiable, documented with modifier 25 on the visit line.'],
    ['Units per day', 'Medically unlikely edits limit units per day. Routine venipuncture is limited to one unit per patient per date of service regardless of the number of tubes drawn.'],
    ['Imaging necessity', 'Chest radiographs are covered when ordered for symptoms or findings such as chest pain, cough, fever or suspected pneumonia. Imaging ordered solely as part of a routine preventive examination is not covered.'],
    ['Cardiac testing necessity', 'Electrocardiograms are covered for evaluation of chest pain, arrhythmia, hypertension management or pre-operative assessment when indicated. Screening ECGs in asymptomatic patients are not covered.'],
    ['Claim completeness', 'A clean claim requires a valid member identifier, rendering provider NPI, date of service, at least one ICD-10 diagnosis and a diagnosis pointer on every service line.'],
  ];
  const SAMPLES = {
    'Urgent care visit with wound repair': { member: 'M-204718', npi: '1457384920', dos: '2026-03-14', dx: ['S61.411A', 'E11.9'], lines: [['99213', '', 1, 1, 145], ['12001', '', 1, 1, 210], ['36415', '', 2, 2, 18], ['80053', '', 1, 2, 48]] },
    'Annual physical with extras': { member: 'M-118302', npi: '1902837465', dos: '2026-02-02', dx: ['Z00.00', 'I10'], lines: [['99214', '', 1, 1, 190], ['80053', '', 1, 1, 48], ['80048', '', 1, 1, 32], ['71046', '', 1, 1, 120], ['93000', '', 1, 2, 65], ['93010', '', 1, 2, 28]] },
    'Chest pain work-up': { member: 'M-330915', npi: '1679302841', dos: '2026-01-21', dx: ['R07.9', 'I10'], lines: [['99214', '25', 1, 1, 190], ['93000', '', 1, 1, 65], ['71046', '', 1, 1, 120], ['85025', '', 1, 1, 22]] },
  };
  /* TF-IDF retrieval over the policy passages */
  const toks = s => s.toLowerCase().match(/[a-z0-9]+/g) || [], docs = POLICY.map(p => toks(p[0] + ' ' + p[1])), df = {}; docs.forEach(d => new Set(d).forEach(w => df[w] = (df[w] || 0) + 1));
  const vec = t => { const tf = {}; t.forEach(w => tf[w] = (tf[w] || 0) + 1); const v = {}; for (const w in tf) v[w] = tf[w] * Math.log((1 + POLICY.length) / (1 + (df[w] || 0)) + 1); return v; };
  const DV = docs.map(vec), cos = (a, b) => { let s = 0, na = 0, nb = 0; for (const k in a) { na += a[k] ** 2; if (b[k]) s += a[k] * b[k]; } for (const k in b) nb += b[k] ** 2; return s / (Math.sqrt(na * nb) || 1); };
  const retrieve = q => { const v = vec(toks(q)), r = DV.map((d, i) => [i, cos(v, d)]).sort((a, b) => b[1] - a[1]); return r.filter((x, k) => k === 0 || x[1] >= r[0][1] * .75).slice(0, 2); };
  function review(c) {
    const schema = [['member ID', /^M-\d{6}$/.test(c.member)], ['provider NPI (10 digits)', /^\d{10}$/.test(c.npi)], ['date of service', /^\d{4}-\d{2}-\d{2}$/.test(c.dos)], ['ICD-10 diagnosis present', c.dx.length > 0], ['diagnosis pointer on every line', c.lines.every(l => l[3] >= 1 && l[3] <= c.dx.length)], ['known procedure codes', c.lines.every(l => CPT[l[0]])]];
    const codes = c.lines.map(l => l[0]), res = c.lines.map(() => ({ ok: true, why: [], rule: [], q: '' }));
    c.lines.forEach((l, i) => { const [code, mod, units, ptr] = l, R = res[i];
      PAIRS.forEach(([a, b, mAllowed, note]) => { if (code === b && codes.includes(a)) { R.ok = false; R.rule.push('bundling'); R.why.push(`${b} billed with ${a}: ${note}`); R.q += ` ${CPT[a]} ${CPT[b]} bundled component included`; } });
      if (MUE[code] && units > MUE[code]) { R.ok = false; R.rule.push('units'); R.why.push(`${units} units billed; the daily limit is ${MUE[code]}.`); R.q += ` units per day limit ${CPT[code]}`; }
      if (/^992/.test(code) && codes.some(x => x === '12001') && mod !== '25') { R.ok = false; R.rule.push('modifier'); R.why.push('Office visit on the same day as a minor procedure without modifier 25.'); R.q += ' office visit same day minor procedure modifier 25'; }
      if (NECESSITY[code]) { const dx = c.dx[ptr - 1]; if (!NECESSITY[code].includes(dx)) { R.ok = false; R.rule.push('necessity'); R.why.push(`${CPT[code]} linked to ${dx} (${ICD[dx]}), which the policy does not list as an indication.`); R.q += ` ${CPT[code]} necessity ${ICD[dx]} routine preventive covered`; } }
      R.docs = R.ok ? [] : retrieve(R.q); });
    return { schema, res };
  }
  root.innerHTML = `<style>
    .lab-cl .form { border:1px solid color-mix(in srgb, var(--accent) 35%, var(--line)); border-radius:10px; background:#0d131b; overflow:hidden; }
    .lab-cl .form .hd { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid var(--line); } .lab-cl .form .hd div { padding:8px 12px; border-right:1px solid var(--line); font-size:13px; } .lab-cl .form .hd small { display:block; font:10px var(--mono); letter-spacing:.12em; color:var(--muted); text-transform:uppercase; }
    .lab-cl .ln td input { width:46px; background:transparent; border:1px solid var(--line-2); color:var(--text); border-radius:6px; padding:3px 6px; font:12px var(--mono); }
    .lab-cl .stamp { font:700 11px var(--mono); letter-spacing:.12em; padding:3px 8px; border:2px solid; border-radius:4px; display:inline-block; transform:rotate(-3deg); }
    .lab-cl .ok { color:#5fd38d; } .lab-cl .no { color:#ff8a8a; } .lab-cl .stage { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 0; } .lab-cl .stage span { font:12px var(--mono); border:1px solid var(--line-2); border-radius:8px; padding:6px 10px; color:var(--muted); } .lab-cl .stage span.on { color:var(--accent); border-color:var(--accent); }
    .lab-cl .letter { background:#f4f1ea; color:#1d2430; border-radius:6px; padding:22px 26px; font:14px/1.7 Georgia, serif; } .lab-cl .letter h5 { font:700 12px var(--mono); letter-spacing:.14em; margin:0 0 12px; color:#2a5a7a; }
    @media (max-width:640px){ .lab-cl .form .hd{grid-template-columns:1fr 1fr} }
  </style>
  <div class="lab-cl">
    <div class="tabs"><button class="on">the claim</button><button>rule checks &amp; policy</button><button>decision letter</button></div>
    <div class="tabpane on">
      ${LAB.explain(`<p><b>What you're seeing:</b> a medical claim as an insurer receives it — the patient, the provider, the diagnoses, and each billed service. The agent reviews it line by line. ${LAB.badge('live')}</p><p><b>Technical:</b> stage 1 is schema validation (required fields and formats) before anything else runs. The codes are real CPT and ICD-10 codes; the rules and policy text are <b>illustrative</b>, modelled on the edit types payers use (component bundling, units-per-day limits, modifier requirements, medical necessity). In the full project, an LLM handles the judgment calls over retrieved policy; here the rule checks and retrieval run live and the letter follows the agent's template.</p><p><b>Try:</b> load "Urgent care visit", add modifier <code>25</code> to the office visit and set venipuncture units to 1, then re-run the review.</p>`)}
      <div class="controls"><label class="ctl">sample claim<select id="smp">${Object.keys(SAMPLES).map(k => `<option>${k}</option>`).join('')}</select></label><button class="btn sm primary" id="run">run review</button></div>
      <div class="form"><div class="hd" id="hd"></div><table class="tbl ln" id="ln" style="margin:0"></table></div>
      <div class="stage" id="stg"><span data-s="0">1 · schema</span><span data-s="1">2 · rule edits</span><span data-s="2">3 · policy retrieval</span><span data-s="3">4 · reasoning</span><span data-s="4">5 · decision letter</span></div>
      <div class="panel" style="margin-top:12px"><h4><b>stage 1 · schema validation</b></h4><div id="sch"></div></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> each line's result from the deterministic checks, and for every flagged line the policy passages retrieved to support the decision (TF-IDF cosine similarity over the policy library). ${LAB.badge('live')}</p><p><b>Why rules first:</b> deterministic edits are fast, cheap and auditable. The model only reasons where judgment is needed, and it reasons over retrieved text it can cite.</p>`)}
      <div id="chk"></div>
    </div>
    <div class="tabpane">
      ${LAB.explain(`<p><b>What you're seeing:</b> the adjudication summary the agent produces — every denied line with its reason and the policy it cites, in plain language a provider's billing office can act on. ${LAB.badge('live')}</p>`)}
      <div class="letter" id="let"></div>
    </div>
  </div>`;
  tabs(root.querySelector('.lab-cl'));
  const $ = id => root.querySelector('#' + id);
  let C;
  function load() { C = JSON.parse(JSON.stringify(SAMPLES[$('smp').value])); draw(); run(); }
  function draw() { $('hd').innerHTML = [['member', C.member], ['rendering NPI', C.npi], ['date of service', C.dos], ['diagnoses', C.dx.map((d, i) => `${i + 1}. ${d}`).join('<br>')]].map(([k, v]) => `<div><small>${k}</small>${v}</div>`).join('');
    $('ln').innerHTML = '<tr><th>#</th><th>CPT</th><th>service</th><th>modifier</th><th>units</th><th>dx ptr</th><th>charge</th><th>result</th></tr>' + C.lines.map((l, i) => `<tr><td class="mono">${i + 1}</td><td class="mono">${l[0]}</td><td>${CPT[l[0]] || '?'}</td><td><input data-i="${i}" data-f="1" value="${l[1]}"></td><td><input data-i="${i}" data-f="2" value="${l[2]}"></td><td class="mono">${l[3]}</td><td class="mono">$${l[4]}</td><td id="r${i}"></td></tr>`).join(''); }
  $('ln').addEventListener('input', e => { const i = e.target.dataset.i, f = +e.target.dataset.f; if (i == null) return; C.lines[i][f] = f === 2 ? Math.max(0, parseInt(e.target.value) || 0) : e.target.value.trim(); });
  function run() { const { schema, res } = review(C), schemaOk = schema.every(s => s[1]);
    root.querySelectorAll('#stg span').forEach((s, i) => setTimeout(() => s.classList.add('on'), 120 * i)); root.querySelectorAll('#stg span').forEach(s => s.classList.remove('on'));
    $('sch').innerHTML = schema.map(([k, ok]) => `<div class="mono" style="font-size:12.5px;padding:3px 0"><span class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'}</span> ${k}</div>`).join('') + `<p class="note">${schemaOk ? 'Clean claim — proceeding to rule edits.' : 'Rejected at intake: the claim is returned before any rules run.'}</p>`;
    res.forEach((r, i) => $('r' + i).innerHTML = `<span class="stamp ${r.ok ? 'ok' : 'no'}">${r.ok ? 'PAY' : 'DENY'}</span>`);
    $('chk').innerHTML = C.lines.map((l, i) => { const r = res[i]; return `<div class="panel" style="margin-bottom:10px"><h4><b>line ${i + 1} · ${l[0]} · ${CPT[l[0]]}</b><span class="stamp ${r.ok ? 'ok' : 'no'}">${r.ok ? 'PASS' : r.rule.join(' · ').toUpperCase()}</span></h4>${r.ok ? '<p class="note" style="margin:0">No edits triggered.</p>' : r.why.map(w => `<p style="margin:4px 0;font-size:14px">${w}</p>`).join('') + r.docs.map(([d, s]) => `<div style="border-left:2px solid ${ACC};padding:6px 10px;margin-top:8px;background:rgba(255,255,255,.02)"><div class="mono" style="font-size:11px;color:var(--muted)">retrieved · ${POLICY[d][0]} · similarity ${s.toFixed(2)}</div><div style="font-size:13.5px;color:#cfd6e2">${POLICY[d][1]}</div></div>`).join('')}</div>`; }).join('');
    const denied = res.map((r, i) => [r, C.lines[i]]).filter(([r]) => !r.ok), paid = C.lines.filter((_, i) => res[i].ok).reduce((s, l) => s + l[4], 0), billed = C.lines.reduce((s, l) => s + l[4], 0);
    $('let').innerHTML = `<h5>ADJUDICATION SUMMARY · ${C.member} · DOS ${C.dos}</h5><p>${!schemaOk ? 'This claim could not be processed because required information is missing or invalid. Please correct the items marked in the schema check and resubmit.' : denied.length ? `We reviewed ${C.lines.length} service lines billed at $${billed}. ${C.lines.length - denied.length} line${C.lines.length - denied.length === 1 ? '' : 's'} totalling $${paid} ${C.lines.length - denied.length === 1 ? 'is' : 'are'} approved for payment. The following ${denied.length === 1 ? 'line was' : `${denied.length} lines were`} denied:` : `All ${C.lines.length} service lines, totalling $${billed}, are approved for payment.`}</p>
      ${schemaOk ? denied.map(([r, l]) => `<p><b>${l[0]} — ${CPT[l[0]]} ($${l[4]}).</b> ${r.why.join(' ')} <i>Policy: ${r.docs.map(([d]) => POLICY[d][0]).join('; ')}.</i>${r.rule.includes('modifier') ? ' If the visit was separately identifiable, resubmit with modifier 25 and supporting documentation.' : r.rule.includes('units') ? ' Resubmit with the allowed number of units.' : r.rule.includes('necessity') ? ' If additional clinical indications exist, resubmit with the supporting diagnosis.' : ''}</p>`).join('') : ''}
      <p style="font-size:12px;color:#5a6578;margin-top:18px">Generated from rule results and retrieved policy. Codes are real; rules and policy text are illustrative.</p>`;
    setTimeout(() => root.querySelectorAll('#stg span').forEach(s => s.classList.add('on')), 650); }
  $('smp').addEventListener('change', load); $('run').addEventListener('click', run);
  load();
};
