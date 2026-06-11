#!/usr/bin/env python3
# Traduit les labels PDF (pdf.labels.ts) et email (email.service.ts) vers les 50 langues.
# Idempotent. Gère 1 niveau d'imbrication (circ). Insère des blocs TS en double quotes
# et étend le type PdfLang. Valide par re-parse (comptage de feuilles).
# Usage : python3 scripts/translate-ts-labels.py [pdf|email|all]
import json, re, sys, time, os, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

OPENAI_KEY = open('/mnt/project/Open_ai_key_pour_reconnaissance_vocales').read().strip()
OPENAI_MODEL = 'gpt-4o-mini'
CONC = int(os.environ.get('OA', '6'))

_src = open(os.path.join(os.path.dirname(__file__), 'translate-locales.py')).read()
LANG_NAMES = eval(re.search(r'LANG_NAMES\s*=\s*(\{[\s\S]*?\n\})', _src).group(1))

LOCALES_DIR = 'client/src/i18n/locales'
ALL_LANGS = sorted(f[:-5] for f in os.listdir(LOCALES_DIR) if f.endswith('.json'))

def log(m): print(f"[{time.strftime('%H:%M:%S')}] {m}", flush=True)

# 'valeur' avec \' et \\ échappés, OU "valeur" JSON
STR_RE = r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\""

def unquote(raw):
    if raw.startswith('"'):
        return json.loads(raw)
    return raw[1:-1].replace("\\'", "'").replace('\\\\', '\\')

def parse_pairs(body):
    return {m.group(1): unquote(m.group(2)) for m in re.finditer(r"(\w+):\s*(" + STR_RE + r")", body)}

def parse_block(src, lang):
    m = re.search(r'\n  ' + lang + r': \{\n([\s\S]*?)\n  \},', src)
    if not m: return None
    body = m.group(1)
    out = {}
    def sub(mm):
        out[mm.group(1)] = parse_pairs(mm.group(2))
        return ''
    body = re.sub(r'(\w+):\s*\{([^{}]*)\}', sub, body)
    out.update(parse_pairs(body))
    return out

def leaves(d):
    return sum(leaves(v) if isinstance(v, dict) else 1 for v in d.values())

def flat(d, p=''):
    o = {}
    for k, v in d.items():
        if isinstance(v, dict): o.update(flat(v, p + k + '.'))
        else: o[p + k] = v
    return o

def ts_block(lang, d, indent='  '):
    lines = [f'{indent}{lang}: {{']
    for k, v in d.items():
        if isinstance(v, dict):
            lines.append(f'{indent}  {k}: {{')
            for k2, v2 in v.items():
                lines.append(f'{indent}    {k2}: {json.dumps(v2, ensure_ascii=False)},')
            lines.append(f'{indent}  }},')
        else:
            lines.append(f'{indent}  {k}: {json.dumps(v, ensure_ascii=False)},')
    lines.append(f'{indent}}},')
    return '\n'.join(lines)

def call_openai(code, items, context):
    name = LANG_NAMES.get(code, code)
    system = (
        f'You are a professional localizer for "boom.contact", a digital car-accident report app '
        f'(European constat amiable). Context: {context}. '
        f'Translate the values from French into {name} ({code}). '
        f'Output ONLY a JSON object with the EXACT same structure (same keys, same nesting), values translated. '
        f'Preserve EXACTLY all HTML tags like <strong>, all emojis, and the brand "boom.contact". '
        f'If a French value is in ALL CAPS, keep the translation in ALL CAPS. '
        f'Keep translations concise (form labels / email strings). '
        f'Polite/formal register, correct insurance/legal terminology.'
    )
    body = json.dumps({'model': OPENAI_MODEL, 'temperature': 0.2, 'max_tokens': 16000,
        'response_format': {'type': 'json_object'},
        'messages': [{'role': 'system', 'content': system},
                     {'role': 'user', 'content': json.dumps(items, ensure_ascii=False)}]}).encode()
    req = urllib.request.Request('https://api.openai.com/v1/chat/completions', data=body,
        headers={'Authorization': f'Bearer {OPENAI_KEY}', 'Content-Type': 'application/json'})
    last = None
    for attempt in range(10):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=240))
            if r['choices'][0].get('finish_reason') == 'length':
                raise RuntimeError('tronque')
            return json.loads(r['choices'][0]['message']['content'])
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429:
                ra = e.headers.get('retry-after') or '20'
                try: wait = min(int(float(ra)) + 1, 40)
                except Exception: wait = 20
                log(f'  429 {code}: attente {wait}s'); time.sleep(wait); continue
            if e.code in (500, 502, 503): time.sleep(6 + attempt * 3); continue
            raise
        except Exception as e:
            last = e
            if attempt >= 4: raise
            time.sleep(4 + attempt * 3)
    raise last or RuntimeError('echec')

def rebuild(frd, td):
    """Structure fr + valeurs traduites validées (repli fr si feuille vide ou balise perdue)."""
    o = {}
    for k, v in frd.items():
        if isinstance(v, dict):
            o[k] = rebuild(v, td.get(k, {}) if isinstance(td.get(k), dict) else {})
        else:
            tv = td.get(k)
            ok = isinstance(tv, str) and tv.strip() and ('<strong>' not in v or '<strong>' in tv)
            o[k] = tv if ok else v
    return o

def process_file(path, context, type_union_name=None):
    src = open(path, encoding='utf-8').read()
    fr = parse_block(src, 'fr')
    assert fr, f'bloc fr introuvable dans {path}'
    existing = [l for l in ALL_LANGS if parse_block(src, l)]
    missing = [l for l in ALL_LANGS if l not in existing]
    only = os.environ.get('LANGS', '').split()
    if only: missing = [l for l in missing if l in only]
    log(f'{os.path.basename(path)} : {leaves(fr)} feuilles fr, {len(existing)} langues, {len(missing)} manquantes')
    if not missing: return 0

    results = {}
    with ThreadPoolExecutor(max_workers=CONC) as ex:
        futs = {ex.submit(call_openai, l, fr, context): l for l in missing}
        for f in as_completed(futs):
            l = futs[f]
            try:
                t = f.result()
                if not isinstance(t, dict): t = {}
                ff, tf = flat(fr), flat(t)
                miss = [k for k in ff if not (isinstance(tf.get(k), str) and tf[k].strip())]
                if miss:
                    log(f'  retry {l}: {len(miss)} feuilles vides')
                    t = call_openai(l, fr, context)
                results[l] = rebuild(fr, t if isinstance(t, dict) else {})
                fallbacks = sum(1 for k, v in flat(results[l]).items() if v == flat(fr)[k])
                log(f'  OK {l} ({leaves(results[l])} feuilles, {fallbacks} replis fr)')
            except Exception as e:
                log(f'  ECHEC {l}: {e}')

    if not results: return 0
    last_lang = existing[-1]
    anchor = re.search(r'\n  ' + last_lang + r': \{\n[\s\S]*?\n  \},', src)
    assert anchor, 'ancre introuvable'
    insert_at = anchor.end()
    blocks = '\n' + '\n'.join(ts_block(l, results[l]) for l in sorted(results))
    src = src[:insert_at] + blocks + src[insert_at:]

    if type_union_name:
        m = re.search(r'export type ' + type_union_name + r' =([^;]+);', src)
        cur = set(re.findall(r"'([a-z]{2})'", m.group(1)))
        union = ' | '.join(f"'{l}'" for l in sorted(cur | set(results)))
        src = src[:m.start()] + f'export type {type_union_name} = {union};' + src[m.end():]

    open(path, 'w', encoding='utf-8').write(src)
    src2 = open(path, encoding='utf-8').read()
    for l in results:
        p = parse_block(src2, l)
        assert p and leaves(p) == leaves(fr), f'validation échouée {l}: {leaves(p) if p else 0}/{leaves(fr)}'
    log(f'  -> {len(results)} langues inserees et validees dans {os.path.basename(path)}')
    return len(results)

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    n = 0
    if target in ('pdf', 'all'):
        n += process_file('server/src/services/pdf.labels.ts',
            'PDF form labels printed on the official accident report (short, often ALL CAPS)',
            type_union_name='PdfLang')
    if target in ('email', 'all'):
        n += process_file('server/src/services/email.service.ts',
            'transactional email sent to drivers with their signed accident report PDF attached')
    log(f'TERMINE : {n} blocs langue ajoutes')
