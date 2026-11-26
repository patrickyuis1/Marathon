#!/usr/bin/env python3
"""
Generates js/program-data.js - a 22-week first-marathon plan for the
London Marathon, Saturday 24 April 2027.

Athlete (from her questionnaire): 25, 166 cm, 54 kg, running since April 2026,
1 run a week, 7-10 km/week, longest run 7 km, 10k in 58:00, resting HR 64,
max HR 177. Goal: under 5 hours, hoping for 4:30. First marathon. Long run on
Fridays. Up to 2 h on a weekday. Gym and treadmill access. Weight trains.
Right ankle tendon-sheath injury, ~80% healed and improving.

Shape of the plan:
- Weeks 1-4  Base & ankle rebuild: 2 runs + 3 gym (what she asked for).
- Weeks 5-8  Build I: a third, short easy run replaces the Saturday gym
             session. With 2 runs a week a first marathon is a big ask on
             the ankle; a third easy run spreads the load.
- Weeks 9-12 Build II: tempo and intervals arrive, hopping drills only once
             the ankle passes a hop test.
- Weeks 13-18 Marathon-specific: long run 21 -> 30 km (capped at ~3.5 h),
             goal-pace work, a 10k re-test in week 16, full race rehearsal
             in week 18.
- Weeks 19-21 Taper and race. Week 22 recovery.
Every 4th week is lighter. Long runs grow ~1-2 km a week.

Paces are written as tokens ({E}, {M}, {T}, {I}, {HRE}...) that the app fills
in from her latest race time on the Paces tab, so a new 10k result updates
every session at once.
"""

import json
from datetime import date, timedelta

PROGRAM_START = date(2026, 11, 30)   # Monday
RACE = date(2027, 4, 24)             # Saturday
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
EASY_MIN_PER_KM = 7.33               # ~7:20/km, used only to estimate long-run duration for fuel advice

def week_dates(w):
    s = PROGRAM_START + timedelta(weeks=w - 1)
    return [s + timedelta(days=i) for i in range(7)]

def blk(name, pattern, prescription, detail="", cue="", video=None, log=None):
    b = {"name": name, "pattern": pattern, "prescription": prescription, "detail": detail, "cue": cue}
    if video: b["videoQuery"] = video
    if log: b["log"] = {"fields": log}
    return b

def note(name, detail):
    return blk(name, "rest", "", detail)

def make_day(d, kind, title, subtitle, blocks):
    return {"date": d.isoformat(), "dayName": DAY_NAMES[d.weekday()], "sessionType": kind,
            "title": title, "subtitle": subtitle, "blocks": blocks}

# ---------------- log schemas ----------------
def f(key, label, ph, mode="text", unit="", kind=None):
    d = {"key": key, "label": label, "placeholder": ph, "inputmode": mode, "unit": unit}
    if kind: d["type"] = kind
    return d
TIME_FIELD = f("time", "Time", "", "numeric", "", "duration")   # app shows separate h / m / s boxes
LOG_RUN = [f("distance", "Distance", "km", "decimal", "km"), f("hr", "Avg HR", "bpm", "numeric", "bpm"),
           f("ankle", "Ankle", "0-10", "numeric", "/10"), TIME_FIELD]
LOG_BIKE = [f("hr", "Avg HR", "bpm", "numeric", "bpm"), TIME_FIELD]
LOG_WEIGHT = [f("weight", "Weight", "kg", "decimal", "kg")]

def lines(*parts):
    """Details are written one instruction per line; the app shows each on its own row."""
    return "\n".join(p for p in parts if p)

# ---------------- run blocks ----------------
ANKLE_RULE = "Ankle rule: up to 3/10 discomfort that has settled by the next morning is OK. More than that, or any limp - stop, walk home, swap the next run for the bike."
WU = "Warm-up: the run warm-up drills (6 min, 'Before' button above), then 10 min easy jogging at {E}/km"
CD = "Cool-down: 10 min easy jogging, then the cool-down stretches ('After' button)"

def easy_run(dist, *extra):
    return blk("Easy Run", "run", dist,
               lines("Pace: {E}/km", "Heart rate: {HRE}", "Talk test: you can chat in full sentences", *extra),
               "Slower than you think. Easy runs build the engine; running them too fast just makes you tired.",
               "easy run zone 2 running explained", LOG_RUN)

def strides(n):
    return blk("Strides", "run", f"{n} x 20 sec",
               lines("At the end of the run", "20 s building to fast-but-relaxed (not a sprint)", "Walk back to the start, then go again"),
               "Tall posture, quick light feet.", "running strides how to do them")

def long_minutes(km):
    return round(km * EASY_MIN_PER_KM)

def hm(m):
    return f"{m // 60}h {m % 60:02d}m" if m >= 60 else f"{m} min"

def fuel_practice(km, week):
    # Same thresholds as the long-run ladder on the Fuel tab.
    m = long_minutes(km)
    if m <= 75:
        return "Water only. A normal meal 2-3 h before, or a banana / toast 60 min before."
    if week < 6:
        return "Take water. Gut training starts: try half a gel at ~40 min and note how your stomach feels."
    if m <= 120:
        return "Fuel practice: 30-40 g carbs an hour - a gel at ~40 min, then every 40 min, with sips of water. Note how your stomach feels."
    if km < 28:
        return "Fuel practice: 45-60 g carbs an hour - a gel every 30 min from 30 min, sips of water or sports drink. Try the brand you'll race with."
    return "Race rehearsal fuelling: a gel every 30 min from 30 min plus sips of water or sports drink; electrolytes if it's warm. Weigh yourself before and after to learn your sweat rate."

def long_run(km, week, *extra):
    m = long_minutes(km)
    return blk("Long Run", "run", f"{km} km",
               lines(f"About {hm(m)}", "Pace: {E}/km or slower", "Heart rate: {HRE}", "Walk breaks are fine - e.g. 1 min every 2 km", *extra),
               fuel_practice(km, week), "long run marathon training how to", LOG_RUN)

def tempo(prescription, *main):
    return blk("Tempo Run", "run", prescription, lines(WU, *main, CD),
               "Tempo = 'comfortably hard': you can say a few words, not sentences.", "what is a tempo run threshold run", LOG_RUN)

def intervals(prescription, *main):
    return blk("Intervals", "run", prescription, lines(WU + " + 4 strides", *main, CD),
               "Even reps - the last one should be as fast as the first.", "running interval training 800m repeats", LOG_RUN)

def fartlek(prescription, *main):
    return blk("Fartlek", "run", prescription, lines(WU.replace("10 min", "15 min"), *main, CD),
               "Fartlek = 'speed play': surges by feel, no need to be exact.", "fartlek run explained", LOG_RUN)

def hills(prescription):
    return blk("Hill Repeats", "run", prescription,
               lines(WU, "Main set: 6 x 60 s up a steady hill at a hard effort (8/10)", "Recovery: jog or walk back down after each one", CD),
               "Pick a smooth, even hill. If the ankle is sore, do the same reps on the flat instead.", "hill repeats running technique", LOG_RUN)

def mp_run(prescription, *main):
    return blk("Marathon-Pace Run", "run", prescription, lines(WU, *main, CD),
               "This is the pace you'll race at - it should feel controlled and boringly steady.",
               "marathon pace run workout explained", LOG_RUN)

def progression(prescription, *main):
    return blk("Progression Run", "run", prescription, lines(*main), "Start slow, finish strong but controlled.",
               "progression run explained", LOG_RUN)

def time_trial():
    return blk("10k Time Trial", "run", "10 km",
               lines("Warm-up: the run warm-up drills, then 15 min easy jogging + 4 strides",
                     "Main set: 10 km as fast as you can hold evenly",
                     "Where: a flat route, or the treadmill at 1% incline",
                     "Cool-down: 10 min walk or very easy jog",
                     "After: log it below and tap 'Save to my results' - every pace in the plan updates"),
               "Start a little slower than you think; finish strong.", "how to run a 10k time trial", LOG_RUN)

# ---------------- gym blocks ----------------
WARMUP = blk("Warm-Up", "bike", "8-10 min", lines("5 min easy bike", "Then the gym warm-up moves ('Show the moves')"), "")
COOLDOWN = blk("Cool-Down", "core", "5-8 min", lines("Calves, hip flexors, hamstrings", "Hold each stretch 30-45 s ('Show the moves')"), "")
ANKLE_CIRCUIT = blk("Ankle Strength Circuit", "bandankle", "10 min",
                    lines("Balance, band work, shin raises, heel & toe walks, single-leg reach", "Right ankle first, then left", "Tap 'Show the moves' for each one"),
                    "If your physio has given you exercises, do theirs instead.")

def gym_a(phase):
    """Lower body + ankle. phase 1..4"""
    b = [WARMUP]
    if phase == 1:
        b += [blk("Goblet Squat", "squat", "3 x 10", lines("Effort: RPE 6-7", "Smooth, full depth you control"), "", "goblet squat form", LOG_WEIGHT),
              blk("Romanian Deadlift", "hinge", "3 x 10", lines("Dumbbells", "Hinge from the hips, flat back"), "", "dumbbell romanian deadlift form", LOG_WEIGHT),
              blk("Step-Up", "stepup", "3 x 8 /leg", lines("Knee-height box", "Drive through the whole foot, lower slowly"), "", "dumbbell step up form", LOG_WEIGHT),
              blk("Hip Thrust", "bridge", "3 x 12", lines("Shoulders on a bench", "2 s squeeze at the top"), "", "hip thrust form", LOG_WEIGHT),
              blk("Calf Raise - double leg", "calf", "3 x 15", lines("2 s up, 1 s hold, 3 s down", "Full range"), "Move to single-leg once 3 x 15 is easy and pain-free.", "calf raise slow eccentric", LOG_WEIGHT)]
    elif phase == 2:
        b += [blk("Back Squat", "squat", "4 x 8", lines("Effort: RPE 7", "Or goblet squat if you prefer"), "", "back squat form beginner", LOG_WEIGHT),
              blk("Romanian Deadlift", "hinge", "3 x 8", "Effort: RPE 7", "", "romanian deadlift form", LOG_WEIGHT),
              blk("Bulgarian Split Squat", "lunge", "3 x 8 /leg", lines("Back foot on a bench", "Front knee tracks over the toes"), "", "bulgarian split squat form", LOG_WEIGHT),
              blk("Single-Leg Calf Raise", "calf", "3 x 12 /leg", lines("Straight knee, slow on the way down", "Hold a dumbbell when it's easy"), "", "single leg calf raise", LOG_WEIGHT),
              blk("Bent-Knee Calf Raise", "calf", "3 x 15", lines("Seated calf machine, or knees bent", "Works the soleus - the calf muscle that takes most of the running load"), "", "seated calf raise soleus runners", LOG_WEIGHT)]
    else:
        heavy = phase == 3
        b += [blk("Back Squat", "squat", "4 x 6" if heavy else "3 x 5", lines("Effort: RPE 7-8", "Heavier, fewer reps") if heavy else lines("Effort: RPE 7", "Keep strength, don't chase it"), "", "back squat form", LOG_WEIGHT),
              blk("Romanian Deadlift", "hinge", "3 x 6" if heavy else "3 x 5", "Effort: RPE 7-8", "", "romanian deadlift form", LOG_WEIGHT),
              blk("Bulgarian Split Squat", "lunge", "3 x 6 /leg", "Heavier dumbbells", "", "bulgarian split squat form", LOG_WEIGHT),
              blk("Single-Leg Calf Raise", "calf", "3 x 10 /leg", lines("Holding a dumbbell", "Slow on the way down"), "", "single leg calf raise weighted", LOG_WEIGHT),
              blk("Pogo Hops", "pogo", "3 x 20",
                  lines("Small, stiff-ankle bounces", "Only if you can do 10 single-leg hops on the right foot with no pain - otherwise skip"),
                  "Springy tendons = cheaper running.", "pogo hops runners plyometrics")]
    b += [ANKLE_CIRCUIT, COOLDOWN]
    return b

def gym_b(phase):
    """Upper body + core."""
    return [WARMUP,
            blk("Dumbbell Bench Press", "press", "3 x 10" if phase < 3 else "3 x 8", lines("Effort: RPE 7", "Or push-ups"), "", "dumbbell bench press form", LOG_WEIGHT),
            blk("Lat Pulldown", "pullup", "3 x 10", "Or assisted pull-ups", "", "lat pulldown form", LOG_WEIGHT),
            blk("Seated Cable Row", "cablerow", "3 x 12", "Squeeze the shoulder blades together", "", "seated cable row form", LOG_WEIGHT),
            blk("Dumbbell Shoulder Press", "press", "3 x 10", "Seated", "", "seated dumbbell shoulder press form", LOG_WEIGHT),
            blk("Dead Bug", "deadbug", "3 x 8 /side", "Lower back pressed into the floor", "", "dead bug exercise"),
            blk("Side Plank", "sideplank", "3 x 30 s /side", "Straight line from head to heels", "", "side plank form"),
            blk("Bird Dog", "birddog", "2 x 8 /side", "Slow, no hip rotation", "", "bird dog exercise"),
            COOLDOWN]

def gym_c():
    """Phase 1 Saturday: light full body and the bike (easy on the ankle)."""
    return [blk("Easy Bike", "bike", "20 min", lines("Easy spin, HR {HRE}", "Builds aerobic fitness with no impact on the ankle"), "", None, LOG_BIKE),
            blk("Single-Leg Glute Bridge", "bridge", "3 x 10 /side", lines("One foot on the floor, the other knee pulled in", "Drive through the heel, keep the hips level"), "Strong glutes keep the knee and ankle in line when you run.", "single leg glute bridge"),
            blk("Walking Lunges", "lunge", "2 x 10 /leg", "Dumbbells optional", "", "walking lunges form", LOG_WEIGHT),
            blk("Banded Lateral Walk", "walk", "3 x 10 steps each way", lines("Band just above the knees", "Stay low, toes forward"), "", "banded lateral walk glute"),
            blk("Push-Ups", "pushup", "3 x 8-12", "From the knees if needed", "", "push up form"),
            blk("Side Plank", "sideplank", "2 x 30 s /side", "Straight line from head to heels", "", "side plank form"),
            ANKLE_CIRCUIT, COOLDOWN]

def rest(*detail):
    return [blk("Rest / Active Recovery", "rest", "Rest day", lines(*detail) if detail else lines("Full rest, or a 20-30 min walk", "Plus the off-day mobility routine if you like"))]

# ---------------- week builders ----------------
def phase1_week(w, long_km, tue, notes=None, christmas=False):
    d = week_dates(w)
    days = []
    mon = gym_a(1)
    if notes: mon = [note("Read this first", notes)] + mon
    days.append(make_day(d[0], "gym", "Gym A: Lower Body + Ankle", "Base & ankle rebuild", mon))
    days.append(make_day(d[1], "run", "Easy Run", "Run 1 of 2", tue))
    days.append(make_day(d[2], "gym", "Gym B: Upper Body + Core", "Base & ankle rebuild", gym_b(1)))
    if christmas:
        days.append(make_day(d[3], "run", "Long Run (Christmas Eve)", "Moved forward a day for Christmas", [long_run(long_km, w, "Lighter week")]))
        days.append(make_day(d[4], "rest", "Christmas Day", "", rest("Enjoy it - no training")))
        days.append(make_day(d[5], "gym", "Gym C: Light Full Body + Bike", "Boxing Day - keep it light", gym_c()))
    else:
        days.append(make_day(d[3], "rest", "Rest", "", rest("Rest", "Or 20-30 min easy bike if you feel like moving")))
        days.append(make_day(d[4], "run", "Long Run", "Run 2 of 2", [long_run(long_km, w)]))
        days.append(make_day(d[5], "gym", "Gym C: Light Full Body + Bike", "Low-impact day", gym_c()))
    days.append(make_day(d[6], "rest", "Rest", "", rest()))
    return days

def standard_week(w, phase, tue_title, tue_blocks, thu_blocks, long_km, long_extra="", subtitle="", sat_note=None, new_year=False):
    d = week_dates(w)
    days = []
    days.append(make_day(d[0], "gym", "Gym A: Lower Body + Ankle", subtitle, gym_a(phase)))
    days.append(make_day(d[1], "run", tue_title, subtitle, tue_blocks))
    days.append(make_day(d[2], "gym", "Gym B: Upper Body + Core", subtitle, gym_b(phase)))
    days.append(make_day(d[3], "run", "Easy Run", "The day before the long run - keep it gentle", thu_blocks))
    if new_year:
        days.append(make_day(d[4], "rest", "New Year's Day", "Long run moves to Saturday", rest("Rest")))
        days.append(make_day(d[5], "run", "Long Run", "Moved to Saturday for New Year", [long_run(long_km, w, long_extra)]))
    else:
        days.append(make_day(d[4], "run", "Long Run", subtitle, [long_run(long_km, w, long_extra)]))
        days.append(make_day(d[5], "rest", "Rest", "", rest(sat_note or "Rest", "Badminton or football are fine if your ankle is fully happy with turning and twisting - otherwise wait until it is")))
    days.append(make_day(d[6], "rest", "Rest", "", rest()))
    return days

def build_weeks():
    W = {}
    intro = lines("1) Easy runs are slower than you're used to - about {E}/km (HR {HRE}). Your old 6:00/km 'easy' is close to your 10k race pace.",
                  "2) " + ANKLE_RULE,
                  "3) Every week, answer the ankle check-in at the top of the plan. If it's sore, that week's training eases off automatically.",
                  "4) Check the plan with whoever is treating your ankle before the long runs build past 12 km.")
    W[1] = phase1_week(1, 8, [easy_run("5 km")], notes=intro)
    W[2] = phase1_week(2, 9, [easy_run("5 km")])
    W[3] = phase1_week(3, 10, [easy_run("6 km", "Then the strides below"), strides(4)])
    W[4] = phase1_week(4, 8, [easy_run("5 km", "Then the strides below"), strides(4)], christmas=True)
    # Build I - third run arrives (Saturday gym becomes a short Thursday run)
    W[5] = standard_week(5, 2, "Easy Run + Strides", [easy_run("6 km", "Then the strides below"), strides(6)],
                         [easy_run("4 km", "Short and gentle - this is the new third run")], 11,
                         subtitle="Build I - three runs a week from now", new_year=True)
    W[6] = standard_week(6, 2, "Fartlek", [fartlek("6 x 1 min", "Main set: 6 x 1 min brisk (around {T}/km)", "Recovery: 2 min easy jogging after each one")],
                         [easy_run("5 km")], 12, subtitle="Build I")
    W[7] = standard_week(7, 2, "Hill Repeats", [hills("6 x 60 s")], [easy_run("5 km", "Then the strides below"), strides(4)], 14, subtitle="Build I")
    W[8] = standard_week(8, 2, "10k Time Trial", [time_trial()], [easy_run("4 km")], 11, subtitle="Build I - lighter week + test",
                         long_extra="Lighter week - enjoy it")
    # Build II
    W[9] = standard_week(9, 3, "Tempo Run", [tempo("2 x 8 min", "Main set: 2 x 8 min at {T}/km (HR {HRT})", "Recovery: 2 min easy jog between them")],
                         [easy_run("6 km")], 16, subtitle="Build II")
    W[10] = standard_week(10, 3, "Intervals", [intervals("5 x 800 m", "Main set: 5 x 800 m at {I}/km (HR {HRI})", "Recovery: 400 m easy jog after each one")],
                          [easy_run("6 km", "Then the strides below"), strides(4)], 17, subtitle="Build II")
    W[11] = standard_week(11, 3, "Tempo Run", [tempo("20 min", "Main set: 20 min continuous at {T}/km (HR {HRT})")],
                          [progression("7 km", "First 5 km: easy, {E}/km", "Last 2 km: marathon pace, {M}/km", "Then walk 5 min and stretch")], 19, subtitle="Build II")
    W[12] = standard_week(12, 3, "Fartlek", [fartlek("8 x 1 min", "Main set: 8 x 1 min brisk (around {T}/km)", "Recovery: 1 min easy jogging after each one")],
                          [easy_run("5 km")], 14, subtitle="Build II - lighter week", long_extra="Lighter week")
    # Marathon-specific
    W[13] = standard_week(13, 3, "Marathon-Pace Run", [mp_run("3 x 10 min", "Main set: 3 x 10 min at {M}/km (HR {HRM})", "Recovery: 2 min easy jog between them")],
                          [easy_run("7 km")], 21, subtitle="Marathon-specific", long_extra="Your first half-marathon distance - all easy")
    W[14] = standard_week(14, 3, "Intervals", [intervals("6 x 800 m", "Main set: 6 x 800 m at {I}/km (HR {HRI})", "Recovery: 400 m easy jog after each one")],
                          [easy_run("7 km", "Then the strides below"), strides(4)], 23, subtitle="Marathon-specific")
    W[15] = standard_week(15, 3, "Tempo Run", [tempo("2 x 12 min", "Main set: 2 x 12 min at {T}/km (HR {HRT})", "Recovery: 3 min easy jog between them")],
                          [easy_run("7 km")], 25, subtitle="Marathon-specific", long_extra="Last 4 km at marathon pace ({M}/km) if you feel good")
    W[16] = standard_week(16, 3, "10k Time Trial", [time_trial()], [easy_run("5 km")], 18, subtitle="Marathon-specific - lighter week + re-test",
                          long_extra="Lighter week - save Tuesday's 10k to your results first")
    W[17] = standard_week(17, 4, "Marathon-Pace Run", [mp_run("4 x 2 km", "Main set: 4 x 2 km at {M}/km (HR {HRM})", "Recovery: 2 min easy jog between them")],
                          [easy_run("8 km")], 28, subtitle="Marathon-specific", long_extra="Easter weekend - fine to move it to Thursday or Saturday")
    W[18] = standard_week(18, 4, "Tempo Run", [tempo("25 min", "Main set: 25 min continuous at {T}/km (HR {HRT})")], [easy_run("8 km")], 30,
                          subtitle="Peak week - 3 weeks out",
                          long_extra="Your longest run - a full race rehearsal:\nRace breakfast 3 h before, race kit and shoes\nRace gels on the race schedule")
    # Taper
    W[19] = standard_week(19, 4, "Marathon-Pace Run", [mp_run("5 x 1 km", "Main set: 5 x 1 km at {M}/km", "Recovery: 90 s easy jog between them")],
                          [easy_run("7 km")], 22, subtitle="Taper - 2 weeks out", long_extra="Taper starts: shorter, same easy effort")
    W[20] = standard_week(20, 4, "Marathon-Pace Run", [mp_run("3 x 2 km", "Main set: 3 x 2 km at {M}/km", "Recovery: 2 min easy jog between them", "Your last proper session")],
                          [easy_run("6 km", "Then the strides below"), strides(4)], 14, subtitle="Taper - race in 8 days",
                          long_extra="Easy and short - the fitness is banked")
    # Light gym in week 20
    for day in W[20]:
        if day["title"].startswith("Gym A"):
            day["title"] = "Gym A: Light Lower Body + Ankle"
            day["blocks"] = [WARMUP,
                             blk("Goblet Squat", "squat", "2 x 8", lines("Light", "Keep the pattern - no soreness"), "", None, LOG_WEIGHT),
                             blk("Single-Leg Calf Raise", "calf", "2 x 10 /leg", "Bodyweight only", "", None),
                             ANKLE_CIRCUIT, COOLDOWN]
        if day["title"].startswith("Gym B"):
            day["title"] = "Gym B: Light Upper Body + Core"
            day["blocks"] = [WARMUP,
                             blk("Push-Ups", "pushup", "2 x 10", "", "", None),
                             blk("Seated Cable Row", "cablerow", "2 x 12", "Light", "", None, LOG_WEIGHT),
                             blk("Dead Bug", "deadbug", "2 x 8 /side", "", ""),
                             COOLDOWN]
    # Race week
    d = week_dates(21)
    W[21] = [
        make_day(d[0], "gym", "Mobility + Activation", "Race week - no weights", [
            blk("Easy Bike", "bike", "15 min", "Very easy", ""),
            ANKLE_CIRCUIT,
            blk("Off-day mobility routine", "foamroll", "15 min", lines("Gentle", "Tap 'Show the moves'"), "")]),
        make_day(d[1], "run", "Easy Run + Marathon-Pace Touches", "Race week", [
            blk("Easy Run", "run", "5 km", lines("2 km easy at {E}/km", "4 x 1 min at marathon pace ({M}/km), 1 min easy between", "Easy to finish"),
                "Just reminding your legs of race pace.", "marathon race week workout", LOG_RUN)]),
        make_day(d[2], "rest", "Rest", "Carbs start creeping up - see the Fuel tab", rest("Rest", "Sort your race-day kit and how you'll get to the start")),
        make_day(d[3], "run", "Easy Run + Strides", "Fuel-up day 1", [easy_run("4 km", "Then the strides below"), strides(4)]),
        make_day(d[4], "run", "Shakeout", "Fuel-up day 2 - biggest carb meal at lunch", [
            blk("Shakeout Jog", "run", "15 min", lines("Very easy", "Finish with 3 short strides", "Or rest if you'd rather"),
                "Lay your kit out tonight: bib pinned, gels counted, shoes laced, breakfast ready.", None, LOG_RUN)]),
        make_day(d[5], "race", "RACE DAY - London Marathon", "Saturday 24 April 2027", [
            blk("London Marathon", "run", "42.2 km",
                lines("Goal pace: {M}/km - finish around {GOAL}",
                      "First 5 km: no faster than goal pace. The crowds will pull you - let them pull everyone else",
                      "Gels: every 30 min from 30 min (times on the Fuel tab)",
                      "Drinks: water to thirst at the stations - don't force it",
                      "Walk through drink stations if that helps"),
                "You've done the work. Run your own race.")]),
        make_day(d[6], "rest", "Recovery", "The day after", rest("Walk, eat, celebrate", "Stairs will be funny for a couple of days")),
    ]
    d = week_dates(22)
    W[22] = [
        make_day(d[0], "rest", "Recovery", "", rest("Walk 20-30 min", "Protein at every meal")),
        make_day(d[1], "rest", "Recovery", "", rest("Easy walk", "Plus the off-day mobility routine")),
        make_day(d[2], "gym", "Easy Bike", "", [blk("Easy Bike", "bike", "20 min", "Very easy", "", None, LOG_BIKE)]),
        make_day(d[3], "run", "First Run Back", "Only if nothing hurts", [easy_run("20 min", "Stop if anything hurts")]),
        make_day(d[4], "rest", "Rest", "", rest()),
        make_day(d[5], "run", "Easy Run", "", [easy_run("30 min")]),
        make_day(d[6], "rest", "Debrief", "What's next?", rest("Write down what worked - fuelling, pacing, kit - while you remember it")),
    ]
    return W

# ---------------- ankle check-in alternatives ----------------
# Each block can carry "alt": {"sore": {...}, "worse": {...}} - partial overrides
# the app applies for the rest of a week once the weekly ankle check-in says
# "Sore" or "Worse". Block count and order never change, so ticks stay valid.
QUALITY = {"Tempo Run", "Intervals", "Fartlek", "Hill Repeats", "Marathon-Pace Run", "Progression Run", "10k Time Trial"}
BIKE_SUB = lambda mins, why: {"name": "Easy Bike", "pattern": "bike", "prescription": f"{mins} min",
                              "detail": lines("Ankle recovery week: bike instead of running", "Easy spin, HR {HRE}", why),
                              "cue": "A week of bike instead of runs costs almost nothing. Running on a sore ankle can cost weeks.", "videoQuery": None}

def km_of(p):
    try:
        return float(p.split()[0]) if p.endswith(" km") else None
    except ValueError:
        return None

def alt_for(b, week):
    n, p = b["name"], b["prescription"]
    if n == "Long Run":
        km = km_of(p)
        sk = max(5, round(km * 0.75))
        bike_min = min(75, max(40, round(long_minutes(km) * 0.6 / 5) * 5))
        return {"sore": {"prescription": f"{sk} km",
                         "detail": lines(f"Ankle week: shortened from {km:g} km", f"About {hm(long_minutes(sk))}", "Pace: {E}/km or slower, HR {HRE}",
                                         "Flat route, smooth surfaces (park paths or treadmill)", "Walk 1 min every 2 km"),
                         "cue": fuel_practice(sk, week)},
                "worse": BIKE_SUB(bike_min, "Only if the ankle is 2/10 or less: a 5 km very easy flat run instead")}
    if n == "Easy Run":
        km = km_of(p)
        if km:
            sp = f"{max(3, round(km * 0.75))} km"
        else:
            sp = f"{max(15, round(int(p.split()[0]) * 0.75 / 5) * 5)} min"
        return {"sore": {"prescription": sp, "detail": lines("Ankle week: shortened", "Pace: {E}/km, HR {HRE}", "Flat route, smooth surfaces")},
                "worse": BIKE_SUB(30, "Or rest completely if it's painful at rest")}
    if n == "Strides":
        skip = {"prescription": "Skip this week", "detail": lines("No strides while the ankle is sore", "Tick it off and finish the run"), "cue": "", "videoQuery": None}
        return {"sore": skip, "worse": skip}
    if n in QUALITY:
        steady = {"name": "Steady Run (flat)", "prescription": "5 km",
                  "detail": lines(f"Ankle week: today's {n.lower()} becomes a gentle steady run",
                                  "Flat route only - no hills, no sharp corners at speed",
                                  "2 km easy at {E}/km",
                                  "4 x 1 min at marathon pace ({M}/km), 1 min easy between",
                                  "Easy to finish",
                                  "Move the 10k test to next week if the ankle settles" if n == "10k Time Trial" else ""),
                  "cue": "Fitness from one missed session is nothing. Keep the ankle on side.", "videoQuery": None}
        bike = {"name": "Bike Intervals", "pattern": "bike", "prescription": "35 min",
                "detail": lines(f"Ankle recovery week: today's {n.lower()} moves to the bike",
                                "Warm-up: 10 min easy spin", "Main set: 6 x 2 min hard (8/10), 1 min easy after each", "Cool-down: 7 min easy spin"),
                "cue": "Keeps the hard-session fitness with zero impact on the ankle.", "videoQuery": "stationary bike interval workout"}
        return {"sore": steady, "worse": bike}
    if n == "Pogo Hops":
        calf = {"name": "Seated Calf Raise", "pattern": "calf", "prescription": "3 x 15",
                "detail": lines("No hopping this week", "Slow seated calf raises instead: 2 s up, 3 s down"), "cue": "", "videoQuery": "seated calf raise"}
        return {"sore": calf, "worse": calf}
    if n in ("Bulgarian Split Squat", "Step-Up"):
        return {"worse": {"name": "Leg Press", "pattern": "squat", "prescription": "3 x 10",
                          "detail": lines(f"Ankle recovery week: instead of the {n.lower()}", "Feet flat on the platform - strong legs with little balance load on the ankle"),
                          "videoQuery": "leg press form"}}
    if n == "Walking Lunges":
        return {"worse": {"name": "Glute Bridge", "pattern": "bridge", "prescription": "3 x 12",
                          "detail": lines("Ankle recovery week: instead of lunges", "2 s squeeze at the top"), "videoQuery": "glute bridge form"}}
    if n == "Single-Leg Calf Raise":
        return {"worse": {"prescription": "3 x 12", "detail": lines("Ankle recovery week: both legs, bodyweight", "2 s up, 3 s down")}}
    if n == "Ankle Strength Circuit":
        return {"sore": {"detail": lines("Slowly, and skip any move that hurts", "Right ankle first, then left")},
                "worse": {"prescription": "2 rounds", "detail": lines("Ankle recovery week: go through it twice, slowly", "Skip anything that hurts", "Ice or elevate afterwards if it helps")}}
    return None

def add_alts(weeks):
    for w in weeks:
        if w["weekNum"] > 20:
            continue
        for day in w["days"]:
            for i, b in enumerate(day["blocks"]):
                a = alt_for(b, w["weekNum"])
                if a:
                    b["alt"] = a
            if day["sessionType"] == "run":
                first = day["blocks"][0].get("alt", {})
                day["alt"] = {lvl: {"title": first[lvl].get("name", day["blocks"][0]["name"]) if lvl in first else day["title"]} for lvl in ("sore", "worse")}
                for lvl in ("sore", "worse"):
                    if lvl in first and first[lvl].get("name") == "Easy Bike" and day["blocks"][0]["name"] == "Long Run":
                        day["alt"][lvl]["title"] = "Easy Bike (instead of the long run)"
                    if lvl in first and first[lvl].get("pattern") == "bike":
                        day["alt"][lvl]["sessionType"] = "gym"

PHASES = [
    {"id": "p1", "name": "Base & Ankle Rebuild", "weeks": [1, 2, 3, 4]},
    {"id": "p2", "name": "Build I - Three Runs a Week", "weeks": [5, 6, 7, 8]},
    {"id": "p3", "name": "Build II - Tempo & Intervals", "weeks": [9, 10, 11, 12]},
    {"id": "p4", "name": "Marathon-Specific", "weeks": [13, 14, 15, 16, 17, 18]},
    {"id": "p5", "name": "Taper", "weeks": [19, 20]},
    {"id": "race", "name": "Race Week - London Marathon", "weeks": [21]},
    {"id": "p6", "name": "Recovery", "weeks": [22]},
]

def main():
    W = build_weeks()
    weeks = []
    for n in range(1, 23):
        days = W[n]
        assert len(days) == 7, n
        ds = week_dates(n)
        for i, day in enumerate(days):
            assert day["date"] == ds[i].isoformat(), (n, day["date"])
        phase = next(p["name"] for p in PHASES if n in p["weeks"])
        weeks.append({"weekNum": n, "phase": phase,
                      "dateRange": f"{ds[0].strftime('%b %-d')} - {ds[6].strftime('%b %-d')}", "days": days})
    add_alts(weeks)
    program = {
        "startDate": PROGRAM_START.isoformat(),
        "race1": RACE.isoformat(),
        "race2": RACE.isoformat(),
        "races": [{"id": "race1", "label": "Marathon", "city": "London", "date": RACE.isoformat(), "startWindow": ["09:00", "11:30"]}],
        "phases": PHASES,
        "weeks": weeks,
    }
    with open("js/program-data.js", "w") as fh:
        fh.write("// Generated by generate_marathon.py - edit that and re-run, or edit days here directly.\n")
        fh.write("const PROGRAM = " + json.dumps(program, indent=1) + ";\n")
    runs = sum(1 for w in weeks for d in w["days"] if d["sessionType"] == "run")
    print(f"{len(weeks)} weeks, {sum(len(w['days']) for w in weeks)} days, {runs} run days")
    for w in weeks:
        km = 0
        for d in w["days"]:
            for b in d["blocks"]:
                p = b["prescription"]
                if b["pattern"] == "run" and p.endswith(" km") and p.split()[0].replace('.', '').isdigit():
                    km += float(p.split()[0])
        print(f"wk{w['weekNum']:>2} {w['dateRange']:<16} ~{km:>4.0f} km  {w['phase']}")

if __name__ == "__main__":
    main()
