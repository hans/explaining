"""
Extracts data for all experiments from the Psiturk database,
performs minimal preprocessing, and saves to CSV files for use in R analyses.
"""

from argparse import ArgumentParser
import datetime
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent / "src"))

import pandas as pd

import data as D


# Metadata fields to extract from each trial
METADATA_FIELDS = ("experiment_id", "materials_id", "item_id", "condition_id")

NULL_CONDITION_VALUE = -1

def main(args):
    db_path = Path(__file__).parent.parent / "data" / "participants.db"
    D._get_connection(db_path)

    raw_df = D.get_trials_df(D.load_raw_results(), METADATA_FIELDS)
    print(len(raw_df))

    longest_condition_id = raw_df.condition_id.dropna().apply(len).max()
    def parse_condition_id(condition_id):
        if condition_id is None:
            return pd.Series([NULL_CONDITION_VALUE] * longest_condition_id)

        pad_list = [NULL_CONDITION_VALUE] * (longest_condition_id - len(condition_id))
        parsed = pd.Series(condition_id + pad_list)

        # For numeric conditions, make sure these remain int-valued. replace NA values
        # with -1 so we can keep the int value.
        if parsed.dtype.kind == "f":
            parsed = parsed.fillna(NULL_CONDITION_VALUE).astype(int)

        return parsed

    # Expand condition data from list to multiple columns
    condition_cols = raw_df.condition_id.apply(parse_condition_id) \
        .rename(columns=lambda k: f"condition_{k}")
    raw_df = pd.concat([raw_df, condition_cols], axis=1) \
        .drop(columns="condition_id")

    # Add `experiment_id` to early trials which mistakenly dropped it.
    raw_df.loc[(raw_df.trial_type.isin(["html-slider-response-with-copout", "survey-text", "survey-multi-choice"])) & raw_df.experiment_id.isna() & (raw_df.dateTime < 1628370478823), "experiment_id"] = "00_comprehension_swarm-construction-meaning"

    time_str = datetime.datetime.now().strftime("%Y-%m-%d-%H%M")
    out_file = f"raw_data.{time_str}.csv"
    out_path = Path(args.outdir) / out_file
    print(f"Writing {len(raw_df)} rows to {out_path}")

    raw_df.to_csv(out_path)


if __name__ == "__main__":
    p = ArgumentParser()

    p.add_argument("-o", "--outdir", default=str(Path(__file__).parent.parent / "data"))

    main(p.parse_args())
