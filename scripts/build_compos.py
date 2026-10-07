"""Calcule les indicateurs de l'espace « Compositions » à partir des feuilles de match.

Usage :  python scripts/build_compos.py
Entrée : data/compos/export_*.csv  (exports « compositions » : une ligne par joueur et par match)
Sortie : public/data/compos.json   (lu par le site)

Dépendances : pip install pandas
"""
import csv, glob, json, re, unicodedata
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
COMP = {"TOP 14": "T14", "Pro D2": "PD2", "Top 14 Access Match": "ACC", "Pro D2 Access Match": "ACC",
        "Investec Champions Cup": "CC", "EPCR Challenge Cup": "CH", "Six Nations": "6N", "Rugby World Cup": "RWC",
        "International": "INT", "Tour Match": "INT", "Nations Championship": "INT", "World Rugby Nations Cup": "INT",
        "U20 Six Nations": "U20"}
SENIOR_INTL = {"6N", "RWC", "INT"}
PREM = {"Bath Rugby", "Bristol Bears", "Exeter Chiefs", "Gloucester Rugby", "Harlequins", "Leicester Tigers", "London Irish",
        "Northampton Saints", "Sale Sharks", "Saracens", "Newcastle Falcons", "Newcastle Red Bulls", "Wasps", "Worcester Warriors"}
URC = {"Leinster Rugby", "Munster Rugby", "Ulster Rugby", "Connacht Rugby", "Cardiff Rugby", "Ospreys", "Scarlets", "Dragons RFC",
       "Edinburgh Rugby", "Glasgow Warriors", "Benetton Rugby", "Zebre Parma", "Bulls", "Sharks", "Stormers", "Lions", "Emirates Lions"}
# Journées de TOP 14 classées à la main (saison de fin, journée) : décisions prises avec la LNR
FORCE_FAUX = {(2024, 4)}
SEASONS = [2023, 2024, 2025, 2026]


def nk(s):
    return re.sub(r"[^a-z]", "", unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower())


def load():
    df = pd.concat([pd.read_csv(f) for f in sorted(glob.glob(str(ROOT / "data/compos/export_*.csv")))], ignore_index=True)
    df.columns = ["nom", "equipe", "visiteur", "compet", "date", "min", "adv", "poste", "pid", "groupe", "journee", "saison_src",
                  "maillot", "res", "sc", "sco", "v", "d", "n", "jid", "tit", "rempl", "ddn", "age"]
    df = df[df.compet.isin(COMP)].copy()                      # hors rugby à 7
    df["date"] = pd.to_datetime(df["date"])
    df["c"] = df.compet.map(COMP)
    # saison sportive du 1er août au 31 juillet (les tournées de juillet comptent dans la saison qui s'achève)
    df["s"] = np.where(df.date.dt.month >= 8, df.date.dt.year + 1, df.date.dt.year)
    df = df[df.s.isin(SEASONS)].copy()
    # la source n'indique pas toujours le statut : un maillot 1 à 15 sans statut est un titulaire
    df["start"] = (df.tit >= 1) | ((df.tit == 0) & (df.rempl == 0) & df.maillot.between(1, 15))
    df["dom"] = df.equipe != df.visiteur
    df["agev"] = df.age.str.extract(r"(\d+)y")[0].astype(float) + df.age.str.extract(r"(\d+)d")[0].astype(float) / 365.25
    ref = ROOT / "data" / "nationalites.csv"
    nat = {(nk(r["joueur"]), r["date_naissance"]): r["nationalite"] for r in csv.DictReader(ref.open(encoding="utf-8"))}
    df["nat"] = [nat.get((nk(a), b)) for a, b in zip(df.nom, df.ddn)]
    return df


def main():
    df = load()
    t14 = set(df[df.compet == "TOP 14"].equipe)
    pd2 = set(df[df.compet == "Pro D2"].equipe)
    # ligue du club par saison (un club peut changer de division)
    club_lg = {}
    for (s, eq), g in df[df.c.isin(["T14", "PD2"])].groupby(["s", "equipe"]):
        club_lg[(s, eq)] = g.c.mode()[0]

    def team_league(s, eq):
        if (s, eq) in club_lg:
            return club_lg[(s, eq)]
        if eq in PREM: return "PREM"
        if eq in URC: return "URC"
        if eq in t14 or eq in pd2: return "FRA"
        return "NAT" if df[(df.equipe == eq) & df.c.isin(SENIOR_INTL | {"U20"})].shape[0] else "AUT"

    # ---------- joueurs : club, internationaux, titulaires habituels ----------
    lg = df[df.c.isin(["T14", "PD2"])]
    pclub = lg.groupby(["jid", "s"]).equipe.agg(lambda x: x.mode()[0]).to_dict()
    # sélections nationales uniquement : ni clubs en tournée, ni Barbarians, ni équipes réserves (France A, Argentina XV…)
    clubs_all = set(df[df.c.isin(["T14", "PD2", "CC", "CH", "ACC"])].equipe)
    def is_nation(eq):
        return eq not in clubs_all and "Barbarians" not in eq and not eq.endswith((" XV", " A")) and not eq.startswith("World")
    intl_rows = df[df.c.isin(SENIOR_INTL) & df.equipe.map(is_nation)]
    intl_ps = set(zip(intl_rows.jid, intl_rows.s))
    nat_team = intl_rows.groupby(["jid", "s"]).equipe.agg(lambda x: x.mode()[0]).to_dict()
    regs = {}
    for (s, eq), g in lg[lg.start].groupby(["s", "equipe"]):
        regs[(s, eq)] = set(g.groupby("jid").size().sort_values(ascending=False).head(15).index)
    squad = {k: set(g.jid) for k, g in lg.groupby(["s", "equipe"])}
    club_intl = {k: {j for j in v if (j, k[0]) in intl_ps} for k, v in squad.items()}

    # ---------- doublons ----------
    fra = df[(df.equipe == "France") & df.c.isin(SENIOR_INTL)]
    fra_dates = sorted(fra.date.unique())
    T = df[df.c == "T14"]
    cat14, rounds = {}, []
    for (s, j), g in T[T.journee <= 26].groupby(["s", "journee"]):
        d = g.date.mode()[0]
        same = any(abs((x - d).days) <= 2 for x in fra_dates)
        near = any(abs((x - d).days) <= 10 for x in fra_dates)
        pool = set(fra[(fra.date >= d - pd.Timedelta(days=28)) & (fra.date <= d + pd.Timedelta(days=28))].jid)
        played = len(pool & set(g.jid))
        dispo = played / len(pool) if pool else None
        k = 1 if same else (2 if (near and dispo is not None and dispo < 0.4) or (s, j) in FORCE_FAUX else 0)
        cat14[(s, j)] = k
        rounds.append([SEASONS.index(s), int(j), d.strftime("%Y-%m-%d"), k, len(pool), played])
    special = {pd.Timestamp(r[2]): r[3] for r in rounds if r[3]}

    def cat_of(c, s, j, d):
        if c == "T14":
            return cat14.get((s, j), 0)
        if c == "PD2":                       # mêmes week-ends que le TOP 14
            for sd, k in special.items():
                if abs((sd - d).days) <= 2:
                    return k
        return 0

    # ---------- équipes-matchs ----------
    teams, opps = {}, {}
    def tid(eq): return teams.setdefault(eq, len(teams))
    intl_by_j = intl_rows.groupby("jid").date.apply(list).to_dict()
    tm = []
    prev = {}
    for (s, eq), G in df[df.c != "U20"].groupby(["s", "equipe"]):
        tl = team_league(s, eq)
        rg = regs.get((s, eq), set()); ci = club_intl.get((s, eq), set()); sq = squad.get((s, eq), set())
        last = None
        for (d, c), m in G.sort_values("date").groupby(["date", "c"], sort=True):
            st = m[m.start]; sb = m[~m.start]
            xv = set(st.jid)
            chg = None
            if last is not None and (d - last[0]).days <= 28:
                chg = len(xv - last[1])
            last = (d, xv)
            mins = m["min"].sum()
            def lm(lo, hi):
                x = st[st.maillot.between(lo, hi)]["min"]
                return round(float(x.mean()), 1) if len(x) else None
            absent = None
            if c in ("T14", "PD2") and sq:
                lo, hi = d - pd.Timedelta(days=28), d + pd.Timedelta(days=28)
                played = set(m.jid)
                absent = sum(1 for j in sq - played if any(lo <= x <= hi for x in intl_by_j.get(j, [])))
            knat = m[m.nat.notna()]
            tm.append([
                c, SEASONS.index(s), d.strftime("%Y-%m-%d"), tid(eq), m.adv.iloc[0], int(bool(m.dom.iloc[0])),
                {"Won": "V", "Lost": "D", "Drew": "N"}.get(m.res.iloc[0], "?"), tl, int(m.journee.iloc[0]),
                len(xv & rg) if rg else None, len(xv & ci) if sq else None, chg,
                int(len(sb)), round(float(sb["min"].mean()), 1) if len(sb) else None,
                int(80 - sb["min"].max()) if len(sb) and sb["min"].max() <= 80 else None,
                lm(1, 3), lm(4, 5), lm(6, 8), lm(9, 10), lm(11, 15),
                round(float((m.agev * m["min"]).sum() / mins), 2),
                round(float(m[m.agev < 23]["min"].sum() / mins), 3),
                round(float(knat[knat.nat == "France"]["min"].sum() / knat["min"].sum()), 3) if len(knat) and tl in ("T14", "PD2") else None,
                cat_of(c, s, int(m.journee.iloc[0]), d), absent, len(ci) if sq else None,
                int(m.sc.iloc[0]), int(m.sco.iloc[0]), len(st),
            ])

    # ---------- joueurs-saisons (joueurs des clubs de TOP 14 et PRO D2) ----------
    pl = []
    for (jid, s), g in df[df.c != "U20"].groupby(["jid", "s"]):
        eq = pclub.get((jid, s))
        if eq is None:
            continue
        g = g.sort_values("date")
        dates = sorted(g.date.unique())
        weeks = sorted({(d - pd.Timestamp("2022-01-03")).days // 7 for d in dates})
        best = cur = 1
        for a, b in zip(weeks, weeks[1:]):
            cur = cur + 1 if b == a + 1 else 1
            best = max(best, cur)
        gaps = [(b - a).days for a, b in zip(dates, dates[1:])]
        fam = g.c.map(lambda c: "L" if c in ("T14", "PD2", "ACC") else ("E" if c in ("CC", "CH") else "I"))
        mins = g.groupby(fam)["min"].sum()
        pl.append([
            g.nom.iloc[0], tid(eq), club_lg[(s, eq)], SEASONS.index(s),
            int(mins.get("L", 0)), int(mins.get("E", 0)), int(mins.get("I", 0)),
            len(dates), int(g.start.sum()), best, sum(1 for x in gaps if x <= 5),
            round(float(g.agev.mean()), 1), g.nat.iloc[0] if isinstance(g.nat.iloc[0], str) else None,
            1 if (jid, s) in intl_ps else 0, 1 if jid in regs.get((s, eq), set()) else 0,
            nat_team.get((jid, s)), int((fam == "I").sum()), int(g.groupby("date").size().shape[0] - g[fam == "I"].date.nunique()),
        ])

    names = sorted(teams, key=teams.get)
    out = {"seasons": [f"{s-1}/{str(s)[2:]}" for s in SEASONS], "teams": names, "rounds": rounds, "tm": tm, "pl": pl,
           "built": pd.Timestamp.now().strftime("%Y-%m-%d")}
    dest = ROOT / "public" / "data" / "compos.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(tm)} équipes-matchs, {len(pl)} joueurs-saisons -> {dest} ({dest.stat().st_size/1e6:.2f} Mo)")


if __name__ == "__main__":
    main()
