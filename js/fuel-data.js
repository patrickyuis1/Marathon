// Fuel plan for marathon training. Targets are per kg of body weight so they
// scale to whoever's profile is open; meal options show approximate carbs (C)
// and protein (P) sized for a ~55 kg runner - scale portions to hit the day.
// Based on current sports-nutrition guidance for endurance running: 3-7 g/kg
// carbs a day depending on training, ~1.6 g/kg protein, 30-60 g carbs an hour
// on long runs building to 60 g/h on race day, an 8-10 g/kg carb load over the
// last 36-48 h, 2-3 g/kg breakfast 3-4 h before the start, drink to thirst.
const FUEL_PLAN = {

  /* ---------- everyday ---------- */
  daily: {
    rest:     { label: "Rest day", carbs: 4, protein: 1.6, fluid: "2.0-2.5 L", fluidNote: "through the day", meals: "3 meals + 1 snack",
                note: "Still eat properly on rest days - this is when your legs rebuild." },
    training: { label: "Gym or easy run", carbs: 5, protein: 1.7, fluid: "2.5 L", fluidNote: "+ ~500 ml per hour of running", meals: "3 meals + 1-2 snacks",
                note: "A small snack 1-2 h before you train, then a meal with carbs and protein within ~1 h after." },
    hard:     { label: "Long or hard run", carbs: 7, protein: 1.7, fluid: "2.5-3.0 L", fluidNote: "+ ~500 ml per hour of running", meals: "3 meals + 2 snacks",
                note: "The day of (and the evening before) a long run is the day to eat more carbs, not less." },
  },

  everydayIntro: "You said you usually eat a late breakfast and dinner. That works on a rest day, but once runs get longer two meals won't cover the training. Add lunch (or a proper snack) on training days and something small 1-2 h before every run.",

  dailyMeals: {
    Breakfast: [
      { text: "Porridge (50 g oats, 250 ml milk), banana, honey", c: 80, p: 15 },
      { text: "2 slices toast, 2 eggs, 200 ml orange juice", c: 50, p: 18 },
      { text: "Greek yoghurt 200 g, 40 g granola, berries, honey", c: 60, p: 22 },
    ],
    Lunch: [
      { text: "Chicken salad wrap + a piece of fruit", c: 55, p: 30 },
      { text: "Jacket potato with tuna and sweetcorn, side salad", c: 60, p: 28 },
      { text: "Leftovers: 200 g cooked rice or pasta + chicken and veg", c: 65, p: 30 },
    ],
    Dinner: [
      { text: "Spaghetti bolognese (80 g dry pasta, lean mince)", c: 70, p: 30 },
      { text: "Chicken stir-fry with 200 g cooked noodles", c: 60, p: 32 },
      { text: "Salmon, 200 g potatoes, green veg", c: 40, p: 28 },
      { text: "Chilli with 180 g cooked rice", c: 60, p: 28 },
    ],
    "Before a run (1-2 h)": [
      { text: "Banana", c: 25, p: 1 },
      { text: "Slice of toast with jam or honey", c: 30, p: 4 },
      { text: "Cereal bar or 2 rice cakes with jam", c: 25, p: 2 },
    ],
    "After a run / snacks": [
      { text: "500 ml chocolate milk", c: 50, p: 17 },
      { text: "Greek yoghurt 150 g + honey + fruit", c: 30, p: 15 },
      { text: "Malt loaf, 2 slices", c: 40, p: 4 },
      { text: "2 crumpets with peanut butter", c: 45, p: 9 },
    ],
  },

  everydayTips: [
    "Something small before every run - even a banana - makes sessions feel easier and protects your recovery.",
    "Protein at every meal (~20-30 g): eggs, yoghurt, chicken, fish, beans, tofu, milk.",
    "Iron-rich foods a few times a week: red meat, beans and lentils, fortified cereal, leafy greens - with vitamin C (fruit or juice) to help absorb it.",
    "Calcium for bones: milk, yoghurt, cheese, or fortified alternatives most days.",
    "Pale-straw urine = well hydrated. Your morning coffee counts towards fluid.",
    "If you're always hungry, tired, picking up niggles, or your periods become irregular or stop, tell your GP - it can be a sign of not eating enough for the training (called RED-S), which is common when mileage climbs.",
  ],

  /* ---------- long runs ---------- */
  longRunLadder: [
    { upTo: 75, title: "Under ~75 min", target: "Water only", how: "A normal meal 2-3 h before, or a banana / toast and jam 60 min before. Carry water if it's warm." },
    { upTo: 120, title: "75 min - 2 h", target: "30-40 g carbs an hour", how: "A gel at ~40 min, then every 40 min, with a few sips of water. This is gut training - start small even if you don't feel you need it." },
    { upTo: 9999, title: "Over 2 h", target: "45-60 g carbs an hour", how: "A gel every 30-35 min from 30 min, plus sips of water or sports drink. Electrolytes if it's warm or you sweat a lot." },
  ],
  longRunBefore: [
    "Breakfast 2-3 h before: porridge with banana and honey, or toast/bagel with jam. Same thing you'll eat on race morning, once you've found what works.",
    "Coffee as normal - you already have one in the morning.",
    "Go to the toilet before you leave, and plan a route past toilets for the longer ones.",
  ],
  longRunAfter: [
    "Within an hour: ~1 g/kg carbs + 20-25 g protein - 500 ml chocolate milk is perfect.",
    "Then a proper meal within 2-3 h.",
    "Weigh yourself before and after (no clothes) once or twice: each 1 kg lost ≈ 1 litre of sweat. Losing more than ~1 kg means drink a little more next time; GAINING weight means you drank too much.",
  ],
  gels: [
    { name: "How much", how: "Most gels have 20-25 g carbs. Check the packet - that's your 'grams per gel'." },
    { name: "Isotonic vs concentrated", how: "Isotonic gels (more watery) don't need water. Concentrated gels do - take a few sips with each, or they sit heavy." },
    { name: "On the course", how: "London has handed out Lucozade Sport drink and gels on course in recent years. Check the 2027 event guide - if you plan to use what's on the course, practise with that brand on long runs. Otherwise carry your own." },
    { name: "Caffeine gels", how: "Optional, later in the race (after ~2 h). Only if you've tried them on a long run - they can upset the stomach." },
    { name: "If your stomach complains", how: "Smaller amounts more often (half a gel every 15-20 min), always with water, and keep pre-run food low in fat and fibre. The gut adapts with practice." },
  ],

  /* ---------- race week ---------- */
  days: [
    // "dynamic": carbs, fluid and meals follow that day's session (rest vs training)
    { offset: -7, dynamic: true, title: "Race week begins",
      focus: "Normal eating - no cutting back. Sort out your race-day food now: breakfast, gels (count them), and how you'll get them to the start." },
    { offset: -6, dynamic: true, title: "Normal day",
      focus: "Normal meals with protein at each one. Plenty of fruit and veg while fibre is still on the menu." },
    { offset: -5, dynamic: true, title: "Normal day",
      focus: "Training is lighter this week, so you don't need extra food yet - just don't skip meals." },
    { offset: -4, dynamic: true, title: "Normal day",
      focus: "Eat around the run: carbs before, carbs and protein after." },
    { offset: -3, dynamic: true, title: "Alcohol stops",
      focus: "No alcohol from today - it disrupts sleep and hydration. Check what time your wave starts (it's on your race documents) and set it on this page." },
    { offset: -2, title: "Carb-load day 1", carbs: 8, protein: 1.4, fluid: "2.5-3.0 L", fluidNote: "spread through the day", electrolytes: "1 serving", electrolytesNote: "with lunch", fibre: "Start cutting back from dinner", mealSet: "load",
      focus: "Carbs go right up for the next 2 days - your muscles store it as fuel for miles 18-26. Swap to white rice, pasta, bread and potatoes; lower the fat so there's room for carbs. Sports drink, juice and jelly sweets make the numbers much easier than more food. If it feels like too much, 7 g/kg still helps a lot." },
    { offset: -1, title: "Carb-load day 2", carbs: 9, protein: 1.4, fluid: "2.5-3.0 L", fluidNote: "ease off 2 h before bed", electrolytes: "1-2 servings", electrolytesNote: "lunch + dinner", fibre: "Low - no beans, lentils, big salads", mealSet: "fuelup",
      focus: "Biggest carb meal at LUNCH, then a normal-sized, familiar, low-fibre dinner by ~7pm. Expect the scale to be up 1-2 kg tomorrow - that's stored fuel and water, exactly the point. Lay out your kit, pin your bib, pack your gels." },
    { offset: 0, title: "Race day", race: true, carbs: 0, protein: 0, fluid: "~400 ml before the start", fluidNote: "see the timeline", electrolytes: "Optional", electrolytesNote: "in the pre-race drink", fibre: "Low", mealSet: "race",
      focus: "Nothing new today. Every food, drink and gel should be something you've used on a long run." },
    { offset: 1, title: "Recovery", carbs: 5, protein: 1.8, fluid: "2.5-3.0 L", fluidNote: "through the day", electrolytes: "1 serving", electrolytesNote: "in the morning", fibre: "Normal", mealSet: "recovery",
      focus: "Refill and repair: protein at every meal, carbs back to normal, an easy walk. Celebrate." },
  ],

  meals: {
    training: {
      Breakfast: [
        { text: "Porridge (50 g oats, 250 ml milk), banana, honey", c: 80, p: 15 },
        { text: "2 slices toast, 2 eggs, 200 ml orange juice", c: 50, p: 18 },
      ],
      Lunch: [
        { text: "Chicken and rice bowl: 200 g cooked rice, chicken, veg", c: 60, p: 32 },
        { text: "Chicken salad wrap + a piece of fruit", c: 55, p: 30 },
      ],
      Dinner: [
        { text: "Spaghetti bolognese (80 g dry pasta)", c: 70, p: 30 },
        { text: "Salmon, 200 g potatoes, green veg", c: 40, p: 28 },
      ],
      Snacks: [
        { text: "Banana before the run", c: 25, p: 1 },
        { text: "500 ml chocolate milk after", c: 50, p: 17 },
      ],
    },
    rest: {
      Breakfast: [
        { text: "Greek yoghurt 200 g, 40 g granola, berries", c: 55, p: 22 },
        { text: "2 eggs on toast", c: 30, p: 18 },
      ],
      Lunch: [
        { text: "Jacket potato with tuna, side salad", c: 60, p: 28 },
        { text: "Soup and a roll + yoghurt", c: 55, p: 20 },
      ],
      Dinner: [
        { text: "Chicken stir-fry with 150 g cooked noodles", c: 45, p: 30 },
        { text: "Roast chicken, potatoes, two veg", c: 45, p: 35 },
      ],
      Snacks: [
        { text: "Apple + a small piece of cheese", c: 15, p: 8 },
        { text: "Greek yoghurt + honey", c: 25, p: 15 },
      ],
    },
    load: {
      Breakfast: [
        { text: "Porridge (60 g oats, milk), banana, 2 tbsp honey + 250 ml orange juice", c: 125, p: 16 },
        { text: "Bagel with jam, banana, 250 ml orange juice", c: 100, p: 11 },
      ],
      Lunch: [
        { text: "250 g cooked white rice, chicken, sweet chilli sauce + 500 ml sports drink", c: 115, p: 30 },
        { text: "White wrap with chicken, 40 g pretzels, banana", c: 95, p: 30 },
      ],
      Dinner: [
        { text: "250 g cooked white pasta, tomato sauce, a little chicken", c: 85, p: 30 },
        { text: "250 g cooked white rice, white fish, soy sauce", c: 80, p: 28 },
      ],
      Snacks: [
        { text: "Malt loaf, 2 slices", c: 40, p: 4 },
        { text: "2 crumpets with jam", c: 50, p: 4 },
        { text: "Rice pudding pot", c: 30, p: 5 },
        { text: "Jelly sweets, 50 g", c: 40, p: 3 },
      ],
    },
    fuelup: {
      Breakfast: [
        { text: "Porridge (60 g oats, milk), banana, 2 tbsp honey + 250 ml orange juice", c: 125, p: 16 },
        { text: "2 slices white toast with jam, banana, 250 ml orange juice", c: 100, p: 8 },
      ],
      Lunch: [
        { text: "BIGGEST MEAL: 300 g cooked white rice or pasta, chicken, tomato or sweet chilli sauce + 500 ml sports drink", c: 140, p: 32 },
        { text: "BIGGEST MEAL: 2 white bagels with jam + rice pudding + 500 ml sports drink", c: 145, p: 18 },
      ],
      Dinner: [
        { text: "250 g cooked white pasta, simple tomato sauce - by ~7pm", c: 85, p: 15 },
        { text: "250 g cooked white rice, chicken, soy sauce - by ~7pm", c: 80, p: 28 },
      ],
      Snacks: [
        { text: "Jelly sweets, 50 g", c: 40, p: 3 },
        { text: "Malt loaf, 2 slices", c: 40, p: 4 },
        { text: "500 ml sports drink or squash", c: 30, p: 0 },
        { text: "Rice pudding pot + tinned peaches", c: 45, p: 5 },
      ],
    },
    recovery: {
      Breakfast: [
        { text: "Eggs on toast + orange juice", c: 50, p: 20 },
        { text: "Porridge with banana, honey and a scoop of yoghurt", c: 80, p: 20 },
      ],
      Lunch: [
        { text: "Chicken and rice bowl with plenty of veg", c: 60, p: 32 },
      ],
      Dinner: [
        { text: "Whatever you've been craving - just get 25-30 g protein in it", c: 70, p: 30 },
      ],
      Snacks: [
        { text: "500 ml chocolate milk", c: 50, p: 17 },
        { text: "Greek yoghurt, honey, berries", c: 30, p: 15 },
      ],
    },
  },

  // Training-day vs rest-day values for the "dynamic" days above.
  dynamic: {
    training: { carbs: 5, protein: 1.7, fluid: "2.5 L", fluidNote: "+ ~500 ml per hour of running", electrolytes: "None", electrolytesNote: "not needed for short runs", fibre: "Normal", mealSet: "training" },
    rest: { carbs: 4, protein: 1.6, fluid: "2.0-2.5 L", fluidNote: "through the day", electrolytes: "None", electrolytesNote: "not needed on a rest day", fibre: "Normal - plenty of veg", mealSet: "rest" },
  },

  // Early = start before 10:00, mid = 10:00 or later.
  earlyStartNote: "Early start tomorrow: make dinner a little bigger, finish it by ~7pm, and have a small carb snack before bed (rice pudding, or toast and jam). Set an alarm for breakfast 3-3.5 h before your start.",

  // Race-day timeline, minutes relative to the start (negative = before).
  // "variants" limits an item to early / mid starts; no variants = always.
  // {GELS} and {FINISH} are filled in from your goal time on the Paces tab.
  // "afterFinish" places an item relative to your expected finish instead.
  raceTimeline: [
    { at: -225, variants: ["early"], title: "Get up", detail: "A glass of water straight away to wake your gut up." },
    { at: -210, variants: ["early"], title: "Breakfast + your usual coffee", detail: "~2 g/kg carbs, low fat and fibre - the meal you've practised before long runs. With it: 300-500 ml of water or squash.",
      options: [
        { text: "Porridge (50 g oats, milk), banana, honey + 1 slice toast and jam", c: 115, p: 17 },
        { text: "Bagel with jam, banana, 250 ml orange juice", c: 100, p: 11 },
        { text: "3 slices white toast with jam or honey + 250 ml orange juice", c: 115, p: 10 },
      ] },
    { at: -270, variants: ["mid"], title: "Get up", detail: "A glass of water straight away." },
    { at: -240, variants: ["mid"], title: "Breakfast + your usual coffee", detail: "2-3 g/kg carbs, low fat and fibre - the meal you've practised before long runs. With it: 300-500 ml of water or squash.",
      options: [
        { text: "Porridge (60 g oats, milk), banana, honey + 2 slices toast and jam", c: 145, p: 20 },
        { text: "2 bagels with jam + banana", c: 140, p: 13 },
      ] },
    { at: -180, title: "Head to the start", detail: "Trains get busy - leave plenty of time. Take a bottle of water or squash to sip, an extra layer to throw away, and your gels. Toilet before you leave." },
    { at: -90, variants: ["mid"], title: "Top-up snack", detail: "25-40 g carbs to top up after the long gap: a banana, cereal bar, or a few jelly sweets." },
    { at: -120, title: "Check your urine", detail: "Pale? Just sip from here. Still dark? Another 200-250 ml. Don't force down litres - that's how runners end up with low blood sodium." },
    { at: -75, title: "Bag drop + toilet queue", detail: "Queues are long. Join early - and join again if you have time." },
    { at: -45, title: "Last proper drink", detail: "150-250 ml, then sips only." },
    { at: -20, title: "Race-day warm-up", detail: "Gentle - 10 min in the start pen. On the Mobility tab." },
    { at: -10, title: "Gel (optional)", detail: "One gel with a few sips of water, if you've practised it before long runs." },
    { at: 0, title: "Start", detail: "Start slower than you want to - the crowd will pull you. First 5 km at or a touch slower than goal pace. Walk through drink stations if that helps." },
    { at: 30, title: "Gels every 30 min", detail: "Planned gel times: {GELS}. Sip water with each. Drink to thirst at the stations - you don't need to drink at every one." },
    { afterFinish: 0, title: "Finish", detail: "Expected around {FINISH}. Keep walking - don't stop dead." },
    { afterFinish: 45, title: "Recovery", detail: "Within an hour: ~1 g/kg carbs + 20-25 g protein (the finish bag helps, chocolate milk is ideal) + 500 ml fluid. Then a proper meal and keep sipping. A slight headache, nausea or confusion after drinking a lot? Get it checked at a medical tent - don't drink more." },
  ],

  supplements: [
    { name: "Caffeine", how: "Your usual morning coffee is fine every day and on race morning - keep it the same. Caffeine gels are optional and only after testing them on a long run." },
    { name: "Electrolytes", how: "Useful on long runs over ~2 h, on warm days, or if you finish with salt on your skin: a tablet or sachet in your bottle. Not needed on short runs." },
    { name: "Vitamin D", how: "The NHS advises everyone in the UK to consider 10 µg (400 IU) a day in autumn and winter - most of this plan is through winter." },
    { name: "Iron", how: "Female distance runners are more likely to run low on iron. Don't take iron tablets without a blood test - if you're unusually tired, breathless or pale, ask your GP to check your ferritin." },
    { name: "Gels", how: "Start trying them from the January long runs. Find one that sits well, then buy enough for the race (about 8-9) plus a couple of spares." },
    { name: "Not needed", how: "Creatine, pre-workouts, 'fat burners', high-dose vitamins. Food, gels and sleep do the job." },
  ],

  rules: [
    "Nothing new on race day - food, gels, shoes, socks or kit.",
    "Drink to thirst. Drinking a lot more than you sweat can cause hyponatraemia (low blood sodium), which is dangerous - and slower, smaller runners are most at risk. Gaining weight during a run means you drank too much.",
    "No ibuprofen or other anti-inflammatories before or during long runs or the race - they raise kidney and sodium risks. Paracetamol if you need it.",
    "Long runs are fuel rehearsals. Practise breakfast, timing and gels until race day is just another long run.",
    "On carb-load day 2 the biggest meal is lunch, not dinner.",
    "Scale up 1-2 kg on race morning is stored carbs and water. That's the carb load working.",
    "General guidance scaled to your weight. If you have a medical condition or take medication, check with your GP or a dietitian.",
  ],
};
