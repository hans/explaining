import json, sys
pragma = json.load(sys.stdin)

for pragma_key, psiturk_key in [("title", "PSITURK_TITLE"),
                                ("description", "PSITURK_DESCRIPTION"),
                                ("version", "PSITURK_EXPERIMENT_CODE_VERSION")]:
    if pragma_key in pragma:
        value = pragma[pragma_key]
        if value:
            print(f"{psiturk_key}={value}")
