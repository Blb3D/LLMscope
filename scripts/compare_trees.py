import argparse, hashlib, os, sys, csv
from pathlib import Path

DEFAULT_EXCLUDES = {".git","node_modules","dist","build","__pycache__","archive","data"}

def should_exclude(rel: Path, excludes):
    s = str(rel).replace("\\","/")
    return any(part in s.split("/") for part in excludes)

def filehash(p: Path, algo="sha256", block=1024*1024):
    h = hashlib.new(algo)
    with p.open("rb") as f:
        while True:
            b = f.read(block)
            if not b: break
            h.update(b)
    return h.hexdigest()

def index_tree(root: Path, excludes, algo):
    by_path = {}
    by_hash = {}
    for p in root.rglob("*"):
        if not p.is_file(): continue
        rel = p.relative_to(root)
        if should_exclude(rel, excludes): continue
        try:
            h = filehash(p, algo)
        except Exception:
            h = ""
        info = {
            "rel": str(rel).replace("\\","/"),
            "size": p.stat().st_size,
            "mtime": int(p.stat().st_mtime),
            "hash": h
        }
        by_path[info["rel"]] = info
        if h:
            by_hash.setdefault(h, []).append(info["rel"])
    return by_path, by_hash

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("target")
    ap.add_argument("--exclude", nargs="*", default=list(DEFAULT_EXCLUDES))
    ap.add_argument("--algo", default="sha256", choices=hashlib.algorithms_available)
    ap.add_argument("--csvout", default="")
    args = ap.parse_args()

    src_root = Path(args.source).resolve()
    dst_root = Path(args.target).resolve()
    if not src_root.exists() or not dst_root.exists():
        print("Both paths must exist.", file=sys.stderr); sys.exit(1)

    print("Indexing:", src_root)
    s_by_path, s_by_hash = index_tree(src_root, set(args.exclude), args.algo)
    print("Indexing:", dst_root)
    d_by_path, d_by_hash = index_tree(dst_root, set(args.exclude), args.algo)

    added, removed, changed, moved = [], [], [], []

    all_paths = sorted(set(s_by_path.keys()) | set(d_by_path.keys()))
    for p in all_paths:
        a = s_by_path.get(p)
        b = d_by_path.get(p)
        if a and not b: removed.append(a); continue
        if b and not a: added.append(b);   continue
        if a and b and (a["hash"] != b["hash"] or a["size"] != b["size"]):
            changed.append({"rel":p, "src_hash":a["hash"], "dst_hash":b["hash"], "src_size":a["size"], "dst_size":b["size"]})

    # moved/renamed: hash appears in both trees at different paths
    for h, s_paths in s_by_hash.items():
        d_paths = d_by_hash.get(h, [])
        for sp in s_paths:
            if sp not in d_paths and d_paths:
                moved.append({"hash":h, "from":sp, "to":d_paths[0]})

    print("\n==== SUMMARY ====")
    print(f"Added   : {len(added)}")
    print(f"Removed : {len(removed)}")
    print(f"Changed : {len(changed)}")
    print(f"Moved   : {len(moved)}\n")

    if added:
        print("Added:")
        for x in added[:20]: print(" +", x["rel"])
        if len(added)>20: print(f" (+{len(added)-20} more)")
        print()
    if removed:
        print("Removed:")
        for x in removed[:20]: print(" -", x["rel"])
        if len(removed)>20: print(f" (+{len(removed)-20} more)")
        print()
    if changed:
        print("Changed:")
        for x in changed[:20]:
            print(f" * {x['rel']}  ({x['src_size']} -> {x['dst_size']} bytes)")
        if len(changed)>20: print(f" (+{len(changed)-20} more)")
        print()
    if moved:
        print("Moved/Renamed:")
        for x in moved[:20]:
            print(f" > {x['from']}  ->  {x['to']}")
        if len(moved)>20: print(f" (+{len(moved)-20} more)")

    if args.csvout:
        with open(args.csvout, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["status","path","hash","size","from","to"])
            for x in added:   w.writerow(["ADDED",   x["rel"], x["hash"], x["size"], "", ""])
            for x in removed: w.writerow(["REMOVED", x["rel"], x["hash"], x["size"], "", ""])
            for x in changed: w.writerow(["CHANGED", x["rel"], f"{x['src_hash']}->{x['dst_hash']}", f"{x['src_size']}->{x['dst_size']}", "", ""])
            for x in moved:   w.writerow(["MOVED",   x["to"],  x["hash"], "", x["from"], x["to"]])
        print(f"\nCSV written to {args.csvout}")

if __name__ == "__main__":
    main()
