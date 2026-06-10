#!/usr/bin/env python3
"""
translate-locales — complète les locales i18n à 100% du core via l'API Claude.
Idempotent : ne traduit QUE les clés manquantes (ré-exécutable pour reprendre).
Préserve les placeholders {{x}} et les balises HTML. Valide avant d'écrire.

Usage: python3 scripts/translate-locales.py es ar zh   (langues précises)
       python3 scripts/translate-locales.py --all       (toutes les incomplètes)
"""
import json, os, re, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Semaphore

ROOT = os.getcwd()
LOC = os.path.join(ROOT, 'client/src/i18n/locales')
KEY = open('/mnt/project/Key_Anthropic_').read().strip()
MODEL = 'claude-sonnet-4-5-20250929'
OPENAI_KEY = open('/mnt/project/Open_ai_key_pour_reconnaissance_vocales').read().strip()
OPENAI_MODEL = 'gpt-4o-mini'
SEM = {'claude': Semaphore(int(os.environ.get('CL','2'))), 'openai': Semaphore(int(os.environ.get('OA','5')))}
SKIP_NS = {'police'}
BATCH = int(os.environ.get('BATCH','110'))
WORKERS = int(os.environ.get('WORKERS','8'))      # langues en parallele
LOG = '/tmp/translate.log'

LANG_NAMES = {
 'es':'Spanish','pt':'Portuguese','nl':'Dutch','pl':'Polish','cs':'Czech','sk':'Slovak',
 'hu':'Hungarian','ro':'Romanian','sv':'Swedish','da':'Danish','nb':'Norwegian Bokmål',
 'fi':'Finnish','tr':'Turkish','ru':'Russian','uk':'Ukrainian','ar':'Arabic','he':'Hebrew',
 'fa':'Persian (Farsi)','ur':'Urdu','zh':'Simplified Chinese','ja':'Japanese','ko':'Korean',
 'hi':'Hindi','th':'Thai','vi':'Vietnamese','id':'Indonesian','ms':'Malay','bn':'Bengali',
 'tl':'Filipino (Tagalog)','el':'Greek','hr':'Croatian','bg':'Bulgarian','sr':'Serbian',
 'sl':'Slovenian','bs':'Bosnian','mk':'Macedonian','sq':'Albanian','et':'Estonian',
 'lv':'Latvian','lt':'Lithuanian','ka':'Georgian','az':'Azerbaijani','ti':'Tigrinya',
 'am':'Amharic','wo':'Wolof','so':'Somali',
}

def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG, 'a') as f: f.write(line + '\n')

def flatten(obj, prefix=''):
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            kp = f"{prefix}.{k}" if prefix else k
            out.update(flatten(v, kp))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out.update(flatten(v, f"{prefix}.{i}"))
    else:
        out[prefix] = obj
    return out

def deep_set(obj, dotted, value):
    """Pose value au chemin dotted dans obj, en COERÇANT le type des conteneurs
    (liste si le segment suivant est numérique, sinon objet). Écrase toute
    structure périmée incompatible — c'est voulu : la forme de référence est fr."""
    parts = dotted.split('.')
    cur = obj
    for i, p in enumerate(parts):
        last = i == len(parts) - 1
        if last:
            if isinstance(cur, list):
                idx = int(p)
                while len(cur) <= idx: cur.append(None)
                cur[idx] = value
            else:
                cur[p] = value
            return
        want = list if parts[i+1].isdigit() else dict
        if isinstance(cur, list):
            idx = int(p)
            while len(cur) <= idx: cur.append(None)
            if not isinstance(cur[idx], want): cur[idx] = want()
            cur = cur[idx]
        else:
            if p not in cur or not isinstance(cur[p], want): cur[p] = want()
            cur = cur[p]

def load(lang):
    with open(os.path.join(LOC, f'{lang}.json'), encoding='utf-8') as f:
        return json.load(f)

PH = re.compile(r'\{\{[^}]+\}\}')
TAG = re.compile(r'</?[a-zA-Z][^>]*>')

def tokens(s):
    return sorted(PH.findall(s)) , sorted(TAG.findall(s))

def api_translate(lang_name, code, items):
    src = json.dumps(items, ensure_ascii=False)
    prompt = (
      f"You are a professional UI localizer for \"boom.contact\", a mobile web app that lets two drivers "
      f"fill a digital car-accident report (European 'constat amiable') together and send it to their insurers. "
      f"Translate the following UI strings from French into {lang_name} ({code}).\n\n"
      f"STRICT RULES:\n"
      f"- Output ONLY a JSON object mapping each original key to its translated value. No markdown, no commentary.\n"
      f"- Preserve EXACTLY every interpolation placeholder such as {{{{count}}}}, {{{{name}}}}, {{{{x}}}} — never translate or modify them, keep them where they belong.\n"
      f"- Preserve EXACTLY every HTML tag such as <strong>, </strong>, <br>.\n"
      f"- Translate the VALUES only; keep the KEYS identical.\n"
      f"- Natural, concise, professional UI wording. Use the polite/formal register standard for the language. "
      f"Use the correct established insurance/legal terms (e.g. 'accident report', 'insurer', 'policy number').\n"
      f"- For RTL languages, output plain text (no direction marks).\n\n"
      f"French source JSON:\n{src}"
    )
    body = json.dumps({"model": MODEL, "max_tokens": int(os.environ.get("MAXTOK","8000")),
      "messages":[{"role":"user","content":prompt}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body,
      headers={"x-api-key":KEY,"anthropic-version":"2023-06-01","content-type":"application/json"})
    last = None
    for attempt in range(10):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=240))
            if r.get('stop_reason') == 'max_tokens':
                raise RuntimeError('max_tokens atteint (batch trop gros)')
            txt = r['content'][0]['text'].strip()
            txt = re.sub(r'^```(?:json)?\s*|\s*```$', '', txt).strip()
            return json.loads(txt)
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429:
                ra = e.headers.get('retry-after') or e.headers.get('Retry-After') or '60'
                try: wait = min(int(float(ra)) + 2, 75)
                except Exception: wait = 60
                log(f"  429 {code}: attente {wait}s"); time.sleep(wait); continue
            if e.code in (500, 502, 503, 529):
                time.sleep(8 + attempt * 4); continue
            raise
        except Exception as e:
            last = e
            if attempt >= 4: raise
            time.sleep(5 + attempt * 3)
    raise last or RuntimeError('echecs repetes')

def api_translate_openai(lang_name, code, items):
    src = json.dumps(items, ensure_ascii=False)
    system = (
      f"You are a professional UI localizer for \"boom.contact\", a mobile web app where two drivers fill a "
      f"digital car-accident report (European 'constat amiable') together and send it to their insurers. "
      f"Translate the given UI strings from French into {lang_name} ({code}).\n"
      f"Output ONLY a JSON object mapping each original key to its translated value. "
      f"Preserve EXACTLY every placeholder like {{{{count}}}}, {{{{name}}}} and every HTML tag like <strong>. "
      f"Translate values only, keep keys identical. Natural, concise, professional wording with the polite/formal "
      f"register standard for the language, and correct insurance/legal terms."
    )
    body = json.dumps({"model": OPENAI_MODEL, "temperature": 0.2, "max_tokens": 16000,
      "response_format": {"type": "json_object"},
      "messages": [{"role":"system","content":system},{"role":"user","content":src}]}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=body,
      headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"})
    last = None
    for attempt in range(10):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=240))
            if r['choices'][0].get('finish_reason') == 'length':
                raise RuntimeError('reponse tronquee (length) — reduire BATCH')
            return json.loads(r['choices'][0]['message']['content'])
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429:
                ra = e.headers.get('retry-after') or '20'
                try: wait = min(int(float(ra)) + 1, 40)
                except Exception: wait = 20
                log(f"  429 openai {code}: attente {wait}s"); time.sleep(wait); continue
            if e.code in (500,502,503): time.sleep(6 + attempt*3); continue
            raise
        except Exception as e:
            last = e
            if attempt >= 4: raise
            time.sleep(4 + attempt*3)
    raise last or RuntimeError('echecs repetes')

def translate_call(backend, name, code, items):
    return api_translate_openai(name, code, items) if backend == 'openai' else api_translate(name, code, items)

def write_locale(code, tgt, allv, core_keys):
    core_tree = {}
    for k, v in allv.items():
        deep_set(core_tree, k, v)
    for ns in {k.split('.')[0] for k in core_keys}:
        if ns in core_tree:
            tgt[ns] = core_tree[ns]
    with open(os.path.join(LOC, f'{code}.json'), 'w', encoding='utf-8') as f:
        json.dump(tgt, f, ensure_ascii=False, indent=2)
        f.write('\n')

def translate_lang(code, backend='claude'):
    name = LANG_NAMES.get(code, code)
    fr_flat = flatten(load('fr'))
    core = {k: v for k, v in fr_flat.items() if k.split('.')[0] not in SKIP_NS}
    tgt = load(code)
    tflat = flatten(tgt)

    reuse = {}; to_translate = {}
    for k, v in core.items():
        if not isinstance(v, str):
            reuse[k] = v
        elif isinstance(tflat.get(k), str) and tflat[k].strip():
            reuse[k] = tflat[k]
        else:
            to_translate[k] = v

    if not to_translate:
        log(f"{code} ({name}) : deja complet ({len(reuse)}/{len(core)})")
        return code, 0, 0

    SEM[backend].acquire()
    translated = {}
    keys = list(to_translate.keys())
    chunks = [keys[i:i+BATCH] for i in range(0, len(keys), BATCH)]
    for ci, chunk in enumerate(chunks):
        items = {k: to_translate[k] for k in chunk}
        try:
            out = translate_call(backend, name, code, items)
            for k in chunk:
                if not isinstance(out.get(k), str):
                    continue
                sp, st = tokens(to_translate[k]); tp, tt = tokens(out[k])
                if sp != tp or st != tt:
                    continue
                translated[k] = out[k]
        except Exception as e:
            log(f"{code} chunk {ci} echec: {type(e).__name__} {str(e)[:50]}")
        write_locale(code, tgt, {**reuse, **translated}, core.keys())   # banque le progres apres CHAQUE chunk
    SEM[backend].release()
    done = len(reuse) + len(translated)
    log(f"{code} ({name}) [{backend}] : {done}/{len(core)} core | +{len(translated)} traduites, {len(to_translate)-len(translated)} restantes")
    return code, len(translated), len(to_translate) - len(translated)

def main():
    args = sys.argv[1:]
    if '--all' in args:
        all_l = sorted(f[:-5] for f in os.listdir(LOC) if f.endswith('.json'))
        fr = flatten(load('fr')); core = {k for k,v in fr.items() if k.split('.')[0] not in SKIP_NS and isinstance(v,str)}
        langs = [l for l in all_l if l not in ('fr','de','it','en') and len(core - set(flatten(load(l)))) > 0]
    else:
        langs = args
    log(f"=== Traduction de {len(langs)} langues sur 2 moteurs : {', '.join(langs)} ===")
    # Répartition : alternance claude/openai (limites de débit indépendantes)
    fb = os.environ.get('FORCE_BACKEND'); assign = {l: (fb if fb else ('claude' if i % 4 == 0 else 'openai')) for i, l in enumerate(langs)}
    pool = int(os.environ.get('CL', '2')) + int(os.environ.get('OA', '5')) + 1
    with ThreadPoolExecutor(max_workers=pool) as ex:
        futs = {ex.submit(translate_lang, l, assign[l]): l for l in langs}
        for fu in as_completed(futs):
            try: fu.result()
            except Exception as e: log(f"{futs[fu]} ERREUR: {str(e)[:120]}")
    log("=== TERMINÉ ===")
    open('/tmp/translate.done','w').write('done')

if __name__ == '__main__':
    main()
