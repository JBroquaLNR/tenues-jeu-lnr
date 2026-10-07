"""Import des exports Opta (Excel) vers l'Observatoire LNR.

Usage :
    python scripts/import_excel.py top14 chemin/TOP_14.xlsx
    python scripts/import_excel.py prod2 chemin/PRO_D2.xlsx
    python scripts/import_excel.py prod2 chemin/PRO_D2.xlsx --push   # envoie aussi vers Supabase

Ce que fait le script :
  1. nettoie l'export (accents mal encodés, astérisques dans les noms, saisons "2019" -> "2018/2019",
     dates de naissance invalides) ;
  2. écrit data/player_seasons_<championnat>.csv (importable depuis le tableau de bord Supabase) ;
  3. régénère public/data/player_seasons.json (données de secours quand Supabase n'est pas configuré) ;
  4. avec --push : remplace toutes les lignes du championnat dans Supabase.
     Nécessite les variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.

Colonnes optionnelles reconnues si elles sont ajoutées à l'export : "Nationalité", "JIFF" (oui/non).
Si l'export n'a pas de nationalité, elle est reprise de data/nationalites.csv (joueur + date de naissance).
Dépendances : pip install pandas openpyxl requests
"""
import csv
import datetime as dt
import json
import os
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
FIELDS = ["championnat", "saison", "joueur", "clubs", "minutes", "matchs", "titularisations",
          "entrees", "date_naissance", "postes", "nationalite", "jiff"]


def fix(s):
    """Répare le texte UTF-8 lu comme du Latin-1 (ex. 'PlantÃ©' -> 'Planté')."""
    if not isinstance(s, str):
        return s
    try:
        return s.encode("latin1").decode("utf8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def col(df, *starts):
    for c in df.columns:
        if any(c.lower().startswith(s.lower()) for s in starts):
            return c
    return None


def parse_season(v):
    v = str(v).strip()
    if "/" in v:
        return v
    end = int(float(v))
    return f"{end - 1}/{end}"


def parse_date(v):
    if isinstance(v, (dt.datetime, pd.Timestamp)):
        return pd.Timestamp(v).date().isoformat()
    try:
        d = pd.to_datetime(v, errors="coerce")
        return None if pd.isna(d) else d.date().isoformat()
    except Exception:
        return None


def parse_bool(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip().lower()
    if s in ("oui", "o", "yes", "y", "1", "true", "vrai", "jiff"):
        return True
    if s in ("non", "n", "no", "0", "false", "faux", "non jiff"):
        return False
    return None


def read_export(path, championnat):
    df = pd.read_excel(path)
    df.columns = [fix(str(c)).strip() for c in df.columns]
    c_starts = col(df, "Jeux Commen", "Games Started")
    c_nat = col(df, "Nationalit")
    c_jiff = col(df, "JIFF")
    records = []
    for _, r in df.iterrows():
        pos = r.get("Position Id(s)")
        postes = []
        if isinstance(pos, str):
            postes = [int(p) for p in pos.split(",") if p.strip()]
        elif pos is not None and not pd.isna(pos):
            postes = [int(pos)]
        nat = r.get(c_nat) if c_nat else None
        records.append({
            "championnat": championnat,
            "saison": parse_season(r["Saison"]),
            "joueur": " ".join(fix(str(r["Full Name"])).replace("*", "").split()),
            "clubs": [t.strip() for t in str(r["Team(s)"]).split(",") if t.strip()],
            "minutes": int(r["Minutes"]),
            "matchs": int(r[col(df, "Matches Jou")]),
            # la source sous-compte parfois les titularisations (2018/19, 2019/20) : on garde matchs - entrées si c'est plus élevé
            "titularisations": max(int(r[c_starts]), int(r[col(df, "Matches Jou")]) - int(r["Games Played as Substitution"])),
            "entrees": int(r["Games Played as Substitution"]),
            "date_naissance": parse_date(r["Date de Naissance"]),
            "postes": postes,
            "nationalite": None if nat is None or (isinstance(nat, float) and pd.isna(nat)) else fix(str(nat)).strip(),
            "jiff": parse_bool(r.get(c_jiff)) if c_jiff else None,
        })
    return records


def apply_nationalities(records):
    """Applique la nationalité de data/nationalites.csv (clé : joueur + date de naissance).
    Ce fichier fait référence : il contient les corrections manuelles et les sélections internationales."""
    ref = ROOT / "data" / "nationalites.csv"
    if not ref.exists():
        return 0
    with ref.open(encoding="utf-8") as fh:
        table = {(r["joueur"], r["date_naissance"]): r["nationalite"] for r in csv.DictReader(fh)}
    n = 0
    for r in records:
        nat = table.get((r["joueur"], r["date_naissance"] or ""))
        if nat and nat != r["nationalite"]:  # data/nationalites.csv fait référence
            if nat:
                r["nationalite"] = nat
                n += 1
    return n


def to_db(r):
    """Format texte simple, identique dans le CSV, le JSON de secours et Supabase."""
    return {
        **r,
        "clubs": "|".join(r["clubs"]),
        "postes": ",".join(map(str, r["postes"])),
        "date_naissance": r["date_naissance"] or "",
        "nationalite": r["nationalite"] or "",
        "jiff": "" if r["jiff"] is None else ("oui" if r["jiff"] else "non"),
    }


def write_csv(records, championnat):
    out = ROOT / "data" / f"player_seasons_{championnat}.csv"
    out.parent.mkdir(exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in records:
            w.writerow(to_db(r))
    return out


def rebuild_static_json():
    """Fusionne tous les CSV de data/ dans public/data/player_seasons.json."""
    all_records = []
    for f in sorted((ROOT / "data").glob("player_seasons_*.csv")):
        with f.open(encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                for k in ("minutes", "matchs", "titularisations", "entrees"):
                    r[k] = int(r[k])
                all_records.append(r)
    out = ROOT / "public" / "data" / "player_seasons.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(all_records, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return out, len(all_records)


def push(records, championnat):
    import requests
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/player_seasons"
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=minimal"}
    r = requests.delete(url, headers=h, params={"championnat": f"eq.{championnat}"}, timeout=60)
    r.raise_for_status()
    for i in range(0, len(records), 500):
        r = requests.post(url, headers=h, data=json.dumps([{k: (v if v != "" else None) for k, v in to_db(x).items()} for x in records[i:i + 500]]), timeout=60)
        r.raise_for_status()
    print(f"Supabase : {len(records)} lignes {championnat} importées.")


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("top14", "prod2"):
        print(__doc__)
        sys.exit(1)
    champ, path = sys.argv[1], sys.argv[2]
    recs = read_export(path, champ)
    seasons = sorted({r["saison"] for r in recs})
    print(f"{len(recs)} lignes lues, saisons {seasons[0]} à {seasons[-1]}.")
    filled = apply_nationalities(recs)
    print(f"Nationalité renseignée pour {sum(1 for r in recs if r['nationalite'])} lignes sur {len(recs)} (dont {filled} via data/nationalites.csv).")
    print("CSV :", write_csv(recs, champ))
    out, n = rebuild_static_json()
    print(f"JSON de secours : {out} ({n} lignes au total)")
    if "--push" in sys.argv:
        push(recs, champ)
