const FOOD_GROUPS = {
  veg: ["potato", "onion", "carrot", "spinach", "pepper", "broccoli", "zucchini", "courgette", "mushroom",
    "tomato", "cabbage", "kale", "lettuce", "celery", "cucumber", "pea", "corn", "cauliflower", "leek",
    "garlic", "squash", "aubergine", "eggplant", "green bean", "asparagus", "sweet potato", "beetroot",
    "beet", "radish", "avocado", "spring onion", "scallion", "chard", "bok choy", "salad", "greens"],
  fruit: ["apple", "banana", "berry", "strawberry", "blueberry", "raspberry", "blackberry", "mango", "pear",
    "peach", "nectarine", "orange", "grape", "pineapple", "kiwi", "plum", "melon", "cherry", "apricot", "fruit"],
  protein: ["chicken", "beef", "pork", "turkey", "sausage", "bacon", "ham", "tofu", "fish", "salmon", "tuna",
    "shrimp", "prawn", "egg", "lentil", "chickpea", "bean", "mince", "steak", "lamb"],
  dairy: ["milk", "cheese", "yogurt", "yoghurt", "cream", "butter", "feta", "mozzarella", "cheddar", "parmesan"],
  grain: ["rice", "bread", "pasta", "spaghetti", "tortilla", "wrap", "noodle", "oat", "bagel", "pitta", "pita", "naan"],
  herb: ["basil", "cilantro", "coriander", "parsley", "mint", "dill", "chive", "rosemary", "thyme", "herb"],
};

const ESTIMATES = {
  veg: { lb: 0.75, price: 1.5 },
  fruit: { lb: 0.6, price: 1.5 },
  protein: { lb: 1, price: 5 },
  dairy: { lb: 1, price: 3 },
  grain: { lb: 1, price: 2 },
  herb: { lb: 0.1, price: 1.5 },
  other: { lb: 0.5, price: 2 },
};

const STAPLES = ["salt", "pepper", "black pepper", "ground black pepper", "water", "oil", "olive oil",
  "vegetable oil", "sunflower oil", "sugar", "caster sugar", "plain flour", "flour", "all purpose flour",
  "butter", "garlic", "onion", "salt and pepper", "ice"];

const ALIASES = {
  "zucchini": ["courgette", "zucchini"],
  "courgette": ["courgette", "zucchini"],
  "eggplant": ["aubergine", "egg plant"],
  "cilantro": ["coriander", "cilantro"],
  "shrimp": ["prawn", "shrimp", "king prawn"],
  "ground beef": ["minced beef", "ground beef"],
  "mince": ["minced beef"],
  "bell pepper": ["red pepper", "green pepper", "yellow pepper", "mixed pepper"],
  "pepper": ["red pepper", "green pepper", "yellow pepper", "mixed pepper"],
  "green onion": ["spring onion", "scallion"],
  "scallion": ["spring onion", "scallion"],
  "yoghurt": ["yogurt", "greek yogurt"],
  "chips": ["potato"],
};
