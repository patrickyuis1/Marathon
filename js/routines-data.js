// Warm-up, cool-down, ankle and off-day routines.
// "pattern" names a pictogram in PICTOGRAMS (pictograms*.js).
const ROUTINES = {
  runWarmup: {
    name: "Run Warm-Up",
    tab: "Run warm-up",
    duration: "6 min",
    when: "Before every run. On tempo, interval and hill days add 10 min of easy jogging after it.",
    steps: [
      { name: "Brisk walk into easy jog", pattern: "walk", dose: "3 min", cue: "Start walking, finish jogging. No watch-checking." },
      { name: "Ankle rocks", pattern: "anklerock", dose: "10 /side", cue: "Knee forward over the toes, heel stays down. Gets the right ankle moving before it takes load." },
      { name: "Leg swings", pattern: "legswing", dose: "10 front-back + 10 side-to-side /leg", cue: "Hold a wall or lamppost, let the leg swing loose." },
      { name: "Walking lunge with reach", pattern: "lunge", dose: "6 /leg", cue: "Long step, tall chest, reach both arms up." },
      { name: "A-skips", pattern: "askip", dose: "2 x 15 m", cue: "Knee to hip height, quick light contacts. Skip these if the ankle is grumbling." },
    ],
  },
  gymWarmup: {
    name: "Gym Warm-Up",
    tab: "Gym warm-up",
    duration: "10 min",
    when: "Before every gym session.",
    steps: [
      { name: "Easy bike", pattern: "bike", dose: "5 min", cue: "Easy enough to chat. Raise the seat so the knee is only slightly bent at the bottom." },
      { name: "Leg swings", pattern: "legswing", dose: "10 + 10 /leg", cue: "" },
      { name: "World's greatest stretch", pattern: "wgs", dose: "4 /side", cue: "Back knee off the floor, elbow to the instep, then rotate the top arm to the ceiling." },
      { name: "Glute bridge", pattern: "bridge", dose: "12 reps, 2 s squeeze", cue: "Push through the heels, ribs down." },
      { name: "Bodyweight squats", pattern: "squat", dose: "10 reps", cue: "Chest up, knees out, heels down." },
      { name: "Band pull-aparts", pattern: "pullapart", dose: "15 reps", cue: "Upper-body days." },
    ],
  },
  ankle: {
    name: "Ankle Strength Circuit",
    tab: "Ankle",
    duration: "10 min",
    when: "Built into every gym session. Do the right ankle first. If a physio has given you exercises, use theirs - they know your ankle.",
    steps: [
      { name: "Single-leg balance", pattern: "balance", dose: "3 x 30 s /side", cue: "Shoes off. Progress: eyes closed, then standing on a cushion, then catching a ball." },
      { name: "Band ankle - 4 ways", pattern: "bandankle", dose: "12 each way /side", cue: "Sitting, band round the forefoot: point, pull up, turn in, turn out. Slow and controlled." },
      { name: "Tibialis raise", pattern: "tibraise", dose: "2 x 15", cue: "Back against a wall, heels 30 cm out, lift the toes. Strengthens the shin - helps prevent shin splints." },
      { name: "Heel and toe walks", pattern: "walk", dose: "2 x 15 m each", cue: "Up on the toes, then back on the heels with toes lifted. Simple, and great for ankle control." },
      { name: "Single-leg reach", pattern: "hinge", dose: "2 x 8 /side", cue: "Balance on one leg, hinge and reach forward. The ankle does lots of small work to keep you steady." },
    ],
  },
  raceWarmup: {
    name: "Race-Day Warm-Up",
    tab: "Race day",
    duration: "10 min",
    when: "In the start pen, 15-20 min before you cross the line. A marathon needs very little warm-up - the first 5 km are your warm-up.",
    steps: [
      { name: "Walk around", pattern: "walk", dose: "5 min", cue: "Keep moving in the start area. Old jumper or bin bag on to stay warm - throw it away at the start (it's donated)." },
      { name: "Ankle rocks", pattern: "anklerock", dose: "8 /side", cue: "" },
      { name: "Leg swings", pattern: "legswing", dose: "10 + 10 /leg", cue: "" },
      { name: "Glute bridge (standing squeeze)", pattern: "bridge", dose: "10 squeezes", cue: "Wakes up the glutes without getting on the floor." },
      { name: "A few relaxed strides", pattern: "run", dose: "2-3 x 10 s, if there's room", cue: "Not needed if the pen is packed. Then breathe, smile, start slowly." },
    ],
  },
  cooldown: {
    name: "Cool-Down",
    tab: "Cool-down",
    duration: "10 min",
    when: "After every run and gym session. Hold each stretch, breathe slowly, no bouncing.",
    steps: [
      { name: "Easy walk", pattern: "walk", dose: "3-5 min", cue: "Let your breathing settle before you stretch." },
      { name: "Calf stretch - straight + bent knee", pattern: "calfstretch", dose: "30 s each /side", cue: "Hands on a wall, heel down. Straight knee, then bend it to reach the lower calf." },
      { name: "Hip flexor stretch", pattern: "couch", dose: "45 s /side", cue: "Half-kneeling, squeeze the back glute, stay tall. Long runs and sitting all day both tighten these." },
      { name: "Hamstring stretch", pattern: "hamstring", dose: "45 s /side", cue: "Band or towel round the foot." },
      { name: "Pigeon", pattern: "pigeon", dose: "45 s /side", cue: "Front shin across, back leg long, ease forward." },
      { name: "Child's pose", pattern: "childpose", dose: "60 s", cue: "Hips to heels, arms long." },
    ],
  },
  offday: {
    name: "Off-Day Mobility",
    tab: "Off-day",
    duration: "20 min",
    when: "Rest days. Add a 20-30 min walk if you feel like moving - especially after a day at the desk.",
    steps: [
      { name: "Foam roll", pattern: "foamroll", dose: "5 min", cue: "Calves, quads, glutes - 30-45 s each, slow. Go gently around the right ankle; never roll directly on the injured tendon." },
      { name: "Cat-cow", pattern: "catcow", dose: "10 slow reps", cue: "One vertebra at a time." },
      { name: "Thoracic open book", pattern: "openbook", dose: "8 /side", cue: "Undoes a day of sitting." },
      { name: "World's greatest stretch", pattern: "wgs", dose: "5 /side", cue: "" },
      { name: "Hip flexor stretch", pattern: "couch", dose: "60 s /side", cue: "" },
      { name: "Pigeon", pattern: "pigeon", dose: "60 s /side", cue: "" },
      { name: "Calf stretch", pattern: "calfstretch", dose: "60 s /side", cue: "Then 30 s with the knee bent." },
      { name: "Single-leg balance", pattern: "balance", dose: "2 x 30 s /side", cue: "While the kettle boils is fine." },
      { name: "Dead bug", pattern: "deadbug", dose: "2 x 8 /side", cue: "Lower back pressed into the floor." },
    ],
  },
};
const ROUTINE_ORDER = ["runWarmup", "gymWarmup", "ankle", "raceWarmup", "cooldown", "offday"];
