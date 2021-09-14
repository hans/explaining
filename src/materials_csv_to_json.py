import argparse
import csv
import json
from pathlib import Path

import pandas as pd


def main(args):
    path = Path(args.csv)
    ret = {"name": str(path.parent / path.stem)}
    items = []

    materials_df = pd.read_csv(path)
    for idx, row in enumerate(materials_df.to_dict(orient="records")):
        row["id"] = idx
        items.append(row)

    ret["items"] = items

    outf = args.outf or Path(args.csv).with_suffix(".json")
    with open(outf, "w") as f:
        json.dump(ret, f)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()

    parser.add_argument("csv")
    parser.add_argument("-o", "--outf")

    main(parser.parse_args())
