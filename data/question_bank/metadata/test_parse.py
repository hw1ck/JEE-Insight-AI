import os
import sys
import json
import csv
import re

# Test parsing on 2022, 2023, 2024, 2025
def test_parse_2022_2024():
    csv_file = "data/question_bank/raw/2024/jee_main_2024_all_shifts.csv"
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= 3:
                break
            opts_raw = row.get("options") or "[]"
            opts = json.loads(opts_raw) if opts_raw else []
            corr_raw = row.get("correct_option") or "[]"
            corr = json.loads(corr_raw) if corr_raw.startswith("[") else [corr_raw]
            corr_ans = corr[0] if corr else row.get("answer")
            print(f"2024 Row {i}:")
            print("  qid:", row.get("question_id"))
            print("  paper_id:", row.get("paper_id"))
            print("  qtype:", row.get("question_type"))
            print("  options count:", len(opts))
            print("  correct_ans:", corr_ans)

def test_parse_2025():
    jsonl_file = "data/question_bank/raw/2025/main2025-jan-math.jsonl"
    with open(jsonl_file, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= 3:
                break
            row = json.loads(line)
            opts = row.get("options", [])
            corr_opts = row.get("correct_options", [])
            opt_letter = ["A", "B", "C", "D"][corr_opts[0]] if corr_opts and corr_opts[0] < 4 else "A"
            print(f"2025 Row {i}:")
            print("  q:", row.get("question")[:60])
            print("  options:", opts)
            print("  corr:", opt_letter, "(raw index:", corr_opts, ")")
            print("  answer:", row.get("answer"))

test_parse_2022_2024()
print("\n" + "="*40 + "\n")
test_parse_2025()
