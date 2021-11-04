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

def main(args):
    db_path = Path(__file__).parent.parent / "data" / "participants.db"
    D._get_connection(db_path)
    
    raw_df = D.get_trials_df(D.load_raw_results(), METADATA_FIELDS)
    
    # Expand condition data from list to multiple columns
    condition_cols = raw_df.condition_id.apply(pd.Series) \
        .rename(columns=lambda k: f"condition_{k}").astype(str)
    raw_df = pd.concat([raw_df, condition_cols], axis=1) \
        .drop(columns="condition_id")
    
    time_str = datetime.datetime.now().strftime("%Y-%m-%d-%H%M")
    out_file = f"raw_data.{time_str}.csv"
    out_path = Path(args.outdir) / out_file
    print(f"Writing {len(raw_df)} rows to {out_path}")
    
    raw_df.to_csv(out_path)
    
    
if __name__ == "__main__":
    p = ArgumentParser()
    
    p.add_argument("-o", "--outdir", default=str(Path(__file__).parent.parent / "data"))
    
    main(p.parse_args())