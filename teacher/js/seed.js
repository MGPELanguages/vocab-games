/* Sample content, loaded as plain data the first time the app runs (all of it can be edited or deleted). */
(function () {
  'use strict';
  const EVG = window.EVG;

  const FOOD = [
    ['apple', 'a round fruit with red, green or yellow skin', 'manzana', 'I eat an apple every morning.', 'noun'],
    ['banana', 'a long curved fruit with a yellow skin', 'banana', 'Bananas are rich in potassium.', 'noun'],
    ['carrot', 'a long orange vegetable that grows underground', 'zanahoria', 'She grated a carrot into the salad.', 'noun'],
    ['cheese', 'a food made from milk that can be soft or hard', 'queso', "I'd like some cheese on my pasta.", 'noun'],
    ['bread', 'a baked food made from flour, water and yeast', 'pan', 'We bought fresh bread at the bakery.', 'noun'],
    ['chicken', 'a bird kept for its meat and eggs', 'pollo', 'The chicken is in the oven.', 'noun'],
    ['rice', 'small white or brown grains that are cooked and eaten', 'arroz', 'Rice goes well with beans.', 'noun'],
    ['tomato', 'a soft red fruit used in salads and sauces', 'tomate', 'Slice the tomato for the sandwich.', 'noun'],
    ['onion', 'a round vegetable with a strong smell that can make you cry', 'cebolla', 'Chop the onion finely.', 'noun'],
    ['potato', 'a round vegetable that grows underground', 'papa', 'He peeled the potato.', 'noun'],
    ['butter', 'a soft yellow fat made from cream', 'manteca', 'Spread butter on the toast.', 'noun'],
    ['lemon', 'a sour yellow citrus fruit', 'limón', 'Squeeze a lemon over the fish.', 'noun'],
    ['grape', 'a small round fruit used to make wine', 'uva', 'These grapes are very sweet.', 'noun'],
    ['yogurt', 'a thick milk product, often sweet and fruity', 'yogur', 'She had yogurt for breakfast.', 'noun'],
    ['spinach', 'a vegetable with dark green leaves', 'espinaca', 'Spinach is rich in iron.', 'noun'],
    ['cream', 'the thick liquid that rises to the top of milk', 'crema', 'Add cream to the soup.', 'noun'],
    ['bake', 'to cook food in an oven', 'hornear', 'I bake cookies on Sundays.', 'verb'],
    ['fry', 'to cook food in hot oil', 'freír', 'Fry the eggs for two minutes.', 'verb'],
    ['boil', 'to cook food in water that is bubbling', 'hervir', 'Boil the pasta for ten minutes.', 'verb'],
    ['grill', 'to cook food on a metal frame over a fire', 'asar a la parrilla', 'They grill meat every weekend.', 'verb'],
  ];
  const TRAVEL = [
    ['passport', 'an official document that lets you travel to other countries', 'pasaporte', 'Do not forget your passport at home.', 'noun'],
    ['luggage', 'the bags and suitcases you take on a trip', 'equipaje', 'Our luggage was lost at the airport.', 'noun'],
    ['ticket', 'a piece of paper or e-document that lets you travel', 'pasaje / boleto', 'I booked a ticket to Madrid.', 'noun'],
    ['departure', 'the act of leaving a place, especially on a journey', 'salida / partida', 'The departure time is 7:30 a.m.', 'noun'],
    ['delay', 'a situation in which something happens later than planned', 'demora / retraso', 'There was a two-hour delay because of the storm.', 'noun'],
    ['itinerary', 'a detailed plan of a journey', 'itinerario', 'Our itinerary includes three cities.', 'noun'],
    ['accommodation', 'a place to stay, such as a hotel or hostel', 'alojamiento', 'We found cheap accommodation near the beach.', 'noun'],
    ['souvenir', 'an object you buy to remember a place you visited', 'recuerdo', 'I bought a small souvenir for my sister.', 'noun'],
    ['customs', 'the place at a border where officials check your bags', 'aduana', 'We waited in line at customs.', 'noun'],
    ['tourist', 'a person who travels for pleasure', 'turista', 'The city is full of tourists in summer.', 'noun'],
    ['reservation', 'an arrangement to keep a room or table for you', 'reserva', 'I made a reservation for two nights.', 'noun'],
    ['sightseeing', 'visiting famous places in a town or country', 'turismo / paseo turístico', 'We spent the day sightseeing in Rome.', 'noun'],
  ];

  function listOf(name, topic, level, rows) {
    return { id: EVG.uid(), name: name, topic: topic, level: level, createdAt: EVG.now(), updatedAt: EVG.now(),
      entries: rows.map((r) => ({ id: EVG.uid(), word: r[0], definition: r[1], translation: r[2], example: r[3], pos: r[4], image: '', topic: topic, level: level })) };
  }

  EVG.buildSeed = function () {
    const food = listOf('Food & Cooking', 'Food', 'A2', FOOD); const travel = listOf('Travel essentials', 'Travel', 'B1', TRAVEL);
    const t = EVG.now(); const games = [];
    const mk = (type, title, description, student, level, topic, difficulty, vocabListId, content) => games.push({
      id: EVG.uid(), type: type, title: title, description: description, student: student, level: level, topic: topic, difficulty: difficulty,
      instructions: EVG.games[type].defaultInstructions, vocabListId: vocabListId, createdAt: t, updatedAt: t, content: content });

    mk('connections', 'Kitchen connections', 'Sort 16 food words into four categories.', 'Sofía', 'A2', 'Food', 'Medium', food.id, { groups: [
      { id: EVG.uid(), name: 'Fruits', explanation: 'Sweet foods that grow on trees or plants.', words: ['apple', 'banana', 'grape', 'lemon'] },
      { id: EVG.uid(), name: 'Vegetables', explanation: 'Plants we eat, often cooked or in salads.', words: ['carrot', 'onion', 'potato', 'spinach'] },
      { id: EVG.uid(), name: 'Dairy products', explanation: 'Foods made from milk.', words: ['cheese', 'butter', 'yogurt', 'cream'] },
      { id: EVG.uid(), name: 'Ways to cook', explanation: 'Verbs that describe how we prepare food.', words: ['bake', 'fry', 'boil', 'grill'] } ] });

    const pairOf = (r) => ({ id: EVG.uid(), term: r[0], definition: r[1], translation: r[2], image: '' });
    mk('matching', 'Food: word → definition', 'Match eight food words with their definitions.', '', 'A2', 'Food', 'Easy', food.id, { mode: 'definition', pairsToShow: 0, pairs: FOOD.slice(0, 8).map(pairOf) });
    mk('matching', 'Food: word → translation', 'Match English food words with their Spanish translation.', 'Sofía', 'A2', 'Food', 'Easy', food.id, { mode: 'translation', pairsToShow: 6, pairs: FOOD.map(pairOf) });

    const mc = EVG.games['multiple-choice'].fromVocab(travel, EVG.games['multiple-choice'].blank(), 'Medium', []).content;
    mc.questions = mc.questions.slice(0, 8);
    mk('multiple-choice', 'Travel vocabulary quiz', 'Which word matches the definition?', 'Martín', 'B1', 'Travel', 'Medium', travel.id, mc);

    const fb = EVG.games['fill-blanks'].fromVocab(food, EVG.games['fill-blanks'].blank(), 'Medium', []).content;
    mk('fill-blanks', 'Complete the food sentences', 'Type the missing food word; the hint is the definition.', 'Sofía', 'A2', 'Food', 'Medium', food.id, { items: fb.items.slice(0, 8) });

    mk('scramble', 'Unscramble the travel words', 'Rearrange the letters and use the definitions as hints.', 'Martín', 'B1', 'Travel', 'Medium', travel.id, { showHints: true,
      words: TRAVEL.filter((r) => ['passport', 'luggage', 'ticket', 'delay', 'souvenir', 'tourist'].indexOf(r[0]) >= 0).map((r) => ({ id: EVG.uid(), word: r[0], hint: r[1] })) });

    mk('odd-one-out', 'Odd one out: food & travel', 'Find the word that does not belong in each group.', '', 'A2', 'Mixed', 'Easy', undefined, { groups: [
      { id: EVG.uid(), words: ['apple', 'banana', 'carrot', 'grape', 'lemon'], oddIndex: 2, explanation: 'A carrot is a vegetable; the others are fruits.' },
      { id: EVG.uid(), words: ['bake', 'fry', 'boil', 'passport', 'grill'], oddIndex: 3, explanation: 'A passport is a document; the others are ways to cook.' },
      { id: EVG.uid(), words: ['cheese', 'butter', 'yogurt', 'bread', 'cream'], oddIndex: 3, explanation: 'Bread is made from flour; the others are dairy products.' } ] });

    const wsWords = ['apple', 'banana', 'carrot', 'cheese', 'bread', 'chicken', 'rice', 'tomato', 'onion', 'lemon'];
    const dirs = { horizontal: true, vertical: true, diagonal: true, backwards: false };
    const ws = EVG.generateWordSearch(wsWords, 'medium', dirs, 'Medium');
    mk('word-search', 'Food word search', 'Find ten food words hidden in the grid.', 'Sofía', 'A2', 'Food', 'Medium', food.id, { words: wsWords, size: 'medium', directions: dirs, grid: ws.grid, placements: ws.placements });

    const cwEntries = TRAVEL.filter((r) => ['passport', 'luggage', 'ticket', 'delay', 'souvenir', 'tourist', 'customs', 'itinerary'].indexOf(r[0]) >= 0).map((r) => ({ id: EVG.uid(), word: r[0], clue: r[1] }));
    const cw = EVG.generateCrossword(cwEntries);
    mk('crossword', 'Travel crossword', 'Solve the clues to complete the crossword.', 'Martín', 'B1', 'Travel', 'Medium', travel.id, { entries: cwEntries, allowReveal: true, layout: cw.layout });
    return { vocab: [food, travel], games: games };
  };

  /* draft helpers */
  EVG.newGame = function (type, list) {
    const def = EVG.games[type];
    return { id: EVG.uid(), type: type, title: '', description: '', student: '', level: list ? list.level : 'A2', topic: list ? list.topic : '', difficulty: 'Medium',
      instructions: def.defaultInstructions, vocabListId: list ? list.id : undefined, createdAt: EVG.now(), updatedAt: EVG.now(), content: def.blank() };
  };
  EVG.validateGame = function (g) {
    const errs = []; if (!g.title.trim()) errs.push('The game needs a title.');
    return errs.concat(EVG.games[g.type].validate(g.content));
  };
})();
