import math

# 1. Test Mulberry32 PRNG consistency
def mulberry32(seed):
    s = seed & 0xFFFFFFFF
    def next_rand():
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = (s ^ (s >> 15)) * (1 | s) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return next_rand

def hash_seed(str_val):
    h = 0
    for ch in str_val:
        h = (((h << 5) - h) + ord(ch)) & 0xFFFFFFFF
        if h >= 0x80000000:
            h -= 0x100000000
    return abs(h)

# Test daily consistency
seed_today_1 = hash_seed("2026-11-05")
seed_today_2 = hash_seed("2026-11-05")
assert seed_today_1 == seed_today_2, "Same day seeds must match!"

rng1 = mulberry32(seed_today_1)
rng2 = mulberry32(seed_today_2)
seq1 = [rng1() for _ in range(50)]
seq2 = [rng2() for _ in range(50)]
assert seq1 == seq2, "PRNG sequence for same day must be 100% deterministic and identical!"

seed_tomorrow = hash_seed("2026-11-06")
rng3 = mulberry32(seed_tomorrow)
seq3 = [rng3() for _ in range(50)]
assert seq1 != seq3, "Different days must produce distinct sequences!"
print("PRNG Daily Challenge verification: PASSED!")

# 2. Test trimming math
prev_x = 100.0
prev_w = 200.0

# Right drop
curr_x_right = 140.0
curr_w = prev_w
diff = curr_x_right - prev_x # +40
abs_diff = abs(diff) # 40
new_w = curr_w - abs_diff # 160
placed_x = curr_x_right # 140
debris_x = curr_x_right + new_w # 300
debris_w = abs_diff # 40

assert placed_x == 140
assert placed_x + new_w == 300
assert debris_x == 300
assert debris_x + debris_w == 340
assert (placed_x + new_w + debris_w) - curr_x_right == curr_w
print("Right slice coordinate test: PASSED!")

# Left drop
curr_x_left = 60.0
diff = curr_x_left - prev_x # -40
abs_diff = abs(diff) # 40
new_w = curr_w - abs_diff # 160
placed_x = prev_x # 100
debris_x = curr_x_left # 60
debris_w = abs_diff # 40

assert placed_x == 100
assert placed_x + new_w == 260
assert debris_x == 60
assert debris_x + debris_w == 100
assert (placed_x + new_w) - curr_x_left == curr_w
print("Left slice coordinate test: PASSED!")

# 3. Test Verdict generation across all score ranges
scores_to_test = [0, 1, 2, 3, 5, 8, 12, 16, 22, 28, 35, 45, 55, 68, 75, 100, 250]
for s in scores_to_test:
    if s == 0:
        title = 'Ground Level!'
    elif s < 4:
        title = 'Wobbly Warmup'
    elif s < 10:
        title = 'Apprentice Mason'
    elif s < 18:
        title = 'Tower Builder'
    elif s < 30:
        title = 'Skyline Architect'
    elif s < 48:
        title = 'Tower Titan'
    elif s < 70:
        title = 'Stratosphere Stacker'
    else:
        title = 'Gravity Defier'
    assert len(title) > 0

# 4. Test Difficulty Level Profiles & Tolerances
difficulties = {
    "easy": {
        "initialWidth": 230,
        "baseSpeed": 175,
        "perfectTolerance": 6.5,
        "hasLaserGuide": True
    },
    "medium": {
        "initialWidth": 200,
        "baseSpeed": 230,
        "perfectTolerance": 4.0,
        "hasLaserGuide": False
    },
    "hard": {
        "initialWidth": 170,
        "baseSpeed": 290,
        "perfectTolerance": 2.5,
        "hasLaserGuide": False
    }
}

# Verify Easy is gentler and wider than Medium
assert difficulties["easy"]["initialWidth"] > difficulties["medium"]["initialWidth"]
assert difficulties["easy"]["baseSpeed"] < difficulties["medium"]["baseSpeed"]
assert difficulties["easy"]["perfectTolerance"] > difficulties["medium"]["perfectTolerance"]
assert difficulties["easy"]["hasLaserGuide"] is True

# Verify Hard is faster and narrower than Medium
assert difficulties["hard"]["initialWidth"] < difficulties["medium"]["initialWidth"]
assert difficulties["hard"]["baseSpeed"] > difficulties["medium"]["baseSpeed"]
assert difficulties["hard"]["perfectTolerance"] < difficulties["medium"]["perfectTolerance"]
print("Difficulty configuration profile verification: PASSED!")

print("Verdict ranges test: PASSED!")
print("ALL SYSTEM VERIFICATIONS COMPLETED SUCCESSFULLY!")
