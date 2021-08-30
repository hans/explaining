import argparse
import csv
import json
from pathlib import Path


def main(args):
    path = Path(args.csv)
    ret = {"name": str(path.parent / path.stem)}
    items = []

    with open(args.csv) as f:
        csvf = csv.DictReader(f)
        for idx, row in enumerate(csvf):
            row["id"] = idx

            # parse boolean values
            to_boolean = [k for k, v in row.items() if v in ["TRUE", "FALSE"]]
            for k in to_boolean:
                row[k] = row[k] == "TRUE"

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
