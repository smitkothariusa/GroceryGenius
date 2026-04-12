export interface FoodEntry {
  id: string;
  emoji: string;
  defaultUnit: string;
  shelfLife: number; // days
  category: string;
  names: {
    en: string[];
    es: string[];
    fr: string[];
    de: string[];
    zh: string[];
    ja: string[];
  };
}

export const FOOD_DATABASE: FoodEntry[] = [
  // ─── DAIRY ───────────────────────────────────────────────────────────────
  { id: 'milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Milk','whole milk','skim milk','2% milk'], es: ['Leche','leche entera','leche desnatada'], fr: ['Lait','lait entier','lait écrémé'], de: ['Milch','Vollmilch','Magermilch'], zh: ['牛奶','全脂牛奶','脱脂牛奶'], ja: ['牛乳','全脂牛乳','低脂肪乳'] } },
  { id: 'eggs', emoji: '🥚', defaultUnit: 'dozen', shelfLife: 30, category: 'dairy', names: { en: ['Eggs','egg','chicken eggs'], es: ['Huevos','huevo'], fr: ['Œufs','oeuf'], de: ['Eier','Ei'], zh: ['鸡蛋','蛋'], ja: ['卵','たまご'] } },
  { id: 'butter', emoji: '🧈', defaultUnit: 'lbs', shelfLife: 30, category: 'dairy', names: { en: ['Butter','unsalted butter','salted butter'], es: ['Mantequilla'], fr: ['Beurre'], de: ['Butter'], zh: ['黄油'], ja: ['バター'] } },
  { id: 'cheddar', emoji: '🧀', defaultUnit: 'lbs', shelfLife: 30, category: 'dairy', names: { en: ['Cheddar Cheese','cheddar','sharp cheddar'], es: ['Queso cheddar'], fr: ['Fromage cheddar'], de: ['Cheddar-Käse'], zh: ['切达奶酪'], ja: ['チェダーチーズ'] } },
  { id: 'mozzarella', emoji: '🧀', defaultUnit: 'lbs', shelfLife: 14, category: 'dairy', names: { en: ['Mozzarella','fresh mozzarella'], es: ['Mozzarella'], fr: ['Mozzarella'], de: ['Mozzarella'], zh: ['马苏里拉奶酪'], ja: ['モッツァレラ'] } },
  { id: 'yogurt', emoji: '🥛', defaultUnit: 'container', shelfLife: 14, category: 'dairy', names: { en: ['Yogurt','greek yogurt','plain yogurt'], es: ['Yogur','yogur griego'], fr: ['Yaourt','yaourt grec'], de: ['Joghurt'], zh: ['酸奶'], ja: ['ヨーグルト'] } },
  { id: 'heavy_cream', emoji: '🧈', defaultUnit: 'carton', shelfLife: 14, category: 'dairy', names: { en: ['Heavy Cream','whipping cream'], es: ['Crema de leche','nata'], fr: ['Crème fraîche'], de: ['Sahne'], zh: ['奶油'], ja: ['生クリーム'] } },
  { id: 'sour_cream', emoji: '🧈', defaultUnit: 'container', shelfLife: 14, category: 'dairy', names: { en: ['Sour Cream'], es: ['Crema agria'], fr: ['Crème aigre'], de: ['Sauerrahm'], zh: ['酸奶油'], ja: ['サワークリーム'] } },
  { id: 'cream_cheese', emoji: '🧀', defaultUnit: 'lbs', shelfLife: 14, category: 'dairy', names: { en: ['Cream Cheese','philadelphia'], es: ['Queso crema'], fr: ['Fromage à la crème'], de: ['Frischkäse'], zh: ['奶油奶酪'], ja: ['クリームチーズ'] } },
  { id: 'parmesan', emoji: '🧀', defaultUnit: 'lbs', shelfLife: 90, category: 'dairy', names: { en: ['Parmesan','parmigiano'], es: ['Parmesano'], fr: ['Parmesan'], de: ['Parmesan'], zh: ['帕玛森奶酪'], ja: ['パルメザン'] } },
  { id: 'cottage_cheese', emoji: '🧀', defaultUnit: 'container', shelfLife: 10, category: 'dairy', names: { en: ['Cottage Cheese'], es: ['Requesón'], fr: ['Fromage cottage'], de: ['Hüttenkäse'], zh: ['农家奶酪'], ja: ['カッテージチーズ'] } },
  { id: 'brie', emoji: '🧀', defaultUnit: 'lbs', shelfLife: 14, category: 'dairy', names: { en: ['Brie','brie cheese'], es: ['Brie'], fr: ['Brie'], de: ['Brie'], zh: ['布里奶酪'], ja: ['ブリー'] } },
  { id: 'goat_cheese', emoji: '🧀', defaultUnit: 'lbs', shelfLife: 14, category: 'dairy', names: { en: ['Goat Cheese','chèvre'], es: ['Queso de cabra'], fr: ['Fromage de chèvre'], de: ['Ziegenkäse'], zh: ['山羊奶酪'], ja: ['ゴートチーズ'] } },
  { id: 'feta', emoji: '🧀', defaultUnit: 'container', shelfLife: 21, category: 'dairy', names: { en: ['Feta','feta cheese'], es: ['Feta'], fr: ['Feta'], de: ['Feta'], zh: ['菲达奶酪'], ja: ['フェタチーズ'] } },
  { id: 'half_and_half', emoji: '🥛', defaultUnit: 'carton', shelfLife: 10, category: 'dairy', names: { en: ['Half and Half','half & half'], es: ['Mitad y mitad'], fr: ['Demi-crème'], de: ['Halbfettmilch'], zh: ['半脂奶油'], ja: ['ハーフ＆ハーフ'] } },
  { id: 'almond_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Almond Milk'], es: ['Leche de almendras'], fr: ['Lait d\'amande'], de: ['Mandelmilch'], zh: ['杏仁奶'], ja: ['アーモンドミルク'] } },
  { id: 'oat_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Oat Milk'], es: ['Leche de avena'], fr: ['Lait d\'avoine'], de: ['Hafermilch'], zh: ['燕麦奶'], ja: ['オーツミルク'] } },

  // ─── PRODUCE — VEGETABLES ────────────────────────────────────────────────
  { id: 'tomato', emoji: '🍅', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Tomatoes','tomato','cherry tomatoes'], es: ['Tomates','tomate'], fr: ['Tomates'], de: ['Tomaten'], zh: ['西红柿','番茄'], ja: ['トマト'] } },
  { id: 'onion', emoji: '🧅', defaultUnit: 'pieces', shelfLife: 30, category: 'produce', names: { en: ['Onion','onions','yellow onion','red onion'], es: ['Cebolla'], fr: ['Oignon'], de: ['Zwiebel'], zh: ['洋葱'], ja: ['玉ねぎ'] } },
  { id: 'garlic', emoji: '🧄', defaultUnit: 'head', shelfLife: 30, category: 'produce', names: { en: ['Garlic','garlic head','garlic cloves'], es: ['Ajo'], fr: ['Ail'], de: ['Knoblauch'], zh: ['大蒜'], ja: ['ニンニク'] } },
  { id: 'potato', emoji: '🥔', defaultUnit: 'lbs', shelfLife: 30, category: 'produce', names: { en: ['Potatoes','potato','russet potato'], es: ['Papas','patatas'], fr: ['Pommes de terre'], de: ['Kartoffeln'], zh: ['土豆'], ja: ['じゃがいも'] } },
  { id: 'sweet_potato', emoji: '🍠', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Sweet Potato','yam'], es: ['Camote','batata'], fr: ['Patate douce'], de: ['Süßkartoffel'], zh: ['红薯'], ja: ['さつまいも'] } },
  { id: 'carrot', emoji: '🥕', defaultUnit: 'bag', shelfLife: 21, category: 'produce', names: { en: ['Carrots','carrot','baby carrots'], es: ['Zanahorias'], fr: ['Carottes'], de: ['Karotten','Möhren'], zh: ['胡萝卜'], ja: ['にんじん'] } },
  { id: 'broccoli', emoji: '🥦', defaultUnit: 'head', shelfLife: 7, category: 'produce', names: { en: ['Broccoli','broccoli florets'], es: ['Brócoli'], fr: ['Brocoli'], de: ['Brokkoli'], zh: ['西兰花'], ja: ['ブロッコリー'] } },
  { id: 'spinach', emoji: '🌿', defaultUnit: 'bag', shelfLife: 5, category: 'produce', names: { en: ['Spinach','baby spinach'], es: ['Espinacas'], fr: ['Épinards'], de: ['Spinat'], zh: ['菠菜'], ja: ['ほうれん草'] } },
  { id: 'lettuce', emoji: '🥬', defaultUnit: 'head', shelfLife: 7, category: 'produce', names: { en: ['Lettuce','romaine','iceberg lettuce'], es: ['Lechuga'], fr: ['Laitue'], de: ['Salat'], zh: ['生菜'], ja: ['レタス'] } },
  { id: 'cucumber', emoji: '🥒', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Cucumber'], es: ['Pepino'], fr: ['Concombre'], de: ['Gurke'], zh: ['黄瓜'], ja: ['きゅうり'] } },
  { id: 'bell_pepper', emoji: '🫑', defaultUnit: 'pieces', shelfLife: 10, category: 'produce', names: { en: ['Bell Pepper','bell peppers','red pepper','green pepper'], es: ['Pimiento'], fr: ['Poivron'], de: ['Paprika'], zh: ['甜椒'], ja: ['ピーマン','パプリカ'] } },
  { id: 'zucchini', emoji: '🌱', defaultUnit: 'pieces', shelfLife: 10, category: 'produce', names: { en: ['Zucchini','courgette'], es: ['Calabacín'], fr: ['Courgette'], de: ['Zucchini'], zh: ['西葫芦'], ja: ['ズッキーニ'] } },
  { id: 'eggplant', emoji: '🍆', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Eggplant','aubergine'], es: ['Berenjena'], fr: ['Aubergine'], de: ['Aubergine'], zh: ['茄子'], ja: ['ナス'] } },
  { id: 'mushroom', emoji: '🍄', defaultUnit: 'bag', shelfLife: 7, category: 'produce', names: { en: ['Mushrooms','mushroom','button mushroom'], es: ['Champiñones'], fr: ['Champignons'], de: ['Pilze'], zh: ['蘑菇'], ja: ['きのこ'] } },
  { id: 'celery', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 14, category: 'produce', names: { en: ['Celery','celery stalks'], es: ['Apio'], fr: ['Céleri'], de: ['Sellerie'], zh: ['芹菜'], ja: ['セロリ'] } },
  { id: 'corn', emoji: '🌽', defaultUnit: 'pieces', shelfLife: 5, category: 'produce', names: { en: ['Corn','sweet corn','corn on the cob'], es: ['Maíz','elote'], fr: ['Maïs'], de: ['Mais'], zh: ['玉米'], ja: ['とうもろこし'] } },
  { id: 'asparagus', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 5, category: 'produce', names: { en: ['Asparagus'], es: ['Espárragos'], fr: ['Asperges'], de: ['Spargel'], zh: ['芦笋'], ja: ['アスパラガス'] } },
  { id: 'green_beans', emoji: '🌿', defaultUnit: 'bag', shelfLife: 7, category: 'produce', names: { en: ['Green Beans','string beans'], es: ['Ejotes','judías verdes'], fr: ['Haricots verts'], de: ['Grüne Bohnen'], zh: ['四季豆'], ja: ['いんげん'] } },
  { id: 'peas', emoji: '🫛', defaultUnit: 'bag', shelfLife: 5, category: 'produce', names: { en: ['Peas','fresh peas','snap peas'], es: ['Guisantes'], fr: ['Petits pois'], de: ['Erbsen'], zh: ['豌豆'], ja: ['えんどう豆'] } },
  { id: 'cauliflower', emoji: '🥦', defaultUnit: 'head', shelfLife: 7, category: 'produce', names: { en: ['Cauliflower'], es: ['Coliflor'], fr: ['Chou-fleur'], de: ['Blumenkohl'], zh: ['花椰菜'], ja: ['カリフラワー'] } },
  { id: 'cabbage', emoji: '🥬', defaultUnit: 'head', shelfLife: 14, category: 'produce', names: { en: ['Cabbage','green cabbage','red cabbage'], es: ['Repollo','col'], fr: ['Chou'], de: ['Kohl'], zh: ['卷心菜'], ja: ['キャベツ'] } },
  { id: 'leek', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 10, category: 'produce', names: { en: ['Leeks','leek'], es: ['Puerros'], fr: ['Poireaux'], de: ['Lauch'], zh: ['韭葱'], ja: ['リーキ'] } },
  { id: 'kale', emoji: '🥬', defaultUnit: 'bunch', shelfLife: 5, category: 'produce', names: { en: ['Kale','curly kale'], es: ['Col rizada'], fr: ['Chou frisé'], de: ['Grünkohl'], zh: ['羽衣甘蓝'], ja: ['ケール'] } },
  { id: 'beets', emoji: '🥕', defaultUnit: 'bunch', shelfLife: 21, category: 'produce', names: { en: ['Beets','beetroot'], es: ['Remolacha'], fr: ['Betteraves'], de: ['Rote Bete'], zh: ['甜菜根'], ja: ['ビーツ'] } },
  { id: 'radish', emoji: '🥕', defaultUnit: 'bunch', shelfLife: 10, category: 'produce', names: { en: ['Radishes','radish'], es: ['Rábanos'], fr: ['Radis'], de: ['Radieschen'], zh: ['萝卜'], ja: ['ラディッシュ'] } },
  { id: 'scallions', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Green Onions','scallions','spring onions'], es: ['Cebolletas'], fr: ['Oignons verts'], de: ['Frühlingszwiebeln'], zh: ['葱','小葱'], ja: ['ねぎ'] } },
  { id: 'cilantro', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Cilantro','coriander leaves'], es: ['Cilantro'], fr: ['Coriandre'], de: ['Koriander'], zh: ['香菜'], ja: ['パクチー'] } },
  { id: 'basil', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Basil'], es: ['Albahaca'], fr: ['Basilic'], de: ['Basilikum'], zh: ['罗勒'], ja: ['バジル'] } },
  { id: 'parsley', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Parsley'], es: ['Perejil'], fr: ['Persil'], de: ['Petersilie'], zh: ['欧芹'], ja: ['パセリ'] } },
  { id: 'mint', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Mint'], es: ['Menta'], fr: ['Menthe'], de: ['Minze'], zh: ['薄荷'], ja: ['ミント'] } },
  { id: 'artichoke', emoji: '🌿', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Artichoke'], es: ['Alcachofa'], fr: ['Artichaut'], de: ['Artischocke'], zh: ['朝鲜蓟'], ja: ['アーティチョーク'] } },
  { id: 'brussels_sprouts', emoji: '🥦', defaultUnit: 'bag', shelfLife: 7, category: 'produce', names: { en: ['Brussels Sprouts'], es: ['Coles de Bruselas'], fr: ['Choux de Bruxelles'], de: ['Rosenkohl'], zh: ['球芽甘蓝'], ja: ['芽キャベツ'] } },
  { id: 'bok_choy', emoji: '🥬', defaultUnit: 'head', shelfLife: 5, category: 'produce', names: { en: ['Bok Choy','pak choy'], es: ['Bok choy'], fr: ['Chou chinois'], de: ['Pak Choi'], zh: ['小白菜','青菜'], ja: ['チンゲンサイ'] } },
  { id: 'fennel', emoji: '🌿', defaultUnit: 'head', shelfLife: 7, category: 'produce', names: { en: ['Fennel','fennel bulb'], es: ['Hinojo'], fr: ['Fenouil'], de: ['Fenchel'], zh: ['茴香'], ja: ['フェンネル'] } },
  { id: 'turnip', emoji: '🌿', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Turnip'], es: ['Nabo'], fr: ['Navet'], de: ['Rübe'], zh: ['芜菁'], ja: ['カブ'] } },
  { id: 'butternut_squash', emoji: '🎃', defaultUnit: 'pieces', shelfLife: 30, category: 'produce', names: { en: ['Butternut Squash'], es: ['Calabaza butternut'], fr: ['Courge butternut'], de: ['Butternusskürbis'], zh: ['奶油南瓜'], ja: ['バターナッツかぼちゃ'] } },
  { id: 'jalapeno', emoji: '🌶️', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Jalapeño','jalapeno'], es: ['Jalapeño'], fr: ['Jalapeño'], de: ['Jalapeño'], zh: ['墨西哥辣椒'], ja: ['ハラペーニョ'] } },
  { id: 'edamame', emoji: '🫛', defaultUnit: 'bag', shelfLife: 5, category: 'produce', names: { en: ['Edamame'], es: ['Edamame'], fr: ['Edamame'], de: ['Edamame'], zh: ['毛豆'], ja: ['枝豆'] } },
  { id: 'daikon', emoji: '🌿', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Daikon','daikon radish'], es: ['Rábano daikon'], fr: ['Daikon'], de: ['Daikon'], zh: ['白萝卜'], ja: ['大根'] } },

  // ─── PRODUCE — FRUITS ────────────────────────────────────────────────────
  { id: 'apple', emoji: '🍎', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Apples','apple','granny smith'], es: ['Manzanas'], fr: ['Pommes'], de: ['Äpfel'], zh: ['苹果'], ja: ['りんご'] } },
  { id: 'banana', emoji: '🍌', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Bananas','banana'], es: ['Plátanos'], fr: ['Bananes'], de: ['Bananen'], zh: ['香蕉'], ja: ['バナナ'] } },
  { id: 'orange', emoji: '🍊', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Oranges','orange'], es: ['Naranjas'], fr: ['Oranges'], de: ['Orangen'], zh: ['橙子'], ja: ['オレンジ'] } },
  { id: 'lemon', emoji: '🍋', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Lemons','lemon'], es: ['Limones'], fr: ['Citrons'], de: ['Zitronen'], zh: ['柠檬'], ja: ['レモン'] } },
  { id: 'lime', emoji: '🍋', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Limes','lime'], es: ['Limas'], fr: ['Citrons verts'], de: ['Limetten'], zh: ['青柠'], ja: ['ライム'] } },
  { id: 'strawberry', emoji: '🍓', defaultUnit: 'bag', shelfLife: 5, category: 'produce', names: { en: ['Strawberries','strawberry'], es: ['Fresas'], fr: ['Fraises'], de: ['Erdbeeren'], zh: ['草莓'], ja: ['いちご'] } },
  { id: 'blueberry', emoji: '🫐', defaultUnit: 'bag', shelfLife: 7, category: 'produce', names: { en: ['Blueberries','blueberry'], es: ['Arándanos'], fr: ['Myrtilles'], de: ['Blaubeeren'], zh: ['蓝莓'], ja: ['ブルーベリー'] } },
  { id: 'grape', emoji: '🍇', defaultUnit: 'bag', shelfLife: 10, category: 'produce', names: { en: ['Grapes','grape'], es: ['Uvas'], fr: ['Raisins'], de: ['Trauben'], zh: ['葡萄'], ja: ['ぶどう'] } },
  { id: 'watermelon', emoji: '🍉', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Watermelon'], es: ['Sandía'], fr: ['Pastèque'], de: ['Wassermelone'], zh: ['西瓜'], ja: ['スイカ'] } },
  { id: 'mango', emoji: '🥭', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Mango','mangoes'], es: ['Mangos'], fr: ['Mangues'], de: ['Mangos'], zh: ['芒果'], ja: ['マンゴー'] } },
  { id: 'pineapple', emoji: '🍍', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Pineapple'], es: ['Piña'], fr: ['Ananas'], de: ['Ananas'], zh: ['菠萝'], ja: ['パイナップル'] } },
  { id: 'peach', emoji: '🍑', defaultUnit: 'pieces', shelfLife: 5, category: 'produce', names: { en: ['Peaches','peach','nectarine'], es: ['Duraznos'], fr: ['Pêches'], de: ['Pfirsiche'], zh: ['桃子'], ja: ['もも'] } },
  { id: 'pear', emoji: '🍐', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Pears','pear'], es: ['Peras'], fr: ['Poires'], de: ['Birnen'], zh: ['梨'], ja: ['なし'] } },
  { id: 'avocado', emoji: '🥑', defaultUnit: 'pieces', shelfLife: 5, category: 'produce', names: { en: ['Avocado','hass avocado'], es: ['Aguacate','palta'], fr: ['Avocat'], de: ['Avocado'], zh: ['牛油果'], ja: ['アボカド'] } },
  { id: 'cherry', emoji: '🍒', defaultUnit: 'bag', shelfLife: 7, category: 'produce', names: { en: ['Cherries','cherry'], es: ['Cerezas'], fr: ['Cerises'], de: ['Kirschen'], zh: ['樱桃'], ja: ['さくらんぼ'] } },
  { id: 'raspberry', emoji: '🫐', defaultUnit: 'bag', shelfLife: 3, category: 'produce', names: { en: ['Raspberries','raspberry'], es: ['Frambuesas'], fr: ['Framboises'], de: ['Himbeeren'], zh: ['覆盆子'], ja: ['ラズベリー'] } },
  { id: 'kiwi', emoji: '🥝', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Kiwi','kiwifruit'], es: ['Kiwi'], fr: ['Kiwi'], de: ['Kiwi'], zh: ['猕猴桃'], ja: ['キウイ'] } },
  { id: 'pomegranate', emoji: '🫒', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Pomegranate'], es: ['Granada'], fr: ['Grenade'], de: ['Granatapfel'], zh: ['石榴'], ja: ['ざくろ'] } },
  { id: 'coconut', emoji: '🥥', defaultUnit: 'pieces', shelfLife: 90, category: 'produce', names: { en: ['Coconut'], es: ['Coco'], fr: ['Noix de coco'], de: ['Kokosnuss'], zh: ['椰子'], ja: ['ヤシの実'] } },
  { id: 'ginger', emoji: '🫚', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Ginger','ginger root'], es: ['Jengibre'], fr: ['Gingembre'], de: ['Ingwer'], zh: ['生姜'], ja: ['しょうが'] } },
  { id: 'plum', emoji: '🍑', defaultUnit: 'pieces', shelfLife: 5, category: 'produce', names: { en: ['Plums','plum'], es: ['Ciruelas'], fr: ['Prunes'], de: ['Pflaumen'], zh: ['李子'], ja: ['プラム'] } },
  { id: 'apricot', emoji: '🍑', defaultUnit: 'pieces', shelfLife: 3, category: 'produce', names: { en: ['Apricots','apricot'], es: ['Albaricoques'], fr: ['Abricots'], de: ['Aprikosen'], zh: ['杏'], ja: ['アプリコット'] } },
  { id: 'cantaloupe', emoji: '🍈', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Cantaloupe','melon'], es: ['Melón'], fr: ['Melon'], de: ['Melone'], zh: ['哈密瓜'], ja: ['カンタロープ'] } },
  { id: 'papaya', emoji: '🍈', defaultUnit: 'pieces', shelfLife: 5, category: 'produce', names: { en: ['Papaya'], es: ['Papaya'], fr: ['Papaye'], de: ['Papaya'], zh: ['木瓜'], ja: ['パパイヤ'] } },
  { id: 'dragon_fruit', emoji: '🐉', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Dragon Fruit','pitaya'], es: ['Pitaya'], fr: ['Fruit du dragon'], de: ['Drachenfrucht'], zh: ['火龙果'], ja: ['ドラゴンフルーツ'] } },

  // ─── MEAT & SEAFOOD ──────────────────────────────────────────────────────
  { id: 'chicken_breast', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Chicken Breast','boneless chicken'], es: ['Pechuga de pollo'], fr: ['Blanc de poulet'], de: ['Hähnchenbrust'], zh: ['鸡胸肉'], ja: ['鶏むね肉'] } },
  { id: 'chicken_thigh', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Chicken Thighs','chicken legs'], es: ['Muslos de pollo'], fr: ['Cuisses de poulet'], de: ['Hähnchenschenkel'], zh: ['鸡腿肉'], ja: ['鶏もも肉'] } },
  { id: 'ground_beef', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Ground Beef','minced beef'], es: ['Carne molida'], fr: ['Viande hachée'], de: ['Hackfleisch'], zh: ['牛肉馅'], ja: ['牛ひき肉'] } },
  { id: 'steak', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Steak','beef steak','ribeye','sirloin'], es: ['Bistec','filete'], fr: ['Steak'], de: ['Steak'], zh: ['牛排'], ja: ['ステーキ'] } },
  { id: 'pork_chop', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Pork Chops','pork chop'], es: ['Chuletas de cerdo'], fr: ['Côtelettes de porc'], de: ['Schweinekotelett'], zh: ['猪排'], ja: ['ポークチョップ'] } },
  { id: 'bacon', emoji: '🥓', defaultUnit: 'pack', shelfLife: 7, category: 'meat', names: { en: ['Bacon','streaky bacon'], es: ['Tocino','beicon'], fr: ['Bacon'], de: ['Speck'], zh: ['培根'], ja: ['ベーコン'] } },
  { id: 'sausage', emoji: '🥩', defaultUnit: 'pack', shelfLife: 5, category: 'meat', names: { en: ['Sausages','sausage','italian sausage'], es: ['Salchichas'], fr: ['Saucisses'], de: ['Würstchen'], zh: ['香肠'], ja: ['ソーセージ'] } },
  { id: 'salmon', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Salmon','salmon fillet'], es: ['Salmón'], fr: ['Saumon'], de: ['Lachs'], zh: ['三文鱼'], ja: ['サーモン'] } },
  { id: 'tuna_fresh', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 2, category: 'meat', names: { en: ['Fresh Tuna','tuna steak'], es: ['Atún fresco'], fr: ['Thon frais'], de: ['Thunfisch'], zh: ['金枪鱼'], ja: ['マグロ'] } },
  { id: 'shrimp', emoji: '🦐', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Shrimp','prawns'], es: ['Camarones','gambas'], fr: ['Crevettes'], de: ['Garnelen'], zh: ['虾'], ja: ['エビ'] } },
  { id: 'ground_turkey', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Ground Turkey'], es: ['Pavo molido'], fr: ['Dinde hachée'], de: ['Truthahn-Hackfleisch'], zh: ['火鸡肉馅'], ja: ['ターキーひき肉'] } },
  { id: 'lamb', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Lamb','lamb chops'], es: ['Cordero'], fr: ['Agneau'], de: ['Lamm'], zh: ['羊肉'], ja: ['ラム肉'] } },
  { id: 'ham', emoji: '🥓', defaultUnit: 'pack', shelfLife: 7, category: 'meat', names: { en: ['Ham','deli ham'], es: ['Jamón'], fr: ['Jambon'], de: ['Schinken'], zh: ['火腿'], ja: ['ハム'] } },
  { id: 'whole_chicken', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Whole Chicken','roasting chicken'], es: ['Pollo entero'], fr: ['Poulet entier'], de: ['Ganzes Hähnchen'], zh: ['整鸡'], ja: ['丸鶏'] } },
  { id: 'chicken_wings', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Chicken Wings'], es: ['Alitas de pollo'], fr: ['Ailes de poulet'], de: ['Hähnchenflügel'], zh: ['鸡翅'], ja: ['チキンウィング'] } },
  { id: 'pork_tenderloin', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Pork Tenderloin'], es: ['Lomo de cerdo'], fr: ['Filet de porc'], de: ['Schweinefilet'], zh: ['猪里脊'], ja: ['豚ヒレ肉'] } },
  { id: 'cod', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Cod','cod fillet'], es: ['Bacalao'], fr: ['Cabillaud'], de: ['Kabeljau'], zh: ['鳕鱼'], ja: ['タラ'] } },
  { id: 'tilapia', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Tilapia'], es: ['Tilapia'], fr: ['Tilapia'], de: ['Tilapia'], zh: ['罗非鱼'], ja: ['ティラピア'] } },
  { id: 'scallops', emoji: '🦪', defaultUnit: 'lbs', shelfLife: 2, category: 'meat', names: { en: ['Scallops'], es: ['Vieiras'], fr: ['Noix de Saint-Jacques'], de: ['Jakobsmuscheln'], zh: ['扇贝'], ja: ['ホタテ'] } },
  { id: 'crab', emoji: '🦀', defaultUnit: 'lbs', shelfLife: 2, category: 'meat', names: { en: ['Crab','crab legs'], es: ['Cangrejo'], fr: ['Crabe'], de: ['Krabbe'], zh: ['螃蟹'], ja: ['カニ'] } },
  { id: 'turkey_breast', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Turkey Breast'], es: ['Pechuga de pavo'], fr: ['Blanc de dinde'], de: ['Putenbrust'], zh: ['火鸡胸肉'], ja: ['七面鳥の胸肉'] } },
  { id: 'pepperoni', emoji: '🥩', defaultUnit: 'pack', shelfLife: 14, category: 'meat', names: { en: ['Pepperoni'], es: ['Pepperoni'], fr: ['Pepperoni'], de: ['Pepperoni'], zh: ['意大利辣香肠'], ja: ['ペパロニ'] } },
  { id: 'salami', emoji: '🥩', defaultUnit: 'pack', shelfLife: 14, category: 'meat', names: { en: ['Salami'], es: ['Salami'], fr: ['Salami'], de: ['Salami'], zh: ['萨拉米香肠'], ja: ['サラミ'] } },

  // ─── CANNED GOODS ────────────────────────────────────────────────────────
  { id: 'canned_tomatoes', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Tomatoes','diced tomatoes'], es: ['Tomates en lata'], fr: ['Tomates en boîte'], de: ['Dosentomaten'], zh: ['番茄罐头'], ja: ['缶詰トマト'] } },
  { id: 'canned_tuna', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Tuna','tuna in water'], es: ['Atún en lata'], fr: ['Thon en boîte'], de: ['Thunfisch in Dose'], zh: ['金枪鱼罐头'], ja: ['ツナ缶'] } },
  { id: 'canned_black_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Black Beans','black beans'], es: ['Frijoles negros enlatados'], fr: ['Haricots noirs en boîte'], de: ['Schwarze Bohnen in Dose'], zh: ['黑豆罐头'], ja: ['缶詰黒豆'] } },
  { id: 'canned_chickpeas', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Chickpeas','garbanzo beans'], es: ['Garbanzos en lata'], fr: ['Pois chiches en boîte'], de: ['Kichererbsen in Dose'], zh: ['鹰嘴豆罐头'], ja: ['缶詰ひよこ豆'] } },
  { id: 'canned_corn', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Corn'], es: ['Maíz enlatado'], fr: ['Maïs en boîte'], de: ['Mais in Dose'], zh: ['玉米罐头'], ja: ['缶詰コーン'] } },
  { id: 'coconut_milk', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Coconut Milk','canned coconut milk'], es: ['Leche de coco'], fr: ['Lait de coco'], de: ['Kokosmilch'], zh: ['椰奶'], ja: ['ココナッツミルク'] } },
  { id: 'canned_soup', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Soup','chicken soup'], es: ['Sopa enlatada'], fr: ['Soupe en boîte'], de: ['Dosensuppe'], zh: ['罐头汤'], ja: ['缶詰スープ'] } },
  { id: 'tomato_paste', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Tomato Paste'], es: ['Pasta de tomate'], fr: ['Concentré de tomate'], de: ['Tomatenmark'], zh: ['番茄酱'], ja: ['トマトペースト'] } },
  { id: 'canned_lentils', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Lentils'], es: ['Lentejas enlatadas'], fr: ['Lentilles en boîte'], de: ['Linsen in Dose'], zh: ['扁豆罐头'], ja: ['缶詰レンズ豆'] } },
  { id: 'canned_kidney_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Kidney Beans','canned kidney beans'], es: ['Frijoles rojos'], fr: ['Haricots rouges'], de: ['Kidneybohnen'], zh: ['红腰豆'], ja: ['レッドキドニービーンズ'] } },
  { id: 'canned_pumpkin', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Pumpkin','pumpkin puree'], es: ['Puré de calabaza'], fr: ['Purée de citrouille'], de: ['Kürbispüree'], zh: ['南瓜泥'], ja: ['かぼちゃ缶'] } },
  { id: 'sardines', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Sardines'], es: ['Sardinas'], fr: ['Sardines'], de: ['Sardinen'], zh: ['沙丁鱼'], ja: ['イワシ缶'] } },
  { id: 'chicken_broth', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Chicken Broth','chicken stock'], es: ['Caldo de pollo'], fr: ['Bouillon de poulet'], de: ['Hühnerbrühe'], zh: ['鸡汤'], ja: ['チキンブロス'] } },
  { id: 'vegetable_broth', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Vegetable Broth','vegetable stock'], es: ['Caldo de verduras'], fr: ['Bouillon de légumes'], de: ['Gemüsebrühe'], zh: ['蔬菜汤'], ja: ['野菜ブロス'] } },
  { id: 'canned_white_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['White Beans','cannellini beans'], es: ['Alubias blancas'], fr: ['Haricots blancs'], de: ['Weiße Bohnen'], zh: ['白豆'], ja: ['白インゲン豆'] } },
  { id: 'canned_salmon', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Salmon'], es: ['Salmón en lata'], fr: ['Saumon en boîte'], de: ['Lachs in Dose'], zh: ['三文鱼罐头'], ja: ['鮭缶'] } },

  // ─── GRAINS ──────────────────────────────────────────────────────────────
  { id: 'white_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['White Rice','rice'], es: ['Arroz blanco'], fr: ['Riz blanc'], de: ['Weißer Reis'], zh: ['白米','大米'], ja: ['白米','ご飯'] } },
  { id: 'brown_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Brown Rice'], es: ['Arroz integral'], fr: ['Riz complet'], de: ['Brauner Reis'], zh: ['糙米'], ja: ['玄米'] } },
  { id: 'jasmine_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Jasmine Rice'], es: ['Arroz jazmín'], fr: ['Riz jasmin'], de: ['Jasminreis'], zh: ['茉莉香米'], ja: ['ジャスミンライス'] } },
  { id: 'basmati_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Basmati Rice'], es: ['Arroz basmati'], fr: ['Riz basmati'], de: ['Basmatireis'], zh: ['巴斯马蒂米'], ja: ['バスマティライス'] } },
  { id: 'spaghetti', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Spaghetti','pasta'], es: ['Espagueti'], fr: ['Spaghetti'], de: ['Spaghetti'], zh: ['意大利面'], ja: ['スパゲッティ'] } },
  { id: 'penne', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Penne','penne pasta'], es: ['Penne'], fr: ['Penne'], de: ['Penne'], zh: ['管状意面'], ja: ['ペンネ'] } },
  { id: 'fettuccine', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Fettuccine','fettuccini'], es: ['Fetuchini'], fr: ['Fettuccine'], de: ['Fettuccine'], zh: ['宽面条'], ja: ['フェットチーネ'] } },
  { id: 'white_bread', emoji: '🍞', defaultUnit: 'loaf', shelfLife: 7, category: 'grains', names: { en: ['White Bread','bread'], es: ['Pan blanco'], fr: ['Pain blanc'], de: ['Weißbrot'], zh: ['白面包'], ja: ['食パン'] } },
  { id: 'whole_wheat_bread', emoji: '🍞', defaultUnit: 'loaf', shelfLife: 7, category: 'grains', names: { en: ['Whole Wheat Bread','wholemeal bread'], es: ['Pan integral'], fr: ['Pain complet'], de: ['Vollkornbrot'], zh: ['全麦面包'], ja: ['全粒粉パン'] } },
  { id: 'sourdough', emoji: '🍞', defaultUnit: 'loaf', shelfLife: 5, category: 'grains', names: { en: ['Sourdough','sourdough bread'], es: ['Pan de masa madre'], fr: ['Pain au levain'], de: ['Sauerteigbrot'], zh: ['酸面包'], ja: ['サワードウ'] } },
  { id: 'flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Flour','all-purpose flour'], es: ['Harina'], fr: ['Farine'], de: ['Mehl'], zh: ['面粉'], ja: ['小麦粉'] } },
  { id: 'whole_wheat_flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 180, category: 'grains', names: { en: ['Whole Wheat Flour'], es: ['Harina integral'], fr: ['Farine de blé entier'], de: ['Vollkornmehl'], zh: ['全麦面粉'], ja: ['全粒粉'] } },
  { id: 'rolled_oats', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Rolled Oats','oats','oatmeal'], es: ['Avena'], fr: ['Flocons d\'avoine'], de: ['Haferflocken'], zh: ['燕麦片'], ja: ['オートミール'] } },
  { id: 'quinoa', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Quinoa'], es: ['Quinoa'], fr: ['Quinoa'], de: ['Quinoa'], zh: ['藜麦'], ja: ['キヌア'] } },
  { id: 'red_lentils', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Red Lentils','lentils'], es: ['Lentejas rojas'], fr: ['Lentilles rouges'], de: ['Rote Linsen'], zh: ['红扁豆'], ja: ['赤レンズ豆'] } },
  { id: 'green_lentils', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Green Lentils'], es: ['Lentejas verdes'], fr: ['Lentilles vertes'], de: ['Grüne Linsen'], zh: ['绿扁豆'], ja: ['緑レンズ豆'] } },
  { id: 'dried_chickpeas', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Dried Chickpeas','garbanzo beans'], es: ['Garbanzos secos'], fr: ['Pois chiches secs'], de: ['Getrocknete Kichererbsen'], zh: ['干鹰嘴豆'], ja: ['乾燥ひよこ豆'] } },
  { id: 'black_beans_dry', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Dried Black Beans'], es: ['Frijoles negros secos'], fr: ['Haricots noirs secs'], de: ['Schwarze Bohnen getrocknet'], zh: ['干黑豆'], ja: ['乾燥黒豆'] } },
  { id: 'breadcrumbs', emoji: '🍞', defaultUnit: 'bag', shelfLife: 180, category: 'grains', names: { en: ['Breadcrumbs','panko'], es: ['Pan rallado'], fr: ['Chapelure'], de: ['Semmelbrösel'], zh: ['面包糠'], ja: ['パン粉'] } },
  { id: 'couscous', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Couscous'], es: ['Cuscús'], fr: ['Couscous'], de: ['Couscous'], zh: ['库斯库斯'], ja: ['クスクス'] } },
  { id: 'cornmeal', emoji: '🌽', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Cornmeal','polenta'], es: ['Harina de maíz','polenta'], fr: ['Semoule de maïs'], de: ['Maisgrieß'], zh: ['玉米粉'], ja: ['コーンミール'] } },
  { id: 'orzo', emoji: '🍝', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Orzo'], es: ['Orzo'], fr: ['Orzo'], de: ['Orzo'], zh: ['奥佐'], ja: ['オルゾ'] } },
  { id: 'risotto_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Risotto Rice','arborio'], es: ['Arroz para risotto'], fr: ['Riz à risotto'], de: ['Risottoreis'], zh: ['意式烩饭米'], ja: ['リゾット米'] } },
  { id: 'farro', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Farro'], es: ['Farro'], fr: ['Épeautre'], de: ['Dinkel'], zh: ['法罗小麦'], ja: ['ファロ'] } },
  { id: 'barley', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Barley','pearl barley'], es: ['Cebada'], fr: ['Orge'], de: ['Gerste'], zh: ['大麦'], ja: ['大麦'] } },
  { id: 'rye_bread', emoji: '🍞', defaultUnit: 'loaf', shelfLife: 7, category: 'grains', names: { en: ['Rye Bread'], es: ['Pan de centeno'], fr: ['Pain de seigle'], de: ['Roggenbrot'], zh: ['黑麦面包'], ja: ['ライ麦パン'] } },
  { id: 'naan', emoji: '🫓', defaultUnit: 'pack', shelfLife: 5, category: 'grains', names: { en: ['Naan','naan bread'], es: ['Naan'], fr: ['Naan'], de: ['Naan'], zh: ['印度烤饼'], ja: ['ナン'] } },

  // ─── BREAKFAST ───────────────────────────────────────────────────────────
  { id: 'granola', emoji: '🥣', defaultUnit: 'bag', shelfLife: 90, category: 'breakfast', names: { en: ['Granola','muesli'], es: ['Granola','müsli'], fr: ['Granola','müesli'], de: ['Müsli'], zh: ['格兰诺拉麦片'], ja: ['グラノーラ'] } },
  { id: 'pancake_mix', emoji: '🥞', defaultUnit: 'bag', shelfLife: 365, category: 'breakfast', names: { en: ['Pancake Mix','waffle mix'], es: ['Mezcla para panqueques'], fr: ['Mélange à crêpes'], de: ['Pfannkuchenmischung'], zh: ['煎饼粉'], ja: ['パンケーキミックス'] } },
  { id: 'cereal', emoji: '🌾', defaultUnit: 'box', shelfLife: 180, category: 'breakfast', names: { en: ['Cereal','breakfast cereal'], es: ['Cereal'], fr: ['Céréales'], de: ['Müsli','Frühstücksflocken'], zh: ['麦片'], ja: ['シリアル'] } },
  { id: 'maple_syrup', emoji: '🍯', defaultUnit: 'bottle', shelfLife: 365, category: 'breakfast', names: { en: ['Maple Syrup'], es: ['Jarabe de arce'], fr: ['Sirop d\'érable'], de: ['Ahornsirup'], zh: ['枫糖浆'], ja: ['メープルシロップ'] } },
  { id: 'instant_oatmeal', emoji: '🥣', defaultUnit: 'box', shelfLife: 180, category: 'breakfast', names: { en: ['Instant Oatmeal','instant oats'], es: ['Avena instantánea'], fr: ['Flocons d\'avoine instantanés'], de: ['Instant-Haferflocken'], zh: ['速溶燕麦'], ja: ['インスタントオートミール'] } },
  { id: 'breakfast_bars', emoji: '📦', defaultUnit: 'box', shelfLife: 180, category: 'breakfast', names: { en: ['Breakfast Bars','granola bars'], es: ['Barras de desayuno'], fr: ['Barres de petit-déjeuner'], de: ['Frühstücksriegel'], zh: ['早餐棒'], ja: ['朝食バー'] } },
  { id: 'honey', emoji: '🍯', defaultUnit: 'jar', shelfLife: 730, category: 'pantryItems', names: { en: ['Honey','raw honey'], es: ['Miel'], fr: ['Miel'], de: ['Honig'], zh: ['蜂蜜'], ja: ['はちみつ'] } },
  { id: 'peanut_butter', emoji: '🥜', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Peanut Butter'], es: ['Mantequilla de maní'], fr: ['Beurre de cacahuète'], de: ['Erdnussbutter'], zh: ['花生酱'], ja: ['ピーナッツバター'] } },
  { id: 'jam', emoji: '🍓', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Jam','strawberry jam','jelly'], es: ['Mermelada'], fr: ['Confiture'], de: ['Marmelade'], zh: ['果酱'], ja: ['ジャム'] } },
  { id: 'nutella', emoji: '🍫', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Nutella','chocolate spread'], es: ['Nutella','crema de chocolate'], fr: ['Nutella','pâte à tartiner'], de: ['Nutella'], zh: ['能多益巧克力酱'], ja: ['ヌテラ'] } },
  { id: 'english_muffins', emoji: '🫓', defaultUnit: 'pack', shelfLife: 7, category: 'bakery', names: { en: ['English Muffins'], es: ['Muffins ingleses'], fr: ['Muffins anglais'], de: ['English Muffins'], zh: ['英式松饼'], ja: ['イングリッシュマフィン'] } },
  { id: 'danish_pastry', emoji: '🥐', defaultUnit: 'pieces', shelfLife: 2, category: 'breakfast', names: { en: ['Danish Pastry','danish'], es: ['Pastel danés'], fr: ['Pâtisserie danoise'], de: ['Dänisches Gebäck'], zh: ['丹麦酥皮点心'], ja: ['デニッシュ'] } },
  { id: 'waffles', emoji: '🧇', defaultUnit: 'pack', shelfLife: 180, category: 'breakfast', names: { en: ['Waffles','frozen waffles'], es: ['Gofres'], fr: ['Gaufres'], de: ['Waffeln'], zh: ['华夫饼'], ja: ['ワッフル'] } },
  { id: 'french_toast', emoji: '🍞', defaultUnit: 'pack', shelfLife: 180, category: 'breakfast', names: { en: ['French Toast','frozen french toast'], es: ['Tostadas francesas'], fr: ['Pain perdu'], de: ['Arme Ritter'], zh: ['法式吐司'], ja: ['フレンチトースト'] } },

  // ─── PANTRY ITEMS / CONDIMENTS ───────────────────────────────────────────
  { id: 'olive_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Olive Oil','extra virgin olive oil'], es: ['Aceite de oliva'], fr: ['Huile d\'olive'], de: ['Olivenöl'], zh: ['橄榄油'], ja: ['オリーブオイル'] } },
  { id: 'vegetable_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Vegetable Oil','canola oil'], es: ['Aceite vegetal'], fr: ['Huile végétale'], de: ['Pflanzenöl'], zh: ['植物油'], ja: ['サラダ油'] } },
  { id: 'coconut_oil', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Coconut Oil'], es: ['Aceite de coco'], fr: ['Huile de coco'], de: ['Kokosöl'], zh: ['椰子油'], ja: ['ココナッツオイル'] } },
  { id: 'sesame_oil', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Sesame Oil'], es: ['Aceite de sésamo'], fr: ['Huile de sésame'], de: ['Sesamöl'], zh: ['芝麻油'], ja: ['ごま油'] } },
  { id: 'soy_sauce', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Soy Sauce','tamari'], es: ['Salsa de soya'], fr: ['Sauce soja'], de: ['Sojasoße'], zh: ['酱油'], ja: ['醤油'] } },
  { id: 'fish_sauce', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems', names: { en: ['Fish Sauce'], es: ['Salsa de pescado'], fr: ['Sauce de poisson'], de: ['Fischsauce'], zh: ['鱼露'], ja: ['ナンプラー'] } },
  { id: 'oyster_sauce', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Oyster Sauce'], es: ['Salsa de ostras'], fr: ['Sauce aux huîtres'], de: ['Austernsauce'], zh: ['蚝油'], ja: ['オイスターソース'] } },
  { id: 'worcestershire', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Worcestershire Sauce'], es: ['Salsa inglesa'], fr: ['Sauce Worcestershire'], de: ['Worcestershiresoße'], zh: ['伍斯特沙司'], ja: ['ウスターソース'] } },
  { id: 'hot_sauce', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Hot Sauce','sriracha','tabasco'], es: ['Salsa picante'], fr: ['Sauce piquante'], de: ['Chilisoße'], zh: ['辣酱'], ja: ['ホットソース'] } },
  { id: 'ketchup', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 180, category: 'pantryItems', names: { en: ['Ketchup','tomato ketchup'], es: ['Kétchup'], fr: ['Ketchup'], de: ['Ketchup'], zh: ['番茄酱'], ja: ['ケチャップ'] } },
  { id: 'mustard', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Mustard','dijon mustard'], es: ['Mostaza'], fr: ['Moutarde'], de: ['Senf'], zh: ['芥末酱'], ja: ['マスタード'] } },
  { id: 'mayonnaise', emoji: '🧴', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Mayonnaise','mayo'], es: ['Mayonesa'], fr: ['Mayonnaise'], de: ['Mayonnaise'], zh: ['蛋黄酱'], ja: ['マヨネーズ'] } },
  { id: 'barbecue_sauce', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Barbecue Sauce','BBQ sauce'], es: ['Salsa barbacoa'], fr: ['Sauce barbecue'], de: ['Barbecuesauce'], zh: ['烧烤酱'], ja: ['バーベキューソース'] } },
  { id: 'honey_mustard', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Honey Mustard'], es: ['Mostaza con miel'], fr: ['Moutarde au miel'], de: ['Honig-Senf'], zh: ['蜂蜜芥末'], ja: ['ハニーマスタード'] } },
  { id: 'pickle_relish', emoji: '🥒', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Pickle Relish'], es: ['Pepinillos picados'], fr: ['Relish de cornichons'], de: ['Gurkenrelish'], zh: ['酸黄瓜酱'], ja: ['ピクルスレリッシュ'] } },
  { id: 'white_vinegar', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems', names: { en: ['White Vinegar'], es: ['Vinagre blanco'], fr: ['Vinaigre blanc'], de: ['Weißweinessig'], zh: ['白醋'], ja: ['白酢'] } },
  { id: 'apple_cider_vinegar', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems', names: { en: ['Apple Cider Vinegar'], es: ['Vinagre de manzana'], fr: ['Vinaigre de cidre'], de: ['Apfelessig'], zh: ['苹果醋'], ja: ['りんご酢'] } },
  { id: 'balsamic_vinegar', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems', names: { en: ['Balsamic Vinegar'], es: ['Vinagre balsámico'], fr: ['Vinaigre balsamique'], de: ['Balsamessig'], zh: ['意大利黑醋'], ja: ['バルサミコ酢'] } },
  { id: 'tahini', emoji: '🧴', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Tahini','sesame paste'], es: ['Tahini'], fr: ['Tahini'], de: ['Tahini'], zh: ['芝麻酱'], ja: ['タヒニ'] } },
  { id: 'white_sugar', emoji: '🍬', defaultUnit: 'bag', shelfLife: 730, category: 'pantryItems', names: { en: ['White Sugar','sugar'], es: ['Azúcar blanca'], fr: ['Sucre blanc'], de: ['Weißer Zucker'], zh: ['白糖'], ja: ['砂糖'] } },
  { id: 'brown_sugar', emoji: '🍬', defaultUnit: 'bag', shelfLife: 365, category: 'pantryItems', names: { en: ['Brown Sugar'], es: ['Azúcar morena'], fr: ['Cassonade'], de: ['Brauner Zucker'], zh: ['红糖'], ja: ['黒砂糖'] } },
  { id: 'powdered_sugar', emoji: '🍬', defaultUnit: 'bag', shelfLife: 365, category: 'pantryItems', names: { en: ['Powdered Sugar','icing sugar','confectioners sugar'], es: ['Azúcar glas'], fr: ['Sucre glace'], de: ['Puderzucker'], zh: ['糖粉'], ja: ['粉砂糖'] } },
  { id: 'baking_powder', emoji: '🧂', defaultUnit: 'sachet', shelfLife: 365, category: 'pantryItems', names: { en: ['Baking Powder'], es: ['Polvo de hornear'], fr: ['Levure chimique'], de: ['Backpulver'], zh: ['泡打粉'], ja: ['ベーキングパウダー'] } },
  { id: 'baking_soda', emoji: '🧂', defaultUnit: 'sachet', shelfLife: 730, category: 'pantryItems', names: { en: ['Baking Soda','bicarbonate of soda'], es: ['Bicarbonato de sodio'], fr: ['Bicarbonate de soude'], de: ['Natron'], zh: ['小苏打'], ja: ['重曹'] } },
  { id: 'vanilla_extract', emoji: '🫙', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems', names: { en: ['Vanilla Extract'], es: ['Extracto de vainilla'], fr: ['Extrait de vanille'], de: ['Vanilleextrakt'], zh: ['香草精'], ja: ['バニラエッセンス'] } },
  { id: 'cocoa_powder', emoji: '🍫', defaultUnit: 'bag', shelfLife: 365, category: 'pantryItems', names: { en: ['Cocoa Powder','unsweetened cocoa'], es: ['Cacao en polvo'], fr: ['Cacao en poudre'], de: ['Kakaopulver'], zh: ['可可粉'], ja: ['ココアパウダー'] } },
  { id: 'chocolate_chips', emoji: '🍫', defaultUnit: 'bag', shelfLife: 365, category: 'pantryItems', names: { en: ['Chocolate Chips'], es: ['Chispas de chocolate'], fr: ['Pépites de chocolat'], de: ['Schokoladentropfen'], zh: ['巧克力豆'], ja: ['チョコレートチップ'] } },
  { id: 'yeast', emoji: '🌾', defaultUnit: 'sachet', shelfLife: 180, category: 'pantryItems', names: { en: ['Yeast','active dry yeast','instant yeast'], es: ['Levadura'], fr: ['Levure'], de: ['Hefe'], zh: ['酵母'], ja: ['イースト'] } },
  { id: 'almond_flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 180, category: 'pantryItems', names: { en: ['Almond Flour'], es: ['Harina de almendras'], fr: ['Farine d\'amande'], de: ['Mandelmehl'], zh: ['杏仁粉'], ja: ['アーモンドプードル'] } },
  { id: 'cornstarch', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'pantryItems', names: { en: ['Cornstarch','corn flour'], es: ['Maicena','fécula de maíz'], fr: ['Maïzena','fécule de maïs'], de: ['Speisestärke'], zh: ['玉米淀粉'], ja: ['コーンスターチ'] } },
  { id: 'pasta_sauce', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Pasta Sauce','marinara sauce'], es: ['Salsa para pasta'], fr: ['Sauce bolognaise'], de: ['Pastasauce'], zh: ['意面酱'], ja: ['パスタソース'] } },
  { id: 'hoisin_sauce', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Hoisin Sauce'], es: ['Salsa hoisin'], fr: ['Sauce hoisin'], de: ['Hoisin-Sauce'], zh: ['海鲜酱'], ja: ['ホイシンソース'] } },
  { id: 'teriyaki_sauce', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Teriyaki Sauce'], es: ['Salsa teriyaki'], fr: ['Sauce teriyaki'], de: ['Teriyaki-Sauce'], zh: ['照烧酱'], ja: ['照り焼きソース'] } },
  { id: 'mirin', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Mirin'], es: ['Mirin'], fr: ['Mirin'], de: ['Mirin'], zh: ['味淋'], ja: ['みりん'] } },
  { id: 'rice_vinegar', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Rice Vinegar'], es: ['Vinagre de arroz'], fr: ['Vinaigre de riz'], de: ['Reisessig'], zh: ['米醋'], ja: ['米酢'] } },
  { id: 'miso_paste', emoji: '🧴', defaultUnit: 'container', shelfLife: 180, category: 'pantryItems', names: { en: ['Miso Paste','miso'], es: ['Pasta de miso'], fr: ['Pâte miso'], de: ['Misopaste'], zh: ['味噌'], ja: ['味噌'] } },

  // ─── SPICES ──────────────────────────────────────────────────────────────
  { id: 'salt', emoji: '🧂', defaultUnit: 'bag', shelfLife: 730, category: 'spices', names: { en: ['Salt','sea salt','kosher salt'], es: ['Sal'], fr: ['Sel'], de: ['Salz'], zh: ['盐'], ja: ['塩'] } },
  { id: 'black_pepper', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Black Pepper','ground pepper'], es: ['Pimienta negra'], fr: ['Poivre noir'], de: ['Schwarzer Pfeffer'], zh: ['黑胡椒'], ja: ['黒胡椒'] } },
  { id: 'cumin', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Cumin','ground cumin'], es: ['Comino'], fr: ['Cumin'], de: ['Kreuzkümmel'], zh: ['孜然'], ja: ['クミン'] } },
  { id: 'paprika', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Paprika','sweet paprika'], es: ['Pimentón'], fr: ['Paprika'], de: ['Paprikapulver'], zh: ['红椒粉'], ja: ['パプリカ'] } },
  { id: 'smoked_paprika', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Smoked Paprika'], es: ['Pimentón ahumado'], fr: ['Paprika fumé'], de: ['Geräucherter Paprika'], zh: ['烟熏辣椒粉'], ja: ['スモークパプリカ'] } },
  { id: 'cinnamon', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Cinnamon','ground cinnamon'], es: ['Canela'], fr: ['Cannelle'], de: ['Zimt'], zh: ['肉桂'], ja: ['シナモン'] } },
  { id: 'turmeric', emoji: '🟡', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Turmeric','ground turmeric'], es: ['Cúrcuma'], fr: ['Curcuma'], de: ['Kurkuma'], zh: ['姜黄'], ja: ['ターメリック'] } },
  { id: 'oregano', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Oregano','dried oregano'], es: ['Orégano'], fr: ['Origan'], de: ['Oregano'], zh: ['牛至'], ja: ['オレガノ'] } },
  { id: 'basil_spice', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Dried Basil','basil'], es: ['Albahaca'], fr: ['Basilic'], de: ['Basilikum'], zh: ['罗勒'], ja: ['バジル'] } },
  { id: 'thyme', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Thyme','dried thyme'], es: ['Tomillo'], fr: ['Thym'], de: ['Thymian'], zh: ['百里香'], ja: ['タイム'] } },
  { id: 'chili_powder', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Chili Powder','cayenne pepper'], es: ['Chile en polvo'], fr: ['Piment en poudre'], de: ['Chilipulver'], zh: ['辣椒粉'], ja: ['チリパウダー'] } },
  { id: 'garlic_powder', emoji: '🧄', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Garlic Powder'], es: ['Ajo en polvo'], fr: ['Ail en poudre'], de: ['Knoblauchpulver'], zh: ['蒜粉'], ja: ['ガーリックパウダー'] } },
  { id: 'onion_powder', emoji: '🧅', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Onion Powder'], es: ['Cebolla en polvo'], fr: ['Oignon en poudre'], de: ['Zwiebelpulver'], zh: ['洋葱粉'], ja: ['オニオンパウダー'] } },
  { id: 'bay_leaves', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Bay Leaves','bay leaf'], es: ['Hojas de laurel'], fr: ['Feuilles de laurier'], de: ['Lorbeerblätter'], zh: ['月桂叶'], ja: ['ローリエ'] } },
  { id: 'curry_powder', emoji: '🟡', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Curry Powder'], es: ['Curry en polvo'], fr: ['Curry en poudre'], de: ['Currypulver'], zh: ['咖喱粉'], ja: ['カレー粉'] } },
  { id: 'garam_masala', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Garam Masala'], es: ['Garam masala'], fr: ['Garam masala'], de: ['Garam Masala'], zh: ['葛拉姆马萨拉'], ja: ['ガラムマサラ'] } },
  { id: 'rosemary', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Rosemary','dried rosemary'], es: ['Romero'], fr: ['Romarin'], de: ['Rosmarin'], zh: ['迷迭香'], ja: ['ローズマリー'] } },
  { id: 'sage', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Sage','dried sage'], es: ['Salvia'], fr: ['Sauge'], de: ['Salbei'], zh: ['鼠尾草'], ja: ['セージ'] } },
  { id: 'dill', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Dill','dried dill'], es: ['Eneldo'], fr: ['Aneth'], de: ['Dill'], zh: ['莳萝'], ja: ['ディル'] } },
  { id: 'red_pepper_flakes', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Red Pepper Flakes','chili flakes'], es: ['Hojuelas de chile'], fr: ['Flocons de piment'], de: ['Chiliflocken'], zh: ['红辣椒片'], ja: ['唐辛子フレーク'] } },
  { id: 'nutmeg', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Nutmeg','ground nutmeg'], es: ['Nuez moscada'], fr: ['Muscade'], de: ['Muskatnuss'], zh: ['肉豆蔻'], ja: ['ナツメグ'] } },
  { id: 'cardamom', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Cardamom'], es: ['Cardamomo'], fr: ['Cardamome'], de: ['Kardamom'], zh: ['小豆蔻'], ja: ['カルダモン'] } },
  { id: 'coriander', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Coriander','ground coriander'], es: ['Cilantro molido'], fr: ['Coriandre'], de: ['Koriander'], zh: ['香菜粉'], ja: ['コリアンダー'] } },
  { id: 'italian_seasoning', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Italian Seasoning'], es: ['Condimento italiano'], fr: ['Herbes italiennes'], de: ['Italienische Kräuter'], zh: ['意大利混合香料'], ja: ['イタリアンシーズニング'] } },
  { id: 'harissa', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 180, category: 'spices', names: { en: ['Harissa'], es: ['Harissa'], fr: ['Harissa'], de: ['Harissa'], zh: ['哈里萨辣酱'], ja: ['ハリッサ'] } },

  // ─── BEVERAGES ───────────────────────────────────────────────────────────
  { id: 'coffee_beans', emoji: '☕', defaultUnit: 'bag', shelfLife: 180, category: 'beverages', names: { en: ['Coffee Beans','whole bean coffee'], es: ['Granos de café'], fr: ['Grains de café'], de: ['Kaffeebohnen'], zh: ['咖啡豆'], ja: ['コーヒー豆'] } },
  { id: 'ground_coffee', emoji: '☕', defaultUnit: 'bag', shelfLife: 90, category: 'beverages', names: { en: ['Ground Coffee','coffee'], es: ['Café molido'], fr: ['Café moulu'], de: ['Gemahlener Kaffee'], zh: ['咖啡粉'], ja: ['コーヒー粉'] } },
  { id: 'green_tea', emoji: '🍵', defaultUnit: 'box', shelfLife: 365, category: 'beverages', names: { en: ['Green Tea'], es: ['Té verde'], fr: ['Thé vert'], de: ['Grüner Tee'], zh: ['绿茶'], ja: ['緑茶'] } },
  { id: 'black_tea', emoji: '🍵', defaultUnit: 'box', shelfLife: 365, category: 'beverages', names: { en: ['Black Tea','tea'], es: ['Té negro'], fr: ['Thé noir'], de: ['Schwarzer Tee'], zh: ['红茶'], ja: ['紅茶'] } },
  { id: 'herbal_tea', emoji: '🍵', defaultUnit: 'box', shelfLife: 365, category: 'beverages', names: { en: ['Herbal Tea','chamomile tea'], es: ['Té de hierbas'], fr: ['Tisane'], de: ['Kräutertee'], zh: ['草药茶'], ja: ['ハーブティー'] } },
  { id: 'orange_juice', emoji: '🍊', defaultUnit: 'carton', shelfLife: 7, category: 'beverages', names: { en: ['Orange Juice','OJ'], es: ['Jugo de naranja'], fr: ['Jus d\'orange'], de: ['Orangensaft'], zh: ['橙汁'], ja: ['オレンジジュース'] } },
  { id: 'apple_juice', emoji: '🍎', defaultUnit: 'carton', shelfLife: 14, category: 'beverages', names: { en: ['Apple Juice'], es: ['Jugo de manzana'], fr: ['Jus de pomme'], de: ['Apfelsaft'], zh: ['苹果汁'], ja: ['アップルジュース'] } },
  { id: 'sparkling_water', emoji: '💧', defaultUnit: 'bottle', shelfLife: 365, category: 'beverages', names: { en: ['Sparkling Water','soda water'], es: ['Agua con gas'], fr: ['Eau gazeuse'], de: ['Sprudelwasser'], zh: ['苏打水'], ja: ['炭酸水'] } },
  { id: 'red_wine', emoji: '🍷', defaultUnit: 'bottle', shelfLife: 365, category: 'beverages', names: { en: ['Red Wine','merlot'], es: ['Vino tinto'], fr: ['Vin rouge'], de: ['Rotwein'], zh: ['红葡萄酒'], ja: ['赤ワイン'] } },
  { id: 'white_wine', emoji: '🥂', defaultUnit: 'bottle', shelfLife: 365, category: 'beverages', names: { en: ['White Wine','chardonnay'], es: ['Vino blanco'], fr: ['Vin blanc'], de: ['Weißwein'], zh: ['白葡萄酒'], ja: ['白ワイン'] } },
  { id: 'beer', emoji: '🍺', defaultUnit: 'pack', shelfLife: 180, category: 'beverages', names: { en: ['Beer'], es: ['Cerveza'], fr: ['Bière'], de: ['Bier'], zh: ['啤酒'], ja: ['ビール'] } },
  { id: 'kombucha', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 30, category: 'beverages', names: { en: ['Kombucha'], es: ['Kombucha'], fr: ['Kombucha'], de: ['Kombucha'], zh: ['康普茶'], ja: ['コンブチャ'] } },
  { id: 'coconut_water', emoji: '🥥', defaultUnit: 'carton', shelfLife: 14, category: 'beverages', names: { en: ['Coconut Water'], es: ['Agua de coco'], fr: ['Eau de coco'], de: ['Kokoswasser'], zh: ['椰子水'], ja: ['ココナッツウォーター'] } },
  { id: 'lemonade', emoji: '🍋', defaultUnit: 'carton', shelfLife: 14, category: 'beverages', names: { en: ['Lemonade'], es: ['Limonada'], fr: ['Limonade'], de: ['Limonade'], zh: ['柠檬水'], ja: ['レモネード'] } },
  { id: 'tomato_juice', emoji: '🍅', defaultUnit: 'carton', shelfLife: 14, category: 'beverages', names: { en: ['Tomato Juice'], es: ['Jugo de tomate'], fr: ['Jus de tomate'], de: ['Tomatensaft'], zh: ['番茄汁'], ja: ['トマトジュース'] } },
  { id: 'sports_drink', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 180, category: 'beverages', names: { en: ['Sports Drink'], es: ['Bebida deportiva'], fr: ['Boisson sportive'], de: ['Sportgetränk'], zh: ['运动饮料'], ja: ['スポーツドリンク'] } },
  { id: 'energy_drink', emoji: '⚡', defaultUnit: 'can', shelfLife: 180, category: 'beverages', names: { en: ['Energy Drink'], es: ['Bebida energética'], fr: ['Boisson énergisante'], de: ['Energydrink'], zh: ['能量饮料'], ja: ['エナジードリンク'] } },

  // ─── FROZEN ──────────────────────────────────────────────────────────────
  { id: 'frozen_peas', emoji: '🫛', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Peas'], es: ['Guisantes congelados'], fr: ['Petits pois surgelés'], de: ['Tiefkühlerbsen'], zh: ['速冻豌豆'], ja: ['冷凍グリーンピース'] } },
  { id: 'frozen_corn', emoji: '🌽', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Corn'], es: ['Maíz congelado'], fr: ['Maïs surgelé'], de: ['Tiefkühlmais'], zh: ['速冻玉米'], ja: ['冷凍コーン'] } },
  { id: 'frozen_berries', emoji: '🫐', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Mixed Berries','frozen berries'], es: ['Frutas del bosque congeladas'], fr: ['Fruits rouges surgelés'], de: ['Tiefkühlbeeren'], zh: ['速冻浆果'], ja: ['冷凍ベリーミックス'] } },
  { id: 'frozen_spinach', emoji: '🥬', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Spinach'], es: ['Espinacas congeladas'], fr: ['Épinards surgelés'], de: ['Tiefkühlspinat'], zh: ['速冻菠菜'], ja: ['冷凍ほうれん草'] } },
  { id: 'frozen_broccoli', emoji: '🥦', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Broccoli'], es: ['Brócoli congelado'], fr: ['Brocoli surgelé'], de: ['Tiefkühlbrokkoli'], zh: ['速冻西兰花'], ja: ['冷凍ブロッコリー'] } },
  { id: 'ice_cream', emoji: '🍦', defaultUnit: 'container', shelfLife: 180, category: 'frozen', names: { en: ['Ice Cream','vanilla ice cream'], es: ['Helado'], fr: ['Glace'], de: ['Eiscreme'], zh: ['冰淇淋'], ja: ['アイスクリーム'] } },
  { id: 'frozen_edamame', emoji: '🫛', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Edamame'], es: ['Edamame congelado'], fr: ['Edamame surgelé'], de: ['Tiefkühledamame'], zh: ['速冻毛豆'], ja: ['冷凍枝豆'] } },
  { id: 'frozen_shrimp', emoji: '🦐', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Shrimp'], es: ['Camarones congelados'], fr: ['Crevettes surgelées'], de: ['Tiefkühlgarnelen'], zh: ['速冻虾'], ja: ['冷凍エビ'] } },
  { id: 'frozen_pizza', emoji: '🍕', defaultUnit: 'pieces', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Pizza'], es: ['Pizza congelada'], fr: ['Pizza surgelée'], de: ['Tiefkühlpizza'], zh: ['速冻比萨'], ja: ['冷凍ピザ'] } },
  { id: 'frozen_waffles', emoji: '🧇', defaultUnit: 'pack', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Waffles'], es: ['Waffles congelados'], fr: ['Gaufres surgelées'], de: ['Tiefkühlwaffeln'], zh: ['速冻华夫饼'], ja: ['冷凍ワッフル'] } },
  { id: 'frozen_dumplings', emoji: '🥟', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Dumplings','gyoza'], es: ['Dumplings congelados'], fr: ['Raviolis surgelés'], de: ['Tiefkühlknödel'], zh: ['速冻饺子'], ja: ['冷凍餃子'] } },
  { id: 'frozen_fish_fillets', emoji: '🐟', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Fish Fillets'], es: ['Filetes de pescado congelados'], fr: ['Filets de poisson surgelés'], de: ['Tiefkühlfischfilets'], zh: ['速冻鱼片'], ja: ['冷凍魚フィレ'] } },
  { id: 'frozen_mango', emoji: '🥭', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Mango','frozen mango chunks'], es: ['Mango congelado'], fr: ['Mangue surgelée'], de: ['Tiefkühlmango'], zh: ['速冻芒果'], ja: ['冷凍マンゴー'] } },

  // ─── SNACKS ──────────────────────────────────────────────────────────────
  { id: 'potato_chips', emoji: '🍟', defaultUnit: 'bag', shelfLife: 60, category: 'snacks', names: { en: ['Potato Chips','crisps'], es: ['Papas fritas'], fr: ['Chips'], de: ['Kartoffelchips'], zh: ['薯片'], ja: ['ポテトチップス'] } },
  { id: 'tortilla_chips', emoji: '🍟', defaultUnit: 'bag', shelfLife: 60, category: 'snacks', names: { en: ['Tortilla Chips','nachos'], es: ['Totopos','chips de tortilla'], fr: ['Chips de tortilla'], de: ['Tortillachips'], zh: ['玉米片'], ja: ['トルティーヤチップス'] } },
  { id: 'crackers', emoji: '🍘', defaultUnit: 'box', shelfLife: 90, category: 'snacks', names: { en: ['Crackers','saltine crackers'], es: ['Galletas saladas'], fr: ['Crackers'], de: ['Cracker'], zh: ['饼干'], ja: ['クラッカー'] } },
  { id: 'graham_crackers', emoji: '🍪', defaultUnit: 'box', shelfLife: 90, category: 'snacks', names: { en: ['Graham Crackers'], es: ['Galletas graham'], fr: ['Biscuits Graham'], de: ['Graham-Kekse'], zh: ['全麦夹心饼干'], ja: ['グラハムクラッカー'] } },
  { id: 'marshmallows', emoji: '🍬', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Marshmallows'], es: ['Malvaviscos'], fr: ['Guimauves'], de: ['Marshmallows'], zh: ['棉花糖'], ja: ['マシュマロ'] } },
  { id: 'almonds', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Almonds'], es: ['Almendras'], fr: ['Amandes'], de: ['Mandeln'], zh: ['杏仁'], ja: ['アーモンド'] } },
  { id: 'cashews', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Cashews','cashew nuts'], es: ['Anacardos'], fr: ['Noix de cajou'], de: ['Cashews'], zh: ['腰果'], ja: ['カシューナッツ'] } },
  { id: 'walnuts', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Walnuts'], es: ['Nueces'], fr: ['Noix'], de: ['Walnüsse'], zh: ['核桃'], ja: ['くるみ'] } },
  { id: 'mixed_nuts', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Mixed Nuts'], es: ['Nueces mixtas'], fr: ['Noix mélangées'], de: ['Gemischte Nüsse'], zh: ['什锦坚果'], ja: ['ミックスナッツ'] } },
  { id: 'peanuts', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Peanuts'], es: ['Cacahuates','maní'], fr: ['Cacahuètes'], de: ['Erdnüsse'], zh: ['花生'], ja: ['ピーナッツ'] } },
  { id: 'popcorn', emoji: '🍿', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Popcorn','microwave popcorn'], es: ['Palomitas'], fr: ['Popcorn'], de: ['Popcorn'], zh: ['爆米花'], ja: ['ポップコーン'] } },
  { id: 'dark_chocolate', emoji: '🍫', defaultUnit: 'bar', shelfLife: 180, category: 'snacks', names: { en: ['Dark Chocolate'], es: ['Chocolate negro'], fr: ['Chocolat noir'], de: ['Zartbitterschokolade'], zh: ['黑巧克力'], ja: ['ダークチョコレート'] } },
  { id: 'milk_chocolate', emoji: '🍫', defaultUnit: 'bar', shelfLife: 180, category: 'snacks', names: { en: ['Milk Chocolate'], es: ['Chocolate con leche'], fr: ['Chocolat au lait'], de: ['Milchschokolade'], zh: ['牛奶巧克力'], ja: ['ミルクチョコレート'] } },
  { id: 'granola_bar', emoji: '🌾', defaultUnit: 'bar', shelfLife: 90, category: 'snacks', names: { en: ['Granola Bar','energy bar'], es: ['Barra de granola'], fr: ['Barre de céréales'], de: ['Müsliriegel'], zh: ['格兰诺拉棒'], ja: ['グラノーラバー'] } },
  { id: 'rice_cakes', emoji: '🍘', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Rice Cakes'], es: ['Galletas de arroz'], fr: ['Galettes de riz'], de: ['Reiswaffeln'], zh: ['米饼'], ja: ['ライスケーキ'] } },
  { id: 'pretzels', emoji: '🥨', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Pretzels'], es: ['Pretzels'], fr: ['Bretzels'], de: ['Brezeln'], zh: ['椒盐卷饼'], ja: ['プレッツェル'] } },
  { id: 'hummus', emoji: '🫘', defaultUnit: 'container', shelfLife: 14, category: 'snacks', names: { en: ['Hummus'], es: ['Hummus'], fr: ['Houmous'], de: ['Hummus'], zh: ['鹰嘴豆泥'], ja: ['フムス'] } },
  { id: 'guacamole', emoji: '🥑', defaultUnit: 'container', shelfLife: 5, category: 'snacks', names: { en: ['Guacamole'], es: ['Guacamole'], fr: ['Guacamole'], de: ['Guacamole'], zh: ['鳄梨酱'], ja: ['グアカモーレ'] } },
  { id: 'salsa', emoji: '🍅', defaultUnit: 'jar', shelfLife: 14, category: 'snacks', names: { en: ['Salsa','tomato salsa'], es: ['Salsa'], fr: ['Salsa'], de: ['Salsa'], zh: ['萨尔萨酱'], ja: ['サルサ'] } },

  // ─── BAKERY ──────────────────────────────────────────────────────────────
  { id: 'croissant', emoji: '🥐', defaultUnit: 'pieces', shelfLife: 3, category: 'bakery', names: { en: ['Croissant'], es: ['Croissant','media luna'], fr: ['Croissant'], de: ['Croissant'], zh: ['牛角包'], ja: ['クロワッサン'] } },
  { id: 'muffin', emoji: '🧁', defaultUnit: 'pack', shelfLife: 5, category: 'bakery', names: { en: ['Muffins','muffin'], es: ['Magdalenas'], fr: ['Muffins'], de: ['Muffins'], zh: ['松饼'], ja: ['マフィン'] } },
  { id: 'baguette', emoji: '🥖', defaultUnit: 'pieces', shelfLife: 2, category: 'bakery', names: { en: ['Baguette','french bread'], es: ['Baguette'], fr: ['Baguette'], de: ['Baguette'], zh: ['法棍'], ja: ['バゲット'] } },
  { id: 'dinner_rolls', emoji: '🍞', defaultUnit: 'pack', shelfLife: 5, category: 'bakery', names: { en: ['Dinner Rolls','rolls'], es: ['Panecillos'], fr: ['Petits pains'], de: ['Brötchen'], zh: ['小圆面包'], ja: ['ディナーロール'] } },
  { id: 'english_muffin', emoji: '🫓', defaultUnit: 'pack', shelfLife: 7, category: 'bakery', names: { en: ['English Muffins','english muffin'], es: ['Muffins ingleses'], fr: ['Muffins anglais'], de: ['Englische Muffins'], zh: ['英式玛芬'], ja: ['イングリッシュマフィン'] } },
  { id: 'hamburger_buns', emoji: '🍔', defaultUnit: 'pack', shelfLife: 7, category: 'bakery', names: { en: ['Hamburger Buns','burger buns'], es: ['Panes para hamburguesa'], fr: ['Pains à hamburger'], de: ['Hamburgerbrötchen'], zh: ['汉堡包'], ja: ['バーガーバンズ'] } },
  { id: 'hot_dog_buns', emoji: '🌭', defaultUnit: 'pack', shelfLife: 7, category: 'bakery', names: { en: ['Hot Dog Buns'], es: ['Panes para hot dog'], fr: ['Pains à hot dog'], de: ['Hotdog-Brötchen'], zh: ['热狗面包'], ja: ['ホットドッグバンズ'] } },
  { id: 'cinnamon_roll', emoji: '🌀', defaultUnit: 'pack', shelfLife: 5, category: 'bakery', names: { en: ['Cinnamon Rolls','cinnamon roll'], es: ['Rollos de canela'], fr: ['Roulés à la cannelle'], de: ['Zimtschnecken'], zh: ['肉桂卷'], ja: ['シナモンロール'] } },
  { id: 'donut', emoji: '🍩', defaultUnit: 'pieces', shelfLife: 2, category: 'bakery', names: { en: ['Donuts','donut','doughnut'], es: ['Donas','rosquillas'], fr: ['Beignets','donuts'], de: ['Donuts'], zh: ['甜甜圈'], ja: ['ドーナツ'] } },
  { id: 'cookie', emoji: '🍪', defaultUnit: 'pack', shelfLife: 7, category: 'bakery', names: { en: ['Cookies','cookie'], es: ['Galletas'], fr: ['Biscuits'], de: ['Kekse'], zh: ['饼干','曲奇'], ja: ['クッキー'] } },
  { id: 'tortillas', emoji: '🫓', defaultUnit: 'pack', shelfLife: 14, category: 'bakery', names: { en: ['Tortillas','flour tortillas','corn tortillas'], es: ['Tortillas'], fr: ['Tortillas'], de: ['Tortillas'], zh: ['墨西哥薄饼'], ja: ['トルティーヤ'] } },
  { id: 'pita', emoji: '🫓', defaultUnit: 'pack', shelfLife: 7, category: 'bakery', names: { en: ['Pita Bread','pita'], es: ['Pan pita'], fr: ['Pain pita'], de: ['Fladenbrot'], zh: ['口袋饼'], ja: ['ピタパン'] } },
  { id: 'bagel', emoji: '🥯', defaultUnit: 'pack', shelfLife: 5, category: 'bakery', names: { en: ['Bagels','bagel'], es: ['Bagels'], fr: ['Bagels'], de: ['Bagels'], zh: ['百吉饼'], ja: ['ベーグル'] } },

  // ─── DAIRY ALTERNATIVES ───────────────────────────────────────────────────
  { id: 'soy_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Soy Milk'], es: ['Leche de soja'], fr: ['Lait de soja'], de: ['Sojamilch'], zh: ['豆奶'], ja: ['豆乳'] } },
  { id: 'rice_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Rice Milk'], es: ['Leche de arroz'], fr: ['Lait de riz'], de: ['Reismilch'], zh: ['米奶'], ja: ['ライスミルク'] } },
  { id: 'goat_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Goat Milk'], es: ['Leche de cabra'], fr: ['Lait de chèvre'], de: ['Ziegenmilch'], zh: ['山羊奶'], ja: ['ヤギミルク'] } },
  { id: 'ghee', emoji: '🧈', defaultUnit: 'jar', shelfLife: 365, category: 'dairy', names: { en: ['Ghee'], es: ['Ghee'], fr: ['Ghee'], de: ['Ghee'], zh: ['酥油'], ja: ['ギー'] } },

  // ─── PRODUCE — MORE ───────────────────────────────────────────────────────
  { id: 'pumpkin', emoji: '🎃', defaultUnit: 'pieces', shelfLife: 30, category: 'produce', names: { en: ['Pumpkin'], es: ['Calabaza'], fr: ['Citrouille'], de: ['Kürbis'], zh: ['南瓜'], ja: ['かぼちゃ'] } },
  { id: 'plantain', emoji: '🍌', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Plantain'], es: ['Plátano macho'], fr: ['Plantain'], de: ['Kochbanane'], zh: ['大蕉'], ja: ['プランテン'] } },
  { id: 'okra', emoji: '🥒', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Okra'], es: ['Okra'], fr: ['Gombo'], de: ['Okra'], zh: ['秋葵'], ja: ['オクラ'] } },
  { id: 'rutabaga', emoji: '🥔', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Rutabaga'], es: ['Nabo sueco'], fr: ['Chou-navet'], de: ['Steckrübe'], zh: ['瑞典萝卜'], ja: ['ルタバガ'] } },
  { id: 'parsnip', emoji: '🥕', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Parsnip'], es: ['Chirivía'], fr: ['Panais'], de: ['Pastinake'], zh: ['欧洲防风'], ja: ['パースニップ'] } },
  { id: 'kohlrabi', emoji: '🥬', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Kohlrabi'], es: ['Colinabo'], fr: ['Chou-rave'], de: ['Kohlrabi'], zh: ['球芽甘蓝'], ja: ['コールラビ'] } },
  { id: 'watercress', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Watercress'], es: ['Berros'], fr: ['Cresson'], de: ['Kresse'], zh: ['西洋菜'], ja: ['クレソン'] } },
  { id: 'arugula', emoji: '🥬', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Arugula','rocket'], es: ['Rúcula'], fr: ['Roquette'], de: ['Rucola'], zh: ['芝麻菜'], ja: ['ルッコラ'] } },
  { id: 'radicchio', emoji: '🥬', defaultUnit: 'head', shelfLife: 10, category: 'produce', names: { en: ['Radicchio'], es: ['Radicchio'], fr: ['Radicchio'], de: ['Radicchio'], zh: ['红菊苣'], ja: ['ラディッキオ'] } },
  { id: 'persimmon', emoji: '🍊', defaultUnit: 'pieces', shelfLife: 10, category: 'produce', names: { en: ['Persimmon'], es: ['Caqui'], fr: ['Kaki'], de: ['Kaki'], zh: ['柿子'], ja: ['柿'] } },
  { id: 'fig', emoji: '🍈', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Fig','figs'], es: ['Higo','higos'], fr: ['Figue','figues'], de: ['Feige','Feigen'], zh: ['无花果'], ja: ['いちじく'] } },
  { id: 'date', emoji: '🌴', defaultUnit: 'pack', shelfLife: 180, category: 'produce', names: { en: ['Dates'], es: ['Dátiles'], fr: ['Dattes'], de: ['Datteln'], zh: ['枣'], ja: ['デーツ'] } },
  { id: 'lychee', emoji: '🍒', defaultUnit: 'bag', shelfLife: 7, category: 'produce', names: { en: ['Lychee'], es: ['Lichi'], fr: ['Litchi'], de: ['Litschi'], zh: ['荔枝'], ja: ['ライチ'] } },
  { id: 'guava', emoji: '🥭', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Guava'], es: ['Guayaba'], fr: ['Goyave'], de: ['Guave'], zh: ['番石榴'], ja: ['グアバ'] } },
  { id: 'jackfruit', emoji: '🍈', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Jackfruit'], es: ['Jaca'], fr: ['Jacquier'], de: ['Jackfrucht'], zh: ['菠萝蜜'], ja: ['ジャックフルーツ'] } },

  // ─── PROTEIN ──────────────────────────────────────────────────────────────
  { id: 'tofu', emoji: '🫘', defaultUnit: 'lbs', shelfLife: 14, category: 'pantryItems', names: { en: ['Tofu'], es: ['Tofu'], fr: ['Tofu'], de: ['Tofu'], zh: ['豆腐'], ja: ['豆腐'] } },
  { id: 'tempeh', emoji: '🫘', defaultUnit: 'pack', shelfLife: 14, category: 'pantryItems', names: { en: ['Tempeh'], es: ['Tempeh'], fr: ['Tempeh'], de: ['Tempeh'], zh: ['天贝'], ja: ['テンペ'] } },
  { id: 'seitan', emoji: '🍖', defaultUnit: 'pack', shelfLife: 14, category: 'pantryItems', names: { en: ['Seitan'], es: ['Seitán'], fr: ['Seitan'], de: ['Seitan'], zh: ['面筋'], ja: ['セイタン'] } },
  { id: 'duck', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Duck'], es: ['Pato'], fr: ['Canard'], de: ['Ente'], zh: ['鸭肉'], ja: ['鴨肉'] } },
  { id: 'venison', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Venison'], es: ['Venado'], fr: ['Venaison'], de: ['Wildfleisch'], zh: ['鹿肉'], ja: ['鹿肉'] } },
  { id: 'chorizo', emoji: '🥩', defaultUnit: 'pack', shelfLife: 14, category: 'meat', names: { en: ['Chorizo'], es: ['Chorizo'], fr: ['Chorizo'], de: ['Chorizo'], zh: ['西班牙辣香肠'], ja: ['チョリソー'] } },
  { id: 'prosciutto', emoji: '🥓', defaultUnit: 'pack', shelfLife: 14, category: 'meat', names: { en: ['Prosciutto'], es: ['Prosciutto'], fr: ['Prosciutto'], de: ['Prosciutto'], zh: ['意大利熏火腿'], ja: ['プロシュート'] } },

  // ─── CANNED & PACKAGED ───────────────────────────────────────────────────
  { id: 'tomato_sauce', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Tomato Sauce'], es: ['Salsa de tomate'], fr: ['Sauce tomate'], de: ['Tomatensauce'], zh: ['番茄酱'], ja: ['トマトソース'] } },
  { id: 'marinara_sauce', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Marinara Sauce'], es: ['Salsa marinara'], fr: ['Sauce marinara'], de: ['Marinarasauce'], zh: ['马里纳拉酱'], ja: ['マリナーラソース'] } },
  { id: 'apple_sauce', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Apple Sauce'], es: ['Puré de manzana'], fr: ['Compote de pomme'], de: ['Apfelmus'], zh: ['苹果酱'], ja: ['アップルソース'] } },
  { id: 'canned_pineapple', emoji: '🍍', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Pineapple'], es: ['Piña enlatada'], fr: ['Ananas en conserve'], de: ['Ananas in Dosen'], zh: ['菠萝罐头'], ja: ['缶詰パイナップル'] } },
  { id: 'canned_peaches', emoji: '🍑', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Peaches'], es: ['Duraznos enlatados'], fr: ['Pêches en conserve'], de: ['Pfirsiche in Dosen'], zh: ['桃子罐头'], ja: ['缶詰ピーチ'] } },
  { id: 'canned_black_olives', emoji: '🫒', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Black Olives'], es: ['Aceitunas negras en lata'], fr: ['Olives noires en conserve'], de: ['Schwarze Oliven in Dose'], zh: ['黑橄榄罐头'], ja: ['缶詰ブラックオリーブ'] } },
  { id: 'canned_mushrooms', emoji: '🍄', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Mushrooms'], es: ['Champiñones en lata'], fr: ['Champignons en conserve'], de: ['Pilze in Dose'], zh: ['蘑菇罐头'], ja: ['缶詰マッシュルーム'] } },
  { id: 'canned_refried_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Refried Beans'], es: ['Frijoles refritos'], fr: ['Haricots frits'], de: ['Refried Beans'], zh: ['回锅豆'], ja: ['リフライドビーンズ'] } },
  { id: 'almond_butter', emoji: '🥜', defaultUnit: 'jar', shelfLife: 360, category: 'pantryItems', names: { en: ['Almond Butter'], es: ['Mantequilla de almendra'], fr: ['Beurre d\'amande'], de: ['Mandelbutter'], zh: ['杏仁酱'], ja: ['アーモンドバター'] } },
  { id: 'sunflower_seed_butter', emoji: '🌻', defaultUnit: 'jar', shelfLife: 360, category: 'pantryItems', names: { en: ['Sunflower Seed Butter'], es: ['Mantequilla de semillas de girasol'], fr: ['Beurre de graines de tournesol'], de: ['Sonnenblumenkernbutter'], zh: ['葵花籽酱'], ja: ['ひまわりの種バター'] } },

  // ─── GRAINS — MORE ───────────────────────────────────────────────────────
  { id: 'buckwheat', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Buckwheat'], es: ['Alforfón'], fr: ['Sarrasin'], de: ['Buchweizen'], zh: ['荞麦'], ja: ['そば'] } },
  { id: 'millet', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Millet'], es: ['Mijo'], fr: ['Millet'], de: ['Hirse'], zh: ['小米'], ja: ['キビ'] } },
  { id: 'amaranth', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Amaranth'], es: ['Amaranto'], fr: ['Amarante'], de: ['Amarant'], zh: ['苋菜籽'], ja: ['アマランサス'] } },
  { id: 'semolina', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Semolina'], es: ['Sémola'], fr: ['Semoule'], de: ['Grieß'], zh: ['粗粒小麦粉'], ja: ['セモリナ'] } },
  { id: 'sorghum', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Sorghum'], es: ['Sorgo'], fr: ['Sorgho'], de: ['Sorghum'], zh: ['高粱'], ja: ['ソルガム'] } },
  { id: 'soba_noodles', emoji: '🍜', defaultUnit: 'pack', shelfLife: 365, category: 'grains', names: { en: ['Soba Noodles'], es: ['Fideos soba'], fr: ['Nouilles soba'], de: ['Soba-Nudeln'], zh: ['荞麦面'], ja: ['そば'] } },
  { id: 'rice_noodles', emoji: '🍜', defaultUnit: 'pack', shelfLife: 365, category: 'grains', names: { en: ['Rice Noodles'], es: ['Fideos de arroz'], fr: ['Nouilles de riz'], de: ['Reisnudeln'], zh: ['米粉'], ja: ['ライスヌードル'] } },
  { id: 'udon_noodles', emoji: '🍜', defaultUnit: 'pack', shelfLife: 365, category: 'grains', names: { en: ['Udon Noodles'], es: ['Fideos udon'], fr: ['Nouilles udon'], de: ['Udon-Nudeln'], zh: ['乌冬面'], ja: ['うどん'] } },
  { id: 'ramen_noodles', emoji: '🍜', defaultUnit: 'pack', shelfLife: 365, category: 'grains', names: { en: ['Ramen Noodles'], es: ['Fideos ramen'], fr: ['Nouilles ramen'], de: ['Ramen-Nudeln'], zh: ['拉面'], ja: ['ラーメン'] } },

  // ─── SPICES — MORE ───────────────────────────────────────────────────────
  { id: 'sesame_seeds', emoji: '🌱', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Sesame Seeds'], es: ['Semillas de sésamo'], fr: ['Graines de sésame'], de: ['Sesamsamen'], zh: ['芝麻'], ja: ['ごま'] } },
  { id: 'mustard_seeds', emoji: '🌱', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Mustard Seeds'], es: ['Semillas de mostaza'], fr: ['Graines de moutarde'], de: ['Senfsamen'], zh: ['芥末籽'], ja: ['マスタードシード'] } },
  { id: 'saffron', emoji: '🌾', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Saffron'], es: ['Azafrán'], fr: ['Safran'], de: ['Safran'], zh: ['藏红花'], ja: ['サフラン'] } },
  { id: 'star_anise', emoji: '🌟', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Star Anise'], es: ['Anís estrellado'], fr: ['Badiane'], de: ['Sternanis'], zh: ['八角'], ja: ['八角'] } },
  { id: 'clove', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Cloves','clove'], es: ['Clavo de olor'], fr: ['Clous de girofle'], de: ['Nelken'], zh: ['丁香'], ja: ['クローブ'] } },
  { id: 'ground_ginger', emoji: '🫚', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Ground Ginger'], es: ['Jengibre molido'], fr: ['Gingembre moulu'], de: ['Gemahlener Ingwer'], zh: ['姜粉'], ja: ['生姜粉'] } },

  // ─── BEVERAGES — MORE ───────────────────────────────────────────────────
  { id: 'chai_tea', emoji: '🍵', defaultUnit: 'box', shelfLife: 365, category: 'beverages', names: { en: ['Chai Tea'], es: ['Té chai'], fr: ['Thé chai'], de: ['Chai-Tee'], zh: ['柴茶'], ja: ['チャイティー'] } },
  { id: 'matcha', emoji: '🍵', defaultUnit: 'tin', shelfLife: 365, category: 'beverages', names: { en: ['Matcha'], es: ['Matcha'], fr: ['Matcha'], de: ['Matcha'], zh: ['抹茶'], ja: ['抹茶'] } },
  { id: 'iced_tea', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 30, category: 'beverages', names: { en: ['Iced Tea'], es: ['Té helado'], fr: ['Thé glacé'], de: ['Eistee'], zh: ['冰茶'], ja: ['アイスティー'] } },
  { id: 'apple_cider', emoji: '🍎', defaultUnit: 'bottle', shelfLife: 30, category: 'beverages', names: { en: ['Apple Cider'], es: ['Sidra de manzana'], fr: ['Cidre de pomme'], de: ['Apfelwein'], zh: ['苹果酒'], ja: ['アップルサイダー'] } },
  { id: 'ginger_ale', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 180, category: 'beverages', names: { en: ['Ginger Ale'], es: ['Ginger Ale'], fr: ['Ginger Ale'], de: ['Ginger Ale'], zh: ['姜汁汽水'], ja: ['ジンジャーエール'] } },
  { id: 'cola', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 180, category: 'beverages', names: { en: ['Cola'], es: ['Cola'], fr: ['Cola'], de: ['Cola'], zh: ['可乐'], ja: ['コーラ'] } },

  // ─── FROZEN — MORE ───────────────────────────────────────────────────────
  { id: 'frozen_french_fries', emoji: '🍟', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen French Fries'], es: ['Papas fritas congeladas'], fr: ['Frites surgelées'], de: ['Tiefkühlpommes'], zh: ['冷冻薯条'], ja: ['冷凍フライドポテト'] } },
  { id: 'frozen_burritos', emoji: '🌯', defaultUnit: 'pack', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Burritos'], es: ['Burritos congelados'], fr: ['Burritos surgelés'], de: ['Tiefkühlburritos'], zh: ['冷冻卷饼'], ja: ['冷凍ブリトー'] } },
  { id: 'frozen_hash_browns', emoji: '🥔', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Hash Browns'], es: ['Hash Browns congelados'], fr: ['Pommes de terre rissolées surgelées'], de: ['Tiefkühl-Hashbrowns'], zh: ['冷冻薯饼'], ja: ['冷凍ハッシュブラウン'] } },
  { id: 'ice_pops', emoji: '🍧', defaultUnit: 'box', shelfLife: 180, category: 'frozen', names: { en: ['Ice Pops','popsicles'], es: ['Popsicles'], fr: ['Sucettes glacées'], de: ['Eis am Stiel'], zh: ['冰棒'], ja: ['アイスポップ'] } },
  { id: 'frozen_pancakes', emoji: '🥞', defaultUnit: 'pack', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Pancakes'], es: ['Pancakes congelados'], fr: ['Pancakes surgelés'], de: ['Tiefkühlpfannkuchen'], zh: ['冷冻煎饼'], ja: ['冷凍パンケーキ'] } },
  { id: 'frozen_vegetables_mix', emoji: '🥦', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Vegetable Mix'], es: ['Mezcla de verduras congeladas'], fr: ['Mélange de légumes surgelés'], de: ['Tiefkühlgemüsemix'], zh: ['冷冻蔬菜混合'], ja: ['冷凍野菜ミックス'] } },
  { id: 'frozen_yogurt', emoji: '🍦', defaultUnit: 'container', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Yogurt'], es: ['Yogur congelado'], fr: ['Yaourt glacé'], de: ['Frozen Yogurt'], zh: ['冷冻酸奶'], ja: ['フローズンヨーグルト'] } },

  // ─── SNACKS — MORE ───────────────────────────────────────────────────────
  { id: 'beef_jerky', emoji: '🥩', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Beef Jerky'], es: ['Carne seca'], fr: ['Bœuf séché'], de: ['Beef Jerky'], zh: ['牛肉干'], ja: ['ビーフジャーキー'] } },
  { id: 'trail_mix', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Trail Mix'], es: ['Mezcla de frutos secos'], fr: ['Mélange de randonnée'], de: ['Wander-Mix'], zh: ['果干混合坚果'], ja: ['トレイルミックス'] } },
  { id: 'protein_bar', emoji: '🍫', defaultUnit: 'bar', shelfLife: 180, category: 'snacks', names: { en: ['Protein Bar'], es: ['Barra de proteínas'], fr: ['Barre protéinée'], de: ['Proteinriegel'], zh: ['蛋白棒'], ja: ['プロテインバー'] } },
  { id: 'seaweed_snacks', emoji: '🌿', defaultUnit: 'pack', shelfLife: 90, category: 'snacks', names: { en: ['Seaweed Snacks'], es: ['Aperitivos de alga marina'], fr: ['Snacks d\'algues'], de: ['Algen-Snacks'], zh: ['海苔零食'], ja: ['海苔スナック'] } },
  { id: 'dried_apricots', emoji: '🍑', defaultUnit: 'pack', shelfLife: 180, category: 'snacks', names: { en: ['Dried Apricots'], es: ['Albaricoques secos'], fr: ['Abricots secs'], de: ['Getrocknete Aprikosen'], zh: ['干杏'], ja: ['ドライアプリコット'] } },
  { id: 'dried_mango', emoji: '🥭', defaultUnit: 'pack', shelfLife: 180, category: 'snacks', names: { en: ['Dried Mango'], es: ['Mango seco'], fr: ['Mangue séchée'], de: ['Getrocknete Mango'], zh: ['干芒果'], ja: ['ドライマンゴー'] } },

  // ─── BAKERY — MORE ───────────────────────────────────────────────────────
  { id: 'banana_bread', emoji: '🍌', defaultUnit: 'loaf', shelfLife: 5, category: 'bakery', names: { en: ['Banana Bread'], es: ['Pan de plátano'], fr: ['Pain à la banane'], de: ['Bananenbrot'], zh: ['香蕉面包'], ja: ['バナナブレッド'] } },
  { id: 'ciabatta', emoji: '🥖', defaultUnit: 'loaf', shelfLife: 3, category: 'bakery', names: { en: ['Ciabatta'], es: ['Ciabatta'], fr: ['Ciabatta'], de: ['Ciabatta'], zh: ['恰巴塔面包'], ja: ['チャバタ'] } },
  { id: 'focaccia', emoji: '🥖', defaultUnit: 'loaf', shelfLife: 3, category: 'bakery', names: { en: ['Focaccia','focaccia bread'], es: ['Focaccia','pan de focaccia'], fr: ['Focaccia','pain focaccia'], de: ['Focaccia'], zh: ['佛卡夏','佛卡夏面包'], ja: ['フォカッチャ','フォカッチャブレッド'] } },

  // ─── PRODUCE — EVEN MORE ──────────────────────────────────────────────────
  { id: 'grapefruit', emoji: '🍊', defaultUnit: 'pieces', shelfLife: 14, category: 'produce', names: { en: ['Grapefruit'], es: ['Pomelo'], fr: ['Pamplemousse'], de: ['Grapefruit'], zh: ['西柚'], ja: ['グレープフルーツ'] } },
  { id: 'tangerine', emoji: '🍊', defaultUnit: 'pieces', shelfLife: 10, category: 'produce', names: { en: ['Tangerines','tangerine'], es: ['Mandarinas'], fr: ['Tangerines'], de: ['Tangerinen'], zh: ['橘子'], ja: ['タンジェリン'] } },
  { id: 'clementine', emoji: '🍊', defaultUnit: 'bag', shelfLife: 10, category: 'produce', names: { en: ['Clementines','clementine'], es: ['Clementinas'], fr: ['Clémentines'], de: ['Klementinen'], zh: ['克莱门汀'], ja: ['クレメンタイン'] } },
  { id: 'blackberries', emoji: '🫐', defaultUnit: 'bag', shelfLife: 5, category: 'produce', names: { en: ['Blackberries','blackberry'], es: ['Moras'], fr: ['Mûres'], de: ['Brombeeren'], zh: ['黑莓'], ja: ['ブラックベリー'] } },
  { id: 'starfruit', emoji: '🌟', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Starfruit','carambola'], es: ['Carambola'], fr: ['Carambole'], de: ['Sternfrucht'], zh: ['杨桃'], ja: ['スターフルーツ'] } },
  { id: 'passion_fruit', emoji: '🌟', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Passion Fruit'], es: ['Maracuyá'], fr: ['Fruit de la passion'], de: ['Passionsfrucht'], zh: ['百香果'], ja: ['パッションフルーツ'] } },
  { id: 'kumquat', emoji: '🍊', defaultUnit: 'bag', shelfLife: 14, category: 'produce', names: { en: ['Kumquats','kumquat'], es: ['Kumquats'], fr: ['Kumquats'], de: ['Kumquats'], zh: ['金橘'], ja: ['キンカン'] } },
  { id: 'rhubarb', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Rhubarb'], es: ['Ruibarbo'], fr: ['Rhubarbe'], de: ['Rhabarber'], zh: ['大黄'], ja: ['ルバーブ'] } },

  // ─── DAIRY ALTERNATIVES — MORE ────────────────────────────────────────────
  { id: 'soy_yogurt', emoji: '🍶', defaultUnit: 'container', shelfLife: 14, category: 'dairy', names: { en: ['Soy Yogurt'], es: ['Yogur de soja'], fr: ['Yaourt de soja'], de: ['Sojajoghurt'], zh: ['豆奶酸奶'], ja: ['豆乳ヨーグルト'] } },
  { id: 'coconut_yogurt', emoji: '🍦', defaultUnit: 'container', shelfLife: 14, category: 'dairy', names: { en: ['Coconut Yogurt'], es: ['Yogur de coco'], fr: ['Yaourt à la noix de coco'], de: ['Kokosnussjoghurt'], zh: ['椰奶酸奶'], ja: ['ココナッツヨーグルト'] } },
  { id: 'kefir', emoji: '🥛', defaultUnit: 'bottle', shelfLife: 14, category: 'dairy', names: { en: ['Kefir'], es: ['Kéfir'], fr: ['Kéfir'], de: ['Kefir'], zh: ['开菲尔'], ja: ['ケフィア'] } },

  // ─── PANTRY — MORE ───────────────────────────────────────────────────────
  { id: 'pickles', emoji: '🥒', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Pickles','pickled cucumbers'], es: ['Pepinillos'], fr: ['Cornichons'], de: ['Eingelegte Gurken'], zh: ['泡菜'], ja: ['ピクルス'] } },
  { id: 'apple_butter', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Apple Butter'], es: ['Mantequilla de manzana'], fr: ['Beurre de pomme'], de: ['Apfelbutter'], zh: ['苹果酱'], ja: ['アップルバター'] } },
  { id: 'pesto_sauce', emoji: '🧴', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Pesto Sauce'], es: ['Salsa pesto'], fr: ['Sauce pesto'], de: ['Pestosauce'], zh: ['香蒜酱'], ja: ['ペストソース'] } },
  { id: 'molasses', emoji: '🍯', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Molasses'], es: ['Melaza'], fr: ['Mélasse'], de: ['Melasse'], zh: ['糖蜜'], ja: ['モラセス'] } },

  // ─── CANNED — MORE ───────────────────────────────────────────────────────
  { id: 'canned_green_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Green Beans'], es: ['Judías verdes en lata'], fr: ['Haricots verts en boîte'], de: ['Grüne Bohnen in Dose'], zh: ['青豆罐头'], ja: ['缶詰インゲン豆'] } },
  { id: 'canned_artichokes', emoji: '🍄', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Artichokes'], es: ['Alcachofas en lata'], fr: ['Artichauts en boîte'], de: ['Artischocken in Dose'], zh: ['洋蓟罐头'], ja: ['缶詰アーティチョーク'] } },
  { id: 'canned_mixed_vegetables', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Mixed Vegetables'], es: ['Verduras mixtas en lata'], fr: ['Légumes mixtes en boîte'], de: ['Gemischtes Gemüse in Dose'], zh: ['什锦蔬菜罐头'], ja: ['缶詰ミックス野菜'] } },

  // ─── GRAINS — MORE ───────────────────────────────────────────────────────
  { id: 'masa_harina', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Masa Harina'], es: ['Masa harina'], fr: ['Masa harina'], de: ['Masa harina'], zh: ['玉米面粉'], ja: ['マサハリナ'] } },
  { id: 'tapioca_starch', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Tapioca Starch'], es: ['Almidón de tapioca'], fr: ['Fécule de tapioca'], de: ['Tapiokastärke'], zh: ['木薯淀粉'], ja: ['タピオカ澱粉'] } },
  { id: 'gluten_free_flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Gluten Free Flour'], es: ['Harina sin gluten'], fr: ['Farine sans gluten'], de: ['Glutenfreies Mehl'], zh: ['无麸质面粉'], ja: ['グルテンフリーフラワー'] } },
  { id: 'whole_grain_pasta', emoji: '🍝', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Whole Grain Pasta'], es: ['Pasta integral'], fr: ['Pâtes complètes'], de: ['Vollkornnudeln'], zh: ['全麦意大利面'], ja: ['全粒粉パスタ'] } },

  // ─── SPICES — MORE ──────────────────────────────────────────────────────
  { id: 'allspice', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Allspice'], es: ['Pimienta de Jamaica'], fr: ['Quatre-épices'], de: ['Pimentkörner'], zh: ['多香果'], ja: ['オールスパイス'] } },
  { id: 'fennel_seed', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Fennel Seeds'], es: ['Semillas de hinojo'], fr: ['Graines de fenouil'], de: ['Fenchelsamen'], zh: ['茴香籽'], ja: ['フェンネルシード'] } },
  { id: 'sumac', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Sumac'], es: ['Sumaque'], fr: ['Sumac'], de: ['Sumach'], zh: ['苏木'], ja: ['スーマック'] } },
  { id: 'ground_clove', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Ground Clove'], es: ['Clavo molido'], fr: ['Clou de girofle moulu'], de: ['Gemahlene Nelke'], zh: ['丁香粉'], ja: ['クローブ粉'] } },
  { id: 'zaatar', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Zaatar'], es: ['Zaatar'], fr: ['Zaatar'], de: ['Zaatar'], zh: ['荟香草'], ja: ['ザアタル'] } },

  // ─── BEVERAGES — MORE ───────────────────────────────────────────────────
  { id: 'cranberry_juice', emoji: '🍇', defaultUnit: 'bottle', shelfLife: 30, category: 'beverages', names: { en: ['Cranberry Juice'], es: ['Jugo de arándano'], fr: ['Jus de canneberge'], de: ['Cranberrysaft'], zh: ['蔓越莓汁'], ja: ['クランベリージュース'] } },
  { id: 'grapefruit_juice', emoji: '🍊', defaultUnit: 'bottle', shelfLife: 30, category: 'beverages', names: { en: ['Grapefruit Juice'], es: ['Jugo de toronja'], fr: ['Jus de pamplemousse'], de: ['Grapefruitsaft'], zh: ['西柚汁'], ja: ['グレープフルーツジュース'] } },
  { id: 'iced_coffee', emoji: '🧊', defaultUnit: 'bottle', shelfLife: 7, category: 'beverages', names: { en: ['Iced Coffee'], es: ['Café helado'], fr: ['Café glacé'], de: ['Eiskaffee'], zh: ['冰咖啡'], ja: ['アイスコーヒー'] } },
  { id: 'ginger_beer', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 180, category: 'beverages', names: { en: ['Ginger Beer'], es: ['Ginger beer'], fr: ['Ginger beer'], de: ['Ginger Beer'], zh: ['姜汁啤酒'], ja: ['ジンジャービア'] } },
  { id: 'coffee', emoji: '☕', defaultUnit: 'bag', shelfLife: 365, category: 'beverages', names: { en: ['Coffee','ground coffee'], es: ['Café'], fr: ['Café'], de: ['Kaffee'], zh: ['咖啡'], ja: ['コーヒー'] } },
  { id: 'instant_coffee', emoji: '☕', defaultUnit: 'jar', shelfLife: 365, category: 'beverages', names: { en: ['Instant Coffee'], es: ['Café instantáneo'], fr: ['Café instantané'], de: ['Instantkaffee'], zh: ['速溶咖啡'], ja: ['インスタントコーヒー'] } },
  { id: 'pineapple_juice', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 30, category: 'beverages', names: { en: ['Pineapple Juice'], es: ['Jugo de piña'], fr: ['Jus d\'ananas'], de: ['Ananassaft'], zh: ['菠萝汁'], ja: ['パイナップルジュース'] } },
  { id: 'protein_shake', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 14, category: 'beverages', names: { en: ['Protein Shake'], es: ['Batido de proteínas'], fr: ['Shake protéiné'], de: ['Proteinshake'], zh: ['蛋白质奶昔'], ja: ['プロテインシェイク'] } },

  // ─── FROZEN — MORE ───────────────────────────────────────────────────────
  { id: 'frozen_blueberries', emoji: '🫐', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Blueberries'], es: ['Arándanos congelados'], fr: ['Myrtilles surgelées'], de: ['Tiefkühlblaubeeren'], zh: ['冷冻蓝莓'], ja: ['冷凍ブルーベリー'] } },
  { id: 'frozen_sweet_potato_fries', emoji: '🍟', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Sweet Potato Fries'], es: ['Papas fritas de camote congeladas'], fr: ['Frites de patate douce surgelées'], de: ['Tiefkühl-Süßkartoffelpommes'], zh: ['冷冻地瓜薯条'], ja: ['冷凍スイートポテトフライ'] } },
  { id: 'frozen_vegetarian_burgers', emoji: '🍔', defaultUnit: 'pack', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Vegetarian Burgers'], es: ['Hamburguesas vegetarianas congeladas'], fr: ['Burgers végétariens surgelés'], de: ['Tiefkühl-Veggie-Burger'], zh: ['冷冻素食汉堡'], ja: ['冷凍ベジタリアンバーガー'] } },
  { id: 'frozen_meatballs', emoji: '🍖', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Meatballs'], es: ['Albóndigas congeladas'], fr: ['Boulettes surgelées'], de: ['Tiefkühlfleischbällchen'], zh: ['冷冻肉丸'], ja: ['冷凍ミートボール'] } },
  { id: 'frozen_fish_sticks', emoji: '🐟', defaultUnit: 'box', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Fish Sticks'], es: ['Palitos de pescado congelados'], fr: ['Bâtonnets de poisson surgelés'], de: ['Tiefkühlfischstäbchen'], zh: ['冷冻鱼条'], ja: ['冷凍フィッシュスティック'] } },
  { id: 'frozen_chicken_nuggets', emoji: '🍗', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Chicken Nuggets'], es: ['Nuggets de pollo congelados'], fr: ['Nuggets de poulet surgelés'], de: ['Tiefkühlhähnchennuggets'], zh: ['冷冻鸡块'], ja: ['冷凍チキンナゲット'] } },
  { id: 'frozen_french_bread', emoji: '🥖', defaultUnit: 'pack', shelfLife: 180, category: 'frozen', names: { en: ['Frozen French Bread'], es: ['Pan francés congelado'], fr: ['Pain français surgelé'], de: ['Tiefkühlbaguette'], zh: ['冷冻法式面包'], ja: ['冷凍フランスパン'] } },
  { id: 'frozen_strawberries', emoji: '🍓', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Strawberries'], es: ['Fresas congeladas'], fr: ['Fraises surgelées'], de: ['Tiefkühlerdbeeren'], zh: ['冷冻草莓'], ja: ['冷凍ストロベリー'] } },
  { id: 'frozen_pie', emoji: '🥧', defaultUnit: 'box', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Pie','frozen apple pie'], es: ['Tarta congelada'], fr: ['Tarte surgelée'], de: ['Tiefkühltorte'], zh: ['冷冻派'], ja: ['冷凍パイ'] } },

  // ─── SNACKS — MORE ───────────────────────────────────────────────────────
  { id: 'pistachios', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Pistachios'], es: ['Pistachos'], fr: ['Pistaches'], de: ['Pistazien'], zh: ['开心果'], ja: ['ピスタチオ'] } },
  { id: 'pumpkin_seeds', emoji: '🌻', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Pumpkin Seeds'], es: ['Semillas de calabaza'], fr: ['Graines de courge'], de: ['Kürbiskerne'], zh: ['南瓜子'], ja: ['パンプキンシード'] } },
  { id: 'sunflower_seeds', emoji: '🌻', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Sunflower Seeds'], es: ['Semillas de girasol'], fr: ['Graines de tournesol'], de: ['Sonnenblumenkerne'], zh: ['葵花籽'], ja: ['ひまわりの種'] } },
  { id: 'apple_chips', emoji: '🍎', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Apple Chips'], es: ['Chips de manzana'], fr: ['Chips de pomme'], de: ['Apfelchips'], zh: ['苹果片'], ja: ['アップルチップス'] } },
  { id: 'yogurt_covered_raisins', emoji: '🍫', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Yogurt Covered Raisins'], es: ['Pasas cubiertas de yogur'], fr: ['Raisins enrobés de yaourt'], de: ['Joghurtüberzogene Rosinen'], zh: ['酸奶涂层葡萄干'], ja: ['ヨーグルトレーズン'] } },  { id: 'gummy_bears', emoji: '🐻', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Gummy Bears'], es: ['Ositos de goma'], fr: ['Oursons en gélatine'], de: ['Gummibärchen'], zh: ['小熊软糖'], ja: ['グミベア'] } },
  { id: 'fruit_snacks', emoji: '🍓', defaultUnit: 'box', shelfLife: 180, category: 'snacks', names: { en: ['Fruit Snacks'], es: ['Bocaditos de fruta'], fr: ['Snacks aux fruits'], de: ['Fruchtsnacks'], zh: ['水果小吃'], ja: ['フルーツスナック'] } },
  { id: 'microwave_popcorn', emoji: '🍿', defaultUnit: 'pack', shelfLife: 365, category: 'snacks', names: { en: ['Microwave Popcorn'], es: ['Palomitas de microondas'], fr: ['Pop-corn micro-ondes'], de: ['Mikrowellenpopcorn'], zh: ['微波炉爆米花'], ja: ['電子レンジポップコーン'] } },
  { id: 'cookies', emoji: '🍪', defaultUnit: 'pack', shelfLife: 90, category: 'snacks', names: { en: ['Cookies','chocolate chip cookies'], es: ['Galletas'], fr: ['Biscuits'], de: ['Kekse'], zh: ['曲奇饼'], ja: ['クッキー'] } },
  { id: 'oreos', emoji: '🍪', defaultUnit: 'pack', shelfLife: 180, category: 'snacks', names: { en: ['Oreos','oreo cookies'], es: ['Oreos'], fr: ['Oreos'], de: ['Oreos'], zh: ['奥利奥'], ja: ['オレオ'] } },
  { id: 'granola_bars', emoji: '🥜', defaultUnit: 'box', shelfLife: 180, category: 'snacks', names: { en: ['Granola Bars'], es: ['Barras de granola'], fr: ['Barres de granola'], de: ['Granola-Riegel'], zh: ['格兰诺拉棒'], ja: ['グラノラバー'] } },
  { id: 'cheese_crackers', emoji: '🧀', defaultUnit: 'box', shelfLife: 180, category: 'snacks', names: { en: ['Cheese Crackers','cheez-its'], es: ['Galletas de queso'], fr: ['Crackers au fromage'], de: ['Käse-Cracker'], zh: ['奶酪饼干'], ja: ['チーズクラッカー'] } },
  { id: 'goldfish_crackers', emoji: '🐠', defaultUnit: 'box', shelfLife: 180, category: 'snacks', names: { en: ['Goldfish Crackers'], es: ['Galletas goldfish'], fr: ['Crackers goldfish'], de: ['Goldfish-Cracker'], zh: ['金鱼饼干'], ja: ['ゴールドフィッシュクラッカー'] } },

  // ─── BAKERY — MORE ───────────────────────────────────────────────────────
  { id: 'scone', emoji: '🥐', defaultUnit: 'pieces', shelfLife: 3, category: 'bakery', names: { en: ['Scone','scones'], es: ['Bollos'], fr: ['Scones'], de: ['Scones'], zh: ['司康饼'], ja: ['スコーン'] } },
  { id: 'brownie', emoji: '🍫', defaultUnit: 'pieces', shelfLife: 5, category: 'bakery', names: { en: ['Brownie','brownies'], es: ['Brownie','brownies'], fr: ['Brownie','brownies'], de: ['Brownie','Brownies'], zh: ['布朗尼'], ja: ['ブラウニー'] } },
  { id: 'flatbread', emoji: '🫓', defaultUnit: 'pack', shelfLife: 7, category: 'bakery', names: { en: ['Flatbread'], es: ['Pan plano'], fr: ['Pain plat'], de: ['Fladenbrot'], zh: ['扁面包'], ja: ['フラットブレッド'] } },

  // ─── MEAT — MORE ─────────────────────────────────────────────────────────
  { id: 'mussels', emoji: '🦪', defaultUnit: 'lbs', shelfLife: 2, category: 'meat', names: { en: ['Mussels'], es: ['Mejillones'], fr: ['Moules'], de: ['Muscheln'], zh: ['贻贝'], ja: ['ムール貝'] } },
  { id: 'oysters', emoji: '🦪', defaultUnit: 'dozen', shelfLife: 2, category: 'meat', names: { en: ['Oysters'], es: ['Ostras'], fr: ['Huitres'], de: ['Austern'], zh: ['牡蛎'], ja: ['牡蠣'] } },
  { id: 'haddock', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Haddock'], es: ['Eglefino'], fr: ['Eglefin'], de: ['Schellfisch'], zh: ['黑线鳕'], ja: ['コダラ'] } },
  { id: 'halibut', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Halibut'], es: ['Fletán'], fr: ['Flétan'], de: ['Heilbutt'], zh: ['大比目鱼'], ja: ['オヒョウ'] } },
  { id: 'sea_bass', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Sea Bass','branzino'], es: ['Lubina'], fr: ['Bar'], de: ['Seebarsch'], zh: ['鲈鱼'], ja: ['スズキ'] } },
  { id: 'ground_pork', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Ground Pork','minced pork'], es: ['Cerdo molido'], fr: ['Porc haché'], de: ['Schweinehackfleisch'], zh: ['猪肉馅'], ja: ['豚ひき肉'] } },
  { id: 'beef_ribs', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Beef Ribs','spare ribs'], es: ['Costillas de res'], fr: ['Côtes de bœuf'], de: ['Rinderrippen'], zh: ['牛肋骨'], ja: ['牛バラ肉'] } },
  { id: 'hot_dogs', emoji: '🌭', defaultUnit: 'pack', shelfLife: 7, category: 'meat', names: { en: ['Hot Dogs','frankfurters'], es: ['Perros calientes'], fr: ['Hot-dogs'], de: ['Würstchen'], zh: ['热狗'], ja: ['ホットドッグ'] } },
  { id: 'anchovies_canned', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Anchovies'], es: ['Anchoas enlatadas'], fr: ['Anchois en conserve'], de: ['Sardellen in Dose'], zh: ['鳀鱼罐头'], ja: ['缶詰アンチョビ'] } },
  { id: 'calamari_squid', emoji: '🦑', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Squid','calamari','calamares'], es: ['Calamar'], fr: ['Encornet'], de: ['Tintenfisch'], zh: ['鱿鱼'], ja: ['イカ'] } },

  // ─── NUTS — MORE ─────────────────────────────────────────────────────────
  { id: 'pecans', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Pecans','pecan nuts'], es: ['Pacanas'], fr: ['Noix de pécan'], de: ['Pekannüsse'], zh: ['山核桃'], ja: ['ペカンナッツ'] } },
  { id: 'hazelnuts', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Hazelnuts','filberts'], es: ['Avellanas'], fr: ['Noisettes'], de: ['Haselnüsse'], zh: ['榛果'], ja: ['ヘーゼルナッツ'] } },
  { id: 'macadamia_nuts', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Macadamia Nuts'], es: ['Nueces de macadamia'], fr: ['Noix de macadamia'], de: ['Macadamianüsse'], zh: ['夏威夷坚果'], ja: ['マカダミアナッツ'] } },
  { id: 'pine_nuts', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Pine Nuts','pignolia'], es: ['Piñones'], fr: ['Pignons'], de: ['Pinienkerne'], zh: ['松子'], ja: ['松の実'] } },
  { id: 'brazil_nuts', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks', names: { en: ['Brazil Nuts'], es: ['Nueces de Brasil'], fr: ['Noix du Brésil'], de: ['Paranüsse'], zh: ['巴西坚果'], ja: ['ブラジルナッツ'] } },

  // ─── OILS — MORE ─────────────────────────────────────────────────────────
  { id: 'avocado_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Avocado Oil'], es: ['Aceite de aguacate'], fr: ['Huile d\'avocat'], de: ['Avocadoöl'], zh: ['牛油果油'], ja: ['アボカドオイル'] } },
  { id: 'walnut_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Walnut Oil'], es: ['Aceite de nuez'], fr: ['Huile de noix'], de: ['Walnussöl'], zh: ['核桃油'], ja: ['くるみ油'] } },
  { id: 'peanut_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Peanut Oil'], es: ['Aceite de cacahuete'], fr: ['Huile d\'arachide'], de: ['Erdnussöl'], zh: ['花生油'], ja: ['ピーナッツオイル'] } },

  // ─── CHEESE — MORE ───────────────────────────────────────────────────────
  { id: 'string_cheese', emoji: '🧀', defaultUnit: 'pack', shelfLife: 21, category: 'dairy', names: { en: ['String Cheese','mozzarella sticks'], es: ['Queso de cuerda'], fr: ['Fromage à effilocher'], de: ['Fadenkäse'], zh: ['拉丝奶酪'], ja: ['ストリングチーズ'] } },
  { id: 'halloumi', emoji: '🧀', defaultUnit: 'lbs', shelfLife: 14, category: 'dairy', names: { en: ['Halloumi','hellim'], es: ['Halumi'], fr: ['Halloumi'], de: ['Halloumi'], zh: ['哈鲁米芝士'], ja: ['ハロウミ'] } },
  { id: 'manchego', emoji: '🧀', defaultUnit: 'lbs', shelfLife: 30, category: 'dairy', names: { en: ['Manchego'], es: ['Manchego'], fr: ['Manchego'], de: ['Manchego'], zh: ['曼彻格芝士'], ja: ['マンチェゴ'] } },
  { id: 'shredded_cheese', emoji: '🧀', defaultUnit: 'bag', shelfLife: 14, category: 'dairy', names: { en: ['Shredded Cheese','shredded cheddar','cheese blend'], es: ['Queso rallado'], fr: ['Fromage râpé'], de: ['Geraspelter Käse'], zh: ['碎奶酪'], ja: ['シュレッドチーズ'] } },
  { id: 'sliced_cheese', emoji: '🧀', defaultUnit: 'pack', shelfLife: 14, category: 'dairy', names: { en: ['Sliced Cheese','cheese slices'], es: ['Queso en lonjas'], fr: ['Fromage en tranche'], de: ['Scheibenkäse'], zh: ['芝士片'], ja: ['スライスチーズ'] } },

  // ─── PRODUCE — MORE VEGETABLES ────────────────────────────────────────────
  { id: 'swiss_chard', emoji: '🥬', defaultUnit: 'bunch', shelfLife: 5, category: 'produce', names: { en: ['Swiss Chard','chard'], es: ['Acelga'], fr: ['Blette'], de: ['Mangold'], zh: ['彩虹菜'], ja: ['フダンソウ'] } },
  { id: 'napa_cabbage', emoji: '🥬', defaultUnit: 'head', shelfLife: 14, category: 'produce', names: { en: ['Napa Cabbage','chinese cabbage'], es: ['Col china'], fr: ['Chou chinois'], de: ['Chinakohl'], zh: ['结球白菜'], ja: ['ハクサイ'] } },
  { id: 'broccolini', emoji: '🥦', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Broccolini','baby broccoli'], es: ['Brocolin'], fr: ['Broccolini'], de: ['Broccolini'], zh: ['芥兰'], ja: ['ブロッコリーニ'] } },
  { id: 'cauliflower_rice', emoji: '🥦', defaultUnit: 'bag', shelfLife: 5, category: 'produce', names: { en: ['Cauliflower Rice','riced cauliflower'], es: ['Arroz de coliflor'], fr: ['Riz de chou-fleur'], de: ['Blumenkohlreis'], zh: ['花椰菜米'], ja: ['カリフラワーライス'] } },

  // ─── CANNED VEGETABLES — MORE ─────────────────────────────────────────────
  { id: 'canned_beets', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Beets'], es: ['Remolachas en lata'], fr: ['Betteraves en conserve'], de: ['Rote Bete in Dose'], zh: ['甜菜罐头'], ja: ['缶詰ビーツ'] } },
  { id: 'canned_carrots', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Carrots'], es: ['Zanahorias enlatadas'], fr: ['Carottes en conserve'], de: ['Karotten in Dose'], zh: ['胡萝卜罐头'], ja: ['缶詰ニンジン'] } },
  { id: 'canned_asparagus', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Asparagus'], es: ['Espárragos enlatados'], fr: ['Asperges en conserve'], de: ['Spargel in Dose'], zh: ['芦笋罐头'], ja: ['缶詰アスパラガス'] } },
  { id: 'canned_spinach', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Spinach'], es: ['Espinacas enlatadas'], fr: ['Épinards en conserve'], de: ['Spinat in Dose'], zh: ['菠菜罐头'], ja: ['缶詰ほうれん草'] } },

  // ─── GRAINS & NOODLES — MORE ──────────────────────────────────────────────
  { id: 'wild_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Wild Rice'], es: ['Arroz silvestre'], fr: ['Riz sauvage'], de: ['Wildreis'], zh: ['野生稻'], ja: ['ワイルドライス'] } },
  { id: 'egg_noodles', emoji: '🍜', defaultUnit: 'pack', shelfLife: 365, category: 'grains', names: { en: ['Egg Noodles'], es: ['Fideos de huevo'], fr: ['Nouilles aux œufs'], de: ['Eiernudeln'], zh: ['鸡蛋面'], ja: ['卵入りうどん'] } },
  { id: 'lasagna_noodles', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Lasagna Noodles','lasagna sheets'], es: ['Fideos para lasaña'], fr: ['Feuilles de lasagne'], de: ['Lasagneblätter'], zh: ['宽面条'], ja: ['ラザニアシート'] } },
  { id: 'rice_paper', emoji: '🍜', defaultUnit: 'package', shelfLife: 365, category: 'grains', names: { en: ['Rice Paper'], es: ['Papel de arroz'], fr: ['Papier de riz'], de: ['Reispapier'], zh: ['米纸'], ja: ['ライスペーパー'] } },

  // ─── CONDIMENTS & SAUCES — MORE ───────────────────────────────────────────
  { id: 'sriracha', emoji: '🌶️', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Sriracha','sriracha sauce'], es: ['Salsa sriracha'], fr: ['Sauce sriracha'], de: ['Sriracha-Sauce'], zh: ['斯里拉查酱'], ja: ['スリラチャソース'] } },
  { id: 'sweet_sour_sauce', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Sweet and Sour Sauce'], es: ['Salsa agridulce'], fr: ['Sauce aigre-douce'], de: ['Süß-Sauer Sauce'], zh: ['酸甜酱'], ja: ['甘酸っぱいソース'] } },
  { id: 'peanut_sauce', emoji: '🥜', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Peanut Sauce','satay sauce'], es: ['Salsa de maní'], fr: ['Sauce cacahuète'], de: ['Erdnusssauce'], zh: ['花生酱'], ja: ['ピーナッツソース'] } },

  // ─── PANTRY — MORE ────────────────────────────────────────────────────────
  { id: 'maple_syrup_pure', emoji: '🍯', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems', names: { en: ['Pure Maple Syrup'], es: ['Jarabe de arce puro'], fr: ['Sirop d\'érable pur'], de: ['Reiner Ahornsirup'], zh: ['纯枫糖浆'], ja: ['ピュアメープルシロップ'] } },
  { id: 'agave_nectar', emoji: '🍯', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Agave Nectar','agave syrup'], es: ['Néctar de agave'], fr: ['Nectar d\'agave'], de: ['Agavensaft'], zh: ['龙舌兰花蜜'], ja: ['アガベネクター'] } },
  { id: 'milk_powder', emoji: '🥛', defaultUnit: 'bag', shelfLife: 365, category: 'dairy', names: { en: ['Milk Powder','powdered milk'], es: ['Leche en polvo'], fr: ['Lait en poudre'], de: ['Milchpulver'], zh: ['奶粉'], ja: ['粉乳'] } },

  // ─── FROZEN — MORE ────────────────────────────────────────────────────────
  { id: 'frozen_onions', emoji: '🧅', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Onions','diced onions'], es: ['Cebollas congeladas'], fr: ['Oignons surgelés'], de: ['Tiefkühlzwiebeln'], zh: ['冷冻洋葱'], ja: ['冷凍タマネギ'] } },
  { id: 'frozen_garlic', emoji: '🧄', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Garlic','minced garlic'], es: ['Ajo congelado'], fr: ['Ail surgelé'], de: ['Tiefkuhlknoblauch'], zh: ['冷冻大蒜'], ja: ['冷凍ニンニク'] } },
  { id: 'frozen_ginger', emoji: '🫚', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Ginger'], es: ['Jengibre congelado'], fr: ['Gingembre surgelé'], de: ['Tiefkühlinger'], zh: ['冷冻生姜'], ja: ['冷凍生姜'] } },

  // ─── HERBS & SPICES — MORE ────────────────────────────────────────────────
  { id: 'chives', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Chives'], es: ['Cebollino'], fr: ['Ciboulette'], de: ['Schnittlauch'], zh: ['韭葱'], ja: ['チャイブ'] } },
  { id: 'tarragon', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Tarragon','dried tarragon'], es: ['Estragon'], fr: ['Estragon'], de: ['Estragon'], zh: ['龙蒿'], ja: ['タラゴン'] } },
  { id: 'marjoram', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Marjoram','dried marjoram'], es: ['Mejorana'], fr: ['Marjolaine'], de: ['Majoran'], zh: ['马郁兰'], ja: ['マジョラム'] } },
  { id: 'oregano_fresh', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Fresh Oregano'], es: ['Orégano fresco'], fr: ['Origan frais'], de: ['Frischer Oregano'], zh: ['新鲜牛至'], ja: ['新鮮オレガノ'] } },
  { id: 'cilantro_fresh', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Fresh Cilantro','fresh coriander'], es: ['Cilantro fresco'], fr: ['Coriandre fraîche'], de: ['Frischer Koriander'], zh: ['新鲜香菜'], ja: ['新鮮シラントロ'] } },
  { id: 'dill_fresh', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Fresh Dill'], es: ['Eneldo fresco'], fr: ['Aneth frais'], de: ['Frischer Dill'], zh: ['新鲜莳萝'], ja: ['新鮮ディル'] } },
  { id: 'parsley_fresh', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Fresh Parsley'], es: ['Perejil fresco'], fr: ['Persil frais'], de: ['Frischer Petersilie'], zh: ['新鲜欧芹'], ja: ['新鮮パセリ'] } },
  { id: 'basil_fresh', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce', names: { en: ['Fresh Basil'], es: ['Albahaca fresca'], fr: ['Basilic frais'], de: ['Frisches Basilikum'], zh: ['新鲜罗勒'], ja: ['新鮮バジル'] } },
  { id: 'white_pepper', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['White Pepper'], es: ['Pimienta blanca'], fr: ['Poivre blanc'], de: ['Weißer Pfeffer'], zh: ['白胡椒'], ja: ['白胡椒'] } },
  { id: 'pink_peppercorn', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Pink Peppercorn'], es: ['Pimienta rosa'], fr: ['Poivre rose'], de: ['Rosa Pfeffer'], zh: ['粉红胡椒'], ja: ['ピンクペッパー'] } },
  { id: 'black_cumin_seeds', emoji: '🌱', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Black Cumin Seeds','nigella'], es: ['Semillas de comino negro'], fr: ['Graines de cumin noir'], de: ['Schwarzkümmelsamen'], zh: ['黑孜然籽'], ja: ['ブラッククミンシード'] } },

  // ─── PASTA — MORE ────────────────────────────────────────────────────────
  { id: 'angel_hair_pasta', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Angel Hair Pasta','capellini'], es: ['Capellini'], fr: ['Cheveux d\'ange'], de: ['Engelshaar'], zh: ['天使面'], ja: ['エンジェルヘアパスタ'] } },
  { id: 'rigatoni', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Rigatoni'], es: ['Rigatoni'], fr: ['Rigatoni'], de: ['Rigatoni'], zh: ['管状通心粉'], ja: ['リガトーニ'] } },
  { id: 'shells_pasta', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Shells Pasta','conchiglioni'], es: ['Conchas'], fr: ['Coquillettes'], de: ['Muschelnudeln'], zh: ['贝壳面'], ja: ['シェルパスタ'] } },
  { id: 'rotini', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Rotini','fusilli'], es: ['Rotini'], fr: ['Rotini'], de: ['Rotini'], zh: ['螺旋面'], ja: ['ロティーニ'] } },
  { id: 'linguine', emoji: '🍝', defaultUnit: 'box', shelfLife: 730, category: 'grains', names: { en: ['Linguine'], es: ['Linguini'], fr: ['Linguine'], de: ['Linguine'], zh: ['扁面条'], ja: ['リングイネ'] } },

  // ─── RICE — MORE ──────────────────────────────────────────────────────────
  { id: 'sushi_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Sushi Rice','short grain rice'], es: ['Arroz para sushi'], fr: ['Riz à sushi'], de: ['Sushi-Reis'], zh: ['寿司米'], ja: ['寿司米'] } },
  { id: 'carnaroli_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Carnaroli Rice','carnaroli'], es: ['Arroz carnaroli'], fr: ['Riz carnaroli'], de: ['Carnaroli-Reis'], zh: ['卡纳罗利米'], ja: ['カルナローリ米'] } },

  // ─── DRIED FRUITS ─────────────────────────────────────────────────────────
  { id: 'raisins', emoji: '🍇', defaultUnit: 'pack', shelfLife: 180, category: 'snacks', names: { en: ['Raisins'], es: ['Pasas'], fr: ['Raisins secs'], de: ['Rosinen'], zh: ['葡萄干'], ja: ['レーズン'] } },
  { id: 'dried_cranberries', emoji: '🍎', defaultUnit: 'pack', shelfLife: 180, category: 'snacks', names: { en: ['Dried Cranberries'], es: ['Arándanos secos'], fr: ['Cranberries séchées'], de: ['Getrocknete Preiselbeeren'], zh: ['干蔓越莓'], ja: ['ドライクランベリー'] } },
  { id: 'dried_blueberries', emoji: '🫐', defaultUnit: 'pack', shelfLife: 180, category: 'snacks', names: { en: ['Dried Blueberries'], es: ['Arándanos secos'], fr: ['Myrtilles séchées'], de: ['Getrocknete Heidelbeeren'], zh: ['干蓝莓'], ja: ['ドライブルーベリー'] } },
  { id: 'prunes', emoji: '🍑', defaultUnit: 'pack', shelfLife: 180, category: 'snacks', names: { en: ['Prunes','dried plums'], es: ['Ciruelas pasas'], fr: ['Pruneaux'], de: ['Trockenpflaumen'], zh: ['李干'], ja: ['プルーン'] } },

  // ─── SEEDS ────────────────────────────────────────────────────────────────
  { id: 'chia_seeds', emoji: '🌱', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Chia Seeds'], es: ['Semillas de chía'], fr: ['Graines de chia'], de: ['Chiasamen'], zh: ['奇亚籽'], ja: ['チアシード'] } },
  { id: 'flax_seeds', emoji: '🌱', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Flax Seeds','flaxseed'], es: ['Semillas de lino'], fr: ['Graines de lin'], de: ['Leinsamen'], zh: ['亚麻籽'], ja: ['亜麻仁'] } },
  { id: 'hemp_seeds', emoji: '🌱', defaultUnit: 'bag', shelfLife: 180, category: 'snacks', names: { en: ['Hemp Seeds'], es: ['Semillas de cáñamo'], fr: ['Graines de chanvre'], de: ['Hanfsamen'], zh: ['大麻籽'], ja: ['ヘンプシード'] } },

  // ─── OILS — MORE ──────────────────────────────────────────────────────────
  { id: 'grapeseed_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Grapeseed Oil'], es: ['Aceite de semilla de uva'], fr: ['Huile de pépin de raisin'], de: ['Traubenkernöl'], zh: ['葡萄籽油'], ja: ['グレープシードオイル'] } },
  { id: 'sunflower_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Sunflower Oil'], es: ['Aceite de girasol'], fr: ['Huile de tournesol'], de: ['Sonnenblumenöl'], zh: ['葵花油'], ja: ['ひまわり油'] } },

  // ─── DAIRY — MORE ────────────────────────────────────────────────────────
  { id: 'whipped_cream', emoji: '🧈', defaultUnit: 'container', shelfLife: 10, category: 'dairy', names: { en: ['Whipped Cream'], es: ['Crema batida'], fr: ['Crème fouettée'], de: ['Schlagrahm'], zh: ['奶油'], ja: ['ホイップクリーム'] } },
  { id: 'condensed_milk', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Condensed Milk','sweetened condensed milk'], es: ['Leche condensada'], fr: ['Lait condensé'], de: ['Kondensmilch'], zh: ['炼乳'], ja: ['加糖練乳'] } },
  { id: 'evaporated_milk', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Evaporated Milk'], es: ['Leche evaporada'], fr: ['Lait évaporé'], de: ['Evaporierte Milch'], zh: ['浓缩牛奶'], ja: ['無糖練乳'] } },

  // ─── CANNED FRUITS ────────────────────────────────────────────────────────
  { id: 'fruit_cocktail', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Fruit Cocktail'], es: ['Cóctel de frutas'], fr: ['Cocktail de fruits'], de: ['Obstcocktail'], zh: ['水果鸡尾酒'], ja: ['フルーツカクテル'] } },
  { id: 'canned_pears', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Pears'], es: ['Peras enlatadas'], fr: ['Poires en conserve'], de: ['Birnen in Dose'], zh: ['梨罐头'], ja: ['缶詰梨'] } },
  { id: 'canned_cherries', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Cherries'], es: ['Cerezas enlatadas'], fr: ['Cerises en conserve'], de: ['Kirschen in Dose'], zh: ['樱桃罐头'], ja: ['缶詰チェリー'] } },
  { id: 'canned_mandarin_oranges', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Mandarin Oranges'], es: ['Mandarinas enlatadas'], fr: ['Mandarines en conserve'], de: ['Mandarinen in Dose'], zh: ['橘子罐头'], ja: ['缶詰みかん'] } },

  // ─── CONDIMENTS & SAUCES — MORE ───────────────────────────────────────────
  { id: 'adobo_sauce', emoji: '🌶️', defaultUnit: 'can', shelfLife: 365, category: 'canned', names: { en: ['Adobo Sauce','adobo'], es: ['Salsa adobo'], fr: ['Sauce adobo'], de: ['Adobo-Sauce'], zh: ['阿多波酱'], ja: ['アドボソース'] } },
  { id: 'enchilada_sauce', emoji: '🌶️', defaultUnit: 'can', shelfLife: 365, category: 'canned', names: { en: ['Enchilada Sauce'], es: ['Salsa para enchiladas'], fr: ['Sauce enchilada'], de: ['Enchilada-Sauce'], zh: ['恩奇拉达酱'], ja: ['エンチラーダソース'] } },
  { id: 'tamari_sauce', emoji: '🧴', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Tamari Sauce','tamari'], es: ['Salsa tamari'], fr: ['Sauce tamari'], de: ['Tamari-Sauce'], zh: ['天麻酱油'], ja: ['タマリソース'] } },

  // ─── MEATS — MORE ────────────────────────────────────────────────────────
  { id: 'beef_brisket', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Beef Brisket'], es: ['Pecho de res'], fr: ['Poitrine de bœuf'], de: ['Rinderbrust'], zh: ['牛胸肉'], ja: ['牛ブリスケット'] } },
  { id: 'short_ribs', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Short Ribs','beef short ribs'], es: ['Costillas cortas'], fr: ['Côtes courtes'], de: ['Kurzkostenrippchen'], zh: ['短肋骨'], ja: ['ショートリブ'] } },
  { id: 'ground_lamb', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Ground Lamb'], es: ['Cordero molido'], fr: ['Agneau haché'], de: ['Lammhackfleisch'], zh: ['手指肉馅'], ja: ['ラムひき肉'] } },
  { id: 'deli_turkey', emoji: '🥓', defaultUnit: 'pack', shelfLife: 7, category: 'meat', names: { en: ['Deli Turkey'], es: ['Pavo de delicatessen'], fr: ['Dinde à la charcuterie'], de: ['Delikatesshpute'], zh: ['熟食火鸡'], ja: ['デリターキー'] } },
  { id: 'deli_roast_beef', emoji: '🥓', defaultUnit: 'pack', shelfLife: 7, category: 'meat', names: { en: ['Deli Roast Beef'], es: ['Rosbif de delicatessen'], fr: ['Rosbif à la charcuterie'], de: ['Delikatessbrat'], zh: ['熟食烤牛肉'], ja: ['デリローストビーフ'] } },
  { id: 'pollock', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Pollock','saithe'], es: ['Polaca'], fr: ['Lieu'], de: ['Pollack'], zh: ['鳕鱼'], ja: ['スケソウダラ'] } },
  { id: 'monkfish', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Monkfish'], es: ['Rape'], fr: ['Baudroie'], de: ['Seeteufel'], zh: ['欧洲鮟鱇'], ja: ['アンコウ'] } },

  // ─── FROZEN — MORE ────────────────────────────────────────────────────────
  { id: 'frozen_rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Rice','cooked rice'], es: ['Arroz congelado'], fr: ['Riz surgelé'], de: ['Tiefkühlreis'], zh: ['冷冻米'], ja: ['冷凍ご飯'] } },
  { id: 'frozen_cauliflower_rice', emoji: '🥦', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Cauliflower Rice'], es: ['Arroz de coliflor congelado'], fr: ['Riz de chou-fleur surgelé'], de: ['Tiefkühl-Blumenkohlreis'], zh: ['冷冻花椰菜米'], ja: ['冷凍カリフラワーライス'] } },
  { id: 'frozen_stir_fry', emoji: '🥦', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Stir Fry Mix','vegetable stir fry'], es: ['Mezcla para saltear congelada'], fr: ['Mélange à sauté surgelé'], de: ['Tiefkühl-Wok-Mix'], zh: ['冷冻炒菜混合'], ja: ['冷凍炒め野菜ミックス'] } },
  { id: 'frozen_mixed_vegetables', emoji: '🥕', defaultUnit: 'bag', shelfLife: 180, category: 'frozen', names: { en: ['Frozen Mixed Vegetables'], es: ['Verduras mixtas congeladas'], fr: ['Légumes mélangés surgelés'], de: ['Tiefkühlgemüsemix'], zh: ['冷冻混合蔬菜'], ja: ['冷凍ミックス野菜'] } },

  // ─── PICKLED & PRESERVED ──────────────────────────────────────────────────
  { id: 'pickled_peppers', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Pickled Peppers','jalapeño peppers'], es: ['Chiles encurtidos'], fr: ['Poivrons marinés'], de: ['Eingelegte Paprika'], zh: ['腌制辣椒'], ja: ['ピクルスペッパー'] } },
  { id: 'pickled_onions', emoji: '🧅', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Pickled Onions'], es: ['Cebollas encurtidas'], fr: ['Oignons marinés'], de: ['Eingelegte Zwiebeln'], zh: ['腌制洋葱'], ja: ['ピクルスオニオン'] } },
  { id: 'sauerkraut', emoji: '🥬', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Sauerkraut'], es: ['Chucrut'], fr: ['Choucroute'], de: ['Sauerkraut'], zh: ['酸菜'], ja: ['ザワークラウト'] } },
  { id: 'kimchi', emoji: '🥬', defaultUnit: 'jar', shelfLife: 90, category: 'pantryItems', names: { en: ['Kimchi'], es: ['Kimchi','kimchi'], fr: ['Kimchi'], de: ['Kimchi'], zh: ['泡菜'], ja: ['キムチ'] } },

  // ─── BREAKFAST — MORE ────────────────────────────────────────────────────
  { id: 'granola_high_protein', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'breakfast', names: { en: ['High Protein Granola'], es: ['Granola alta en proteína'], fr: ['Granola riche en protéines'], de: ['Hochprotein Granola'], zh: ['高蛋白格兰诺拉'], ja: ['高タンパクグラノーラ'] } },
  { id: 'instant_grits', emoji: '🌾', defaultUnit: 'box', shelfLife: 365, category: 'breakfast', names: { en: ['Instant Grits'], es: ['Sémola instantánea'], fr: ['Semoule instantanée'], de: ['Instant-Polenta'], zh: ['速溶玉米粥'], ja: ['インスタントグリッツ'] } },
  { id: 'cream_of_wheat', emoji: '🌾', defaultUnit: 'box', shelfLife: 365, category: 'breakfast', names: { en: ['Cream of Wheat'], es: ['Crema de trigo'], fr: ['Crème de blé'], de: ['Rahmgrütze'], zh: ['小麦奶油'], ja: ['クリームオブウィート'] } },

  // ─── BREAD — MORE ────────────────────────────────────────────────────────
  { id: 'pumpernickel', emoji: '🍞', defaultUnit: 'loaf', shelfLife: 7, category: 'grains', names: { en: ['Pumpernickel'], es: ['Pan de centeno oscuro'], fr: ['Pain de seigle noir'], de: ['Pumpernickel'], zh: ['黑麦面包'], ja: ['プンパーニッケル'] } },
  { id: 'multigrain_bread', emoji: '🍞', defaultUnit: 'loaf', shelfLife: 7, category: 'grains', names: { en: ['Multigrain Bread'], es: ['Pan multigrano'], fr: ['Pain complet'], de: ['Mehrkornbrot'], zh: ['多谷物面包'], ja: ['マルチグレインパン'] } },


  // ─── ICE CREAM & FROZEN DESSERTS ───────────────────────────────────────────
  { id: 'vanilla_ice_cream', emoji: '🍦', defaultUnit: 'container', shelfLife: 180, category: 'frozen', names: { en: ['Vanilla Ice Cream'], es: ['Helado de vainilla'], fr: ['Crème glacée à la vanille'], de: ['Vanilleeiscreme'], zh: ['香草冰淇淋'], ja: ['バニラアイスクリーム'] } },
  { id: 'chocolate_ice_cream', emoji: '🍦', defaultUnit: 'container', shelfLife: 180, category: 'frozen', names: { en: ['Chocolate Ice Cream'], es: ['Helado de chocolate'], fr: ['Crème glacée au chocolat'], de: ['Schokoladeneiscreme'], zh: ['巧克力冰淇淋'], ja: ['チョコレートアイスクリーム'] } },
  { id: 'sorbet', emoji: '🍧', defaultUnit: 'container', shelfLife: 180, category: 'frozen', names: { en: ['Sorbet'], es: ['Sorbete'], fr: ['Sorbet'], de: ['Sorbet'], zh: ['果冰淇淋'], ja: ['シャーベット'] } },
  { id: 'gelato', emoji: '🍨', defaultUnit: 'container', shelfLife: 180, category: 'frozen', names: { en: ['Gelato'], es: ['Gelato'], fr: ['Gelato'], de: ['Gelato'], zh: ['意大利冰淇淋'], ja: ['ジェラート'] } },

  // ─── PRODUCE — EVEN MORE ──────────────────────────────────────────────────
  { id: 'celery_root', emoji: '🌿', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Celery Root','celeriac'], es: ['Raíz de apio'], fr: ['Céleri-rave'], de: ['Selleriknollen'], zh: ['芹菜根'], ja: ['セロリアック'] } },
  { id: 'jicama', emoji: '🌿', defaultUnit: 'pieces', shelfLife: 21, category: 'produce', names: { en: ['Jicama','Mexican turnip'], es: ['Jícama'], fr: ['Jicama'], de: ['Jicama'], zh: ['豆薯'], ja: ['ヒカマ'] } },
  { id: 'taro_root', emoji: '🥔', defaultUnit: 'pieces', shelfLife: 30, category: 'produce', names: { en: ['Taro Root'], es: ['Raíz de taro'], fr: ['Taro'], de: ['Taro'], zh: ['芋头'], ja: ['タロイモ'] } },

  // ─── BEVERAGES — MORE ─────────────────────────────────────────────────────
  { id: 'almond_milk_vanilla', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Vanilla Almond Milk'], es: ['Leche de almendras de vainilla'], fr: ['Lait d\'amande à la vanille'], de: ['Vanille Mandelmilch'], zh: ['香草杏仁奶'], ja: ['バニラアーモンドミルク'] } },
  { id: 'chocolate_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'beverages', names: { en: ['Chocolate Milk'], es: ['Leche de chocolate'], fr: ['Lait au chocolat'], de: ['Schokoladenmilch'], zh: ['巧克力奶'], ja: ['チョコレートミルク'] } },
  { id: 'prune_juice', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 30, category: 'beverages', names: { en: ['Prune Juice'], es: ['Jugo de ciruela'], fr: ['Jus de pruneau'], de: ['Pflaumensaft'], zh: ['李子汁'], ja: ['プルーンジュース'] } },
  { id: 'beet_juice', emoji: '🥤', defaultUnit: 'bottle', shelfLife: 14, category: 'beverages', names: { en: ['Beet Juice'], es: ['Jugo de remolacha'], fr: ['Jus de betterave'], de: ['Rübensaft'], zh: ['甜菜汁'], ja: ['ビートジュース'] } },

  // ─── CANNED BEANS — MORE ──────────────────────────────────────────────────
  { id: 'pinto_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Pinto Beans','canned pinto beans'], es: ['Frijoles pintos'], fr: ['Haricots pintos'], de: ['Pinto-Bohnen in Dose'], zh: ['斑豆罐头'], ja: ['缶詰ピント豆'] } },
  { id: 'navy_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Navy Beans','white beans'], es: ['Alubia blanca'], fr: ['Haricots blancs'], de: ['Marineebohnen'], zh: ['海军豆罐头'], ja: ['缶詰ネイビービーン'] } },
  { id: 'adzuki_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Adzuki Beans','azuki beans'], es: ['Frijoles adzuki'], fr: ['Haricots adzuki'], de: ['Adzuki-Bohnen'], zh: ['红豆罐头'], ja: ['缶詰小豆'] } },

  // ─── SPICE BLENDS ─────────────────────────────────────────────────────────
  { id: 'five_spice_powder', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Five Spice Powder','chinese five spice'], es: ['Polvo de cinco especias'], fr: ['Poudre de cinq épices'], de: ['Fünf-Gewürz-Pulver'], zh: ['五香粉'], ja: ['五香粉'] } },
  { id: 'taco_seasoning', emoji: '🌶️', defaultUnit: 'packet', shelfLife: 730, category: 'spices', names: { en: ['Taco Seasoning'], es: ['Sazonador para tacos'], fr: ['Assaisonnement taco'], de: ['Taco-Gewürzmischung'], zh: ['塔可调味料'], ja: ['タコシーズニング'] } },
  { id: 'pumpkin_pie_spice', emoji: '🎃', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Pumpkin Pie Spice'], es: ['Especias para pastel de calabaza'], fr: ['Épices à tarte à la citrouille'], de: ['Kürbiskuchenwürz'], zh: ['南瓜派香料'], ja: ['パンプキンパイスパイス'] } },
  { id: 'poultry_seasoning', emoji: '🍗', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Poultry Seasoning'], es: ['Sazonador para aves'], fr: ['Assaisonnement volaille'], de: ['Geflügelwürz'], zh: ['家禽调味料'], ja: ['ポルトリーシーズニング'] } },
  { id: 'cajun_seasoning', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Cajun Seasoning'], es: ['Sazonador cajun'], fr: ['Assaisonnement cajun'], de: ['Cajun-Gewürzmischung'], zh: ['卡津调味料'], ja: ['ケイジャンシーズニング'] } },
  { id: 'italian_herbs', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices', names: { en: ['Italian Herbs','italian herb blend'], es: ['Hierbas italianas'], fr: ['Herbes italiennes'], de: ['Italienische Kräuter'], zh: ['意大利草本'], ja: ['イタリアンハーブ'] } },

  // ─── NUT BUTTERS — MORE ───────────────────────────────────────────────────
  { id: 'cashew_butter', emoji: '🥜', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Cashew Butter'], es: ['Mantequilla de anacardo'], fr: ['Beurre de noix de cajou'], de: ['Cashewbutter'], zh: ['腰果酱'], ja: ['カシューバター'] } },
  { id: 'walnut_butter', emoji: '🥜', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Walnut Butter'], es: ['Mantequilla de nuez'], fr: ['Beurre de noix'], de: ['Walnussbutter'], zh: ['核桃酱'], ja: ['クルミバター'] } },

  // ─── SAUSAGES — MORE ──────────────────────────────────────────────────────
  { id: 'bratwurst', emoji: '🌭', defaultUnit: 'pack', shelfLife: 7, category: 'meat', names: { en: ['Bratwurst'], es: ['Bratwurst'], fr: ['Bratwurst'], de: ['Bratwurst'], zh: ['褐色香肠'], ja: ['ブラートヴルスト'] } },
  { id: 'italian_sausage', emoji: '🌭', defaultUnit: 'pack', shelfLife: 7, category: 'meat', names: { en: ['Italian Sausage'], es: ['Salchicha italiana'], fr: ['Saucisse italienne'], de: ['Italienische Wurst'], zh: ['意大利香肠'], ja: ['イタリアンソーセージ'] } },
  { id: 'smoked_sausage', emoji: '🌭', defaultUnit: 'pack', shelfLife: 14, category: 'meat', names: { en: ['Smoked Sausage'], es: ['Salchicha ahumada'], fr: ['Saucisse fumée'], de: ['Räucherwurst'], zh: ['熏制香肠'], ja: ['スモークソーセージ'] } },

  // ─── CANNED SEAFOOD — MORE ────────────────────────────────────────────────
  { id: 'canned_shrimp', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Shrimp'], es: ['Camarones en lata'], fr: ['Crevettes en conserve'], de: ['Garnelen in Dose'], zh: ['虾罐头'], ja: ['缶詰エビ'] } },
  { id: 'canned_clams', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Clams'], es: ['Almejas enlatadas'], fr: ['Palourdes en conserve'], de: ['Muscheln in Dose'], zh: ['蛤蜊罐头'], ja: ['缶詰アサリ'] } },
  { id: 'smoked_salmon', emoji: '🐟', defaultUnit: 'pack', shelfLife: 14, category: 'meat', names: { en: ['Smoked Salmon','lox'], es: ['Salmón ahumado'], fr: ['Saumon fumé'], de: ['Räucherlachs'], zh: ['熏制三文鱼'], ja: ['スモークサーモン'] } },

  // ─── BROTHS & STOCKS — MORE ───────────────────────────────────────────────
  { id: 'beef_broth', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Beef Broth','beef stock'], es: ['Caldo de res'], fr: ['Bouillon de bœuf'], de: ['Rinderbrühe'], zh: ['牛汤'], ja: ['ビーフブロス'] } },
  { id: 'fish_stock', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Fish Stock','seafood stock'], es: ['Caldo de pescado'], fr: ['Bouillon de poisson'], de: ['Fischbrühe'], zh: ['鱼汤'], ja: ['フィッシュストック'] } },
  { id: 'bone_broth', emoji: '🥫', defaultUnit: 'carton', shelfLife: 14, category: 'canned', names: { en: ['Bone Broth'], es: ['Caldo de hueso'], fr: ['Bouillon d\'os'], de: ['Knochenbrühe'], zh: ['骨汤'], ja: ['ボーンブロス'] } },

  // ─── COOKING WINES & VINEGARS ─────────────────────────────────────────────
  { id: 'sherry_cooking', emoji: '🍾', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Cooking Sherry','sherry'], es: ['Jerez para cocinar'], fr: ['Xérès à cuire'], de: ['Kochsherry'], zh: ['烹饪雪利酒'], ja: ['料理用シェリー'] } },
  { id: 'cooking_wine', emoji: '🍾', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Cooking Wine','dry white wine'], es: ['Vino para cocinar'], fr: ['Vin à cuire'], de: ['Kochwein'], zh: ['烹饪用酒'], ja: ['料理用ワイン'] } },
  { id: 'red_wine_cooking', emoji: '🍾', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Red Cooking Wine'], es: ['Vino tinto para cocinar'], fr: ['Vin rouge à cuire'], de: ['Rotwein zum Kochen'], zh: ['红葡萄酒烹饪'], ja: ['赤ワイン料理用'] } },

  // ─── VANILLA & CHOCOLATE — MORE ───────────────────────────────────────────
  { id: 'vanilla_beans', emoji: '🫙', defaultUnit: 'pods', shelfLife: 180, category: 'pantryItems', names: { en: ['Vanilla Beans','vanilla pods'], es: ['Vainas de vainilla'], fr: ['Gousses de vanille'], de: ['Vanilleschoten'], zh: ['香草豆荚'], ja: ['バニラビーンズ'] } },
  { id: 'vanilla_powder', emoji: '🫙', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Vanilla Powder'], es: ['Polvo de vainilla'], fr: ['Poudre de vanille'], de: ['Vanillepulver'], zh: ['香草粉'], ja: ['バニラパウダー'] } },
  { id: 'cocoa_nibs', emoji: '🍫', defaultUnit: 'bag', shelfLife: 365, category: 'snacks', names: { en: ['Cocoa Nibs'], es: ['Granos de cacao'], fr: ['Éclats de cacao'], de: ['Kakaonibs'], zh: ['可可豆粒'], ja: ['カカオニブ'] } },
  { id: 'chocolate_bars', emoji: '🍫', defaultUnit: 'bar', shelfLife: 180, category: 'snacks', names: { en: ['Chocolate Bars','dark chocolate bar'], es: ['Barras de chocolate'], fr: ['Barres de chocolat'], de: ['Schokoladentafeln'], zh: ['巧克力棒'], ja: ['チョコレートバー'] } },

  // ─── CONDIMENT VARIETIES — MORE ───────────────────────────────────────────
  { id: 'yellow_mustard', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Yellow Mustard'], es: ['Mostaza amarilla'], fr: ['Moutarde jaune'], de: ['Gelber Senf'], zh: ['黄芥末'], ja: ['イエローマスタード'] } },
  { id: 'whole_grain_mustard', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Whole Grain Mustard'], es: ['Mostaza de grano entero'], fr: ['Moutarde à l\'ancienne'], de: ['Körniger Senf'], zh: ['全粒芥末'], ja: ['粒入りマスタード'] } },
  { id: 'spicy_brown_mustard', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Spicy Brown Mustard'], es: ['Mostaza marrón picante'], fr: ['Moutarde marron épicée'], de: ['Scharfer brauner Senf'], zh: ['辛辣棕色芥末'], ja: ['スパイシーブラウンマスタード'] } },
  { id: 'red_pepper_jelly', emoji: '🍯', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Red Pepper Jelly'], es: ['Gelatina de pimiento rojo'], fr: ['Gelée de piment rouge'], de: ['Rote Paprika Gelee'], zh: ['红椒果冻'], ja: ['レッドペッパージェリー'] } },
  { id: 'mango_chutney', emoji: '🥭', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Mango Chutney'], es: ['Chutney de mango'], fr: ['Chutney à la mangue'], de: ['Mango Chutney'], zh: ['芒果酸辣酱'], ja: ['マンゴーチャツネ'] } },
  { id: 'cranberry_sauce', emoji: '🫐', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Cranberry Sauce'], es: ['Salsa de arándano'], fr: ['Sauce cranberry'], de: ['Cranberry-Sauce'], zh: ['蔓越莓酱'], ja: ['クランベリーソース'] } },

  // ─── PASTA & NOODLE VARIETIES ─────────────────────────────────────────────
  { id: 'tortellini_pasta', emoji: '🍝', defaultUnit: 'package', shelfLife: 30, category: 'grains', names: { en: ['Tortellini','cheese tortellini'], es: ['Tortellini'], fr: ['Tortellini'], de: ['Tortellini'], zh: ['意大利馄饨'], ja: ['トルテリーニ'] } },
  { id: 'ravioli_pasta', emoji: '🍝', defaultUnit: 'package', shelfLife: 30, category: 'grains', names: { en: ['Ravioli','cheese ravioli'], es: ['Ravioli'], fr: ['Ravioli'], de: ['Ravioli'], zh: ['馄饨'], ja: ['ラビオリ'] } },
  { id: 'gnocchi_potato', emoji: '🥔', defaultUnit: 'package', shelfLife: 30, category: 'grains', names: { en: ['Potato Gnocchi'], es: ['Ñoquis de papa'], fr: ['Gnocchi aux pommes de terre'], de: ['Kartoffelgnocchi'], zh: ['土豆疙瘩'], ja: ['ポテトニョッキ'] } },
  { id: 'pho_noodles', emoji: '🍜', defaultUnit: 'pack', shelfLife: 365, category: 'grains', names: { en: ['Pho Noodles','rice stick noodles'], es: ['Fideos pho'], fr: ['Nouilles pho'], de: ['Pho-Nudeln'], zh: ['越南河粉'], ja: ['フォー麺'] } },

  // ─── BAKING STAPLES — MORE ────────────────────────────────────────────────
  { id: 'cream_of_tartar', emoji: '🧂', defaultUnit: 'jar', shelfLife: 730, category: 'pantryItems', names: { en: ['Cream of Tartar'], es: ['Bitartrato de potasio'], fr: ['Tartre'], de: ['Weinstein'], zh: ['酒石酸氢钾'], ja: ['酒石酸水素カリウム'] } },
  { id: 'xanthan_gum', emoji: '🧂', defaultUnit: 'jar', shelfLife: 730, category: 'pantryItems', names: { en: ['Xanthan Gum'], es: ['Goma xantana'], fr: ['Gomme xanthane'], de: ['Xanthan'], zh: ['黄原胶'], ja: ['キサンタンガム'] } },
  { id: 'unflavored_gelatin', emoji: '🫙', defaultUnit: 'box', shelfLife: 365, category: 'pantryItems', names: { en: ['Unflavored Gelatin'], es: ['Gelatina sin sabor'], fr: ['Gélatine sans saveur'], de: ['Geschmackslose Gelatine'], zh: ['无味明胶'], ja: ['無フレーバーゼラチン'] } },
  { id: 'psyllium_husk', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'pantryItems', names: { en: ['Psyllium Husk'], es: ['Cáscara de psilio'], fr: ['Tégument de psyllium'], de: ['Flohsamenschalen'], zh: ['车前草壳'], ja: ['サイリウムハスク'] } },

  // ─── CEREALS & BREAKFAST — MORE ───────────────────────────────────────────
  { id: 'fruity_cereal', emoji: '🌾', defaultUnit: 'box', shelfLife: 180, category: 'breakfast', names: { en: ['Fruity Cereal','fruit cereal'], es: ['Cereal de frutas'], fr: ['Céréales aux fruits'], de: ['Früchte-Müsli'], zh: ['水果麦片'], ja: ['フルーツシリアル'] } },
  { id: 'honey_cereal', emoji: '🌾', defaultUnit: 'box', shelfLife: 180, category: 'breakfast', names: { en: ['Honey Cereal','honey oat cereal'], es: ['Cereal de miel'], fr: ['Céréales au miel'], de: ['Honig-Müsli'], zh: ['蜂蜜麦片'], ja: ['ハニーシリアル'] } },
  { id: 'chocolate_cereal', emoji: '🌾', defaultUnit: 'box', shelfLife: 180, category: 'breakfast', names: { en: ['Chocolate Cereal','chocolate puffs'], es: ['Cereal de chocolate'], fr: ['Céréales au chocolat'], de: ['Schokoladenmüsli'], zh: ['巧克力麦片'], ja: ['チョコレートシリアル'] } },

  // ─── FLOUR — MORE ────────────────────────────────────────────────────────
  { id: 'cake_flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Cake Flour'], es: ['Harina para pasteles'], fr: ['Farine à gâteau'], de: ['Kuchenmehl'], zh: ['低筋粉'], ja: ['ケーキ粉'] } },
  { id: 'bread_flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Bread Flour','high-protein flour'], es: ['Harina de pan'], fr: ['Farine de pain'], de: ['Brotmehl'], zh: ['面包粉'], ja: ['強力粉'] } },
  { id: 'rice_flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Rice Flour'], es: ['Harina de arroz'], fr: ['Farine de riz'], de: ['Reismehl'], zh: ['米粉'], ja: ['米粉'] } },
  { id: 'coconut_flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains', names: { en: ['Coconut Flour'], es: ['Harina de coco'], fr: ['Farine de coco'], de: ['Kokosmehl'], zh: ['椰子粉'], ja: ['ココナッツ粉'] } },

  // ─── NUTRITIONAL BOOSTERS ────────────────────────────────────────────────
  { id: 'nutritional_yeast', emoji: '🧈', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Nutritional Yeast'], es: ['Levadura nutricional'], fr: ['Levure nutritionnelle'], de: ['Nährhefe'], zh: ['营养酵母'], ja: ['栄養酵母'] } },
  { id: 'protein_powder', emoji: '💪', defaultUnit: 'container', shelfLife: 180, category: 'pantryItems', names: { en: ['Protein Powder','whey protein'], es: ['Polvo de proteína'], fr: ['Poudre de protéine'], de: ['Proteinpulver'], zh: ['蛋白粉'], ja: ['プロテインパウダー'] } },
  { id: 'collagen_powder', emoji: '💪', defaultUnit: 'container', shelfLife: 365, category: 'pantryItems', names: { en: ['Collagen Powder'], es: ['Polvo de colágeno'], fr: ['Poudre de collagène'], de: ['Kollagenpulver'], zh: ['胶原蛋白粉'], ja: ['コラーゲンパウダー'] } },

  // ─── CONDIMENTS — MORE ────────────────────────────────────────────────────
  { id: 'capers_brined', emoji: '🫒', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Brined Capers','capers'], es: ['Alcaparras'], fr: ['Câpres'], de: ['Kapern'], zh: ['酸豆'], ja: ['ケッパー'] } },
  { id: 'green_olives', emoji: '🫒', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Green Olives','pitted olives'], es: ['Aceitunas verdes'], fr: ['Olives vertes'], de: ['Grüne Oliven'], zh: ['绿橄榄'], ja: ['グリーンオリーブ'] } },
  { id: 'kalamata_olives', emoji: '🫒', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Kalamata Olives'], es: ['Aceitunas kalamata'], fr: ['Olives kalamata'], de: ['Kalamata-Oliven'], zh: ['卡拉玛塔橄榄'], ja: ['カラマタオリーブ'] } },
  { id: 'sun_dried_tomatoes', emoji: '🍅', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Sun Dried Tomatoes'], es: ['Tomates secos al sol'], fr: ['Tomates séchées'], de: ['Getrocknete Tomaten'], zh: ['晒干番茄'], ja: ['ドライトマト'] } },

  // ─── CANNED PUMPKIN & SQUASH ──────────────────────────────────────────────
  { id: 'canned_sweet_potato', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Sweet Potato'], es: ['Batata enlatada'], fr: ['Patate douce en conserve'], de: ['Süßkartoffel in Dose'], zh: ['罐头番薯'], ja: ['缶詰サツマイモ'] } },

  // ─── PLANT-BASED ALTERNATIVES ────────────────────────────────────────────
  { id: 'plant_based_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Plant-Based Milk','plant milk'], es: ['Leche vegetal'], fr: ['Lait végétal'], de: ['Pflanzenmilch'], zh: ['植物基牛奶'], ja: ['プラントベースミルク'] } },
  { id: 'cashew_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Cashew Milk'], es: ['Leche de anacardo'], fr: ['Lait de noix de cajou'], de: ['Cashewmilch'], zh: ['腰果奶'], ja: ['カシューミルク'] } },
  { id: 'macadamia_milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy', names: { en: ['Macadamia Milk'], es: ['Leche de macadamia'], fr: ['Lait de macadamia'], de: ['Macadamiamilch'], zh: ['夏威夷坚果奶'], ja: ['マカダミアミルク'] } },

  // ─── TRUFFLE & SPECIALTY OILS ─────────────────────────────────────────────
  { id: 'truffle_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Truffle Oil'], es: ['Aceite de trufa'], fr: ['Huile de truffe'], de: ['Trüffelöl'], zh: ['松露油'], ja: ['トリュフオイル'] } },
  { id: 'chili_oil', emoji: '🌶️', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems', names: { en: ['Chili Oil','chili-infused oil'], es: ['Aceite de chile'], fr: ['Huile de piment'], de: ['Chiliöl'], zh: ['辣椒油'], ja: ['唐辛子油'] } },

  // ─── BUTTER VARIETIES ─────────────────────────────────────────────────────
  { id: 'clarified_butter', emoji: '🧈', defaultUnit: 'jar', shelfLife: 365, category: 'dairy', names: { en: ['Clarified Butter','ghee'], es: ['Mantequilla clarificada'], fr: ['Beurre clarifié'], de: ['Geklärter Butter'], zh: ['澄清黄油'], ja: ['クラリファイドバター'] } },
  { id: 'brown_butter', emoji: '🧈', defaultUnit: 'container', shelfLife: 14, category: 'dairy', names: { en: ['Brown Butter','browned butter'], es: ['Mantequilla marrón'], fr: ['Beurre noisette'], de: ['Braune Butter'], zh: ['棕色黄油'], ja: ['ブラウンバター'] } },
  { id: 'cultured_butter', emoji: '🧈', defaultUnit: 'lbs', shelfLife: 30, category: 'dairy', names: { en: ['Cultured Butter'], es: ['Mantequilla cultivada'], fr: ['Beurre de culture'], de: ['Sauerrahmbutter'], zh: ['发酵黄油'], ja: ['カルチャーバター'] } },

  // ─── CANNED VEGETABLES — MORE ─────────────────────────────────────────────
  { id: 'canned_peas', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Peas'], es: ['Guisantes enlatados'], fr: ['Petits pois en conserve'], de: ['Erbsen in Dose'], zh: ['豌豆罐头'], ja: ['缶詰グリーンピース'] } },
  { id: 'canned_carrots_sliced', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Sliced Canned Carrots'], es: ['Zanahorias en rodajas'], fr: ['Carottes tranchées'], de: ['Geschnittene Karotten'], zh: ['切片胡萝卜罐头'], ja: ['缶詰スライスニンジン'] } },
  { id: 'canned_eggplant', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Canned Eggplant'], es: ['Berenjena enlatada'], fr: ['Aubergine en conserve'], de: ['Aubergine in Dose'], zh: ['茄子罐头'], ja: ['缶詰ナス'] } },

  // ─── EXOTIC PROTEINS & MEATS ──────────────────────────────────────────────
  { id: 'beef_strips', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Beef Strips','stir fry beef'], es: ['Tiras de res'], fr: ['Lanières de bœuf'], de: ['Rinderstreifen'], zh: ['牛肉条'], ja: ['ビーフストリップ'] } },
  { id: 'pork_ground', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat', names: { en: ['Ground Pork','pork mince'], es: ['Cerdo molido'], fr: ['Porc haché'], de: ['Schweinehackfleisch'], zh: ['猪肉馅'], ja: ['豚ひき肉'] } },

  // ─── LEGUMES — MORE ───────────────────────────────────────────────────────
  { id: 'split_peas', emoji: '🥬', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Split Peas'], es: ['Guisantes partidos'], fr: ['Pois cassés'], de: ['Spalterbsen'], zh: ['豌豆粉'], ja: ['スプリットピー'] } },
  { id: 'yellow_lentils', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains', names: { en: ['Yellow Lentils','moong dal'], es: ['Lentejas amarillas'], fr: ['Lentilles jaunes'], de: ['Gelbe Linsen'], zh: ['黄扁豆'], ja: ['黄レンズ豆'] } },

  // ─── COCONUT PRODUCTS — MORE ──────────────────────────────────────────────
  { id: 'shredded_coconut', emoji: '🥥', defaultUnit: 'bag', shelfLife: 365, category: 'snacks', names: { en: ['Shredded Coconut'], es: ['Coco rallado'], fr: ['Noix de coco râpée'], de: ['Kokosflocken'], zh: ['椰子丝'], ja: ['削ったココナッツ'] } },
  { id: 'coconut_cream', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned', names: { en: ['Coconut Cream'], es: ['Crema de coco'], fr: ['Crème de coco'], de: ['Kokosnussrahm'], zh: ['椰子奶油'], ja: ['ココナッツクリーム'] } },
  { id: 'toasted_coconut', emoji: '🥥', defaultUnit: 'bag', shelfLife: 365, category: 'snacks', names: { en: ['Toasted Coconut'], es: ['Coco tostado'], fr: ['Noix de coco grillée'], de: ['Geröstete Kokos'], zh: ['烤椰子'], ja: ['ローストココナッツ'] } },

  // ─── FRESH FRUIT ALTERNATIVES ────────────────────────────────────────────
  { id: 'coconut_meat', emoji: '🥥', defaultUnit: 'pieces', shelfLife: 7, category: 'produce', names: { en: ['Coconut Meat','fresh coconut'], es: ['Carne de coco'], fr: ['Pulpe de noix de coco'], de: ['Kokosfleisch'], zh: ['椰子肉'], ja: ['ココナッツ肉'] } },

  // ─── PASTA SAUCES — MORE ──────────────────────────────────────────────────
  { id: 'alfredo_sauce', emoji: '🧴', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems', names: { en: ['Alfredo Sauce'], es: ['Salsa Alfredo'], fr: ['Sauce Alfredo'], de: ['Alfredo-Sauce'], zh: ['阿尔弗雷多酱'], ja: ['アルフレードソース'] } },
  { id: 'carbonara_sauce', emoji: '🧴', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems', names: { en: ['Carbonara Sauce'], es: ['Salsa carbonara'], fr: ['Sauce carbonara'], de: ['Carbonara-Sauce'], zh: ['意大利培根奶油酱'], ja: ['カルボナーラソース'] } },
];




// ─── Search utilities ─────────────────────────────────────────────────────────

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

/**
 * Search the food database for entries matching the query.
 * Matches against names in the given language (falls back to 'en').
 * Results ranked: starts-with > contains. Returns up to `limit` results.
 */
export function searchFoods(query: string, lang: string, limit = 8): FoodEntry[] {
  const langCode = (['en', 'es', 'fr', 'de', 'zh', 'ja'].includes(lang) ? lang : 'en') as LangCode;
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const startsWith: FoodEntry[] = [];
  const contains: FoodEntry[] = [];

  for (const entry of FOOD_DATABASE) {
    const terms = (entry.names[langCode] ?? entry.names.en).map(n => n.toLowerCase());
    const canonical = terms[0];
    // Only the canonical (first) name gets the starts-with boost.
    // Alternate names matching starts-with are treated as regular contains.
    const canonicalStartsWith = canonical.startsWith(q);
    const anyContains = terms.some(n => n.includes(q));
    if (canonicalStartsWith) startsWith.push(entry);
    else if (anyContains) contains.push(entry);
    if (startsWith.length + contains.length >= limit * 2) break;
  }

  return [...startsWith, ...contains].slice(0, limit);
}

/**
 * Compute the smart expiry date string (YYYY-MM-DD) for a food entry.
 */
export function getSmartExpiryDate(entry: FoodEntry): string {
  const d = new Date();
  d.setDate(d.getDate() + entry.shelfLife);
  return d.toISOString().split('T')[0];
}

/**
 * Get the display name (first term) for a food entry in the given language.
 */
export function getFoodDisplayName(entry: FoodEntry, lang: string): string {
  const langCode = (['en', 'es', 'fr', 'de', 'zh', 'ja'].includes(lang) ? lang : 'en') as LangCode;
  return (entry.names[langCode]?.[0]) ?? entry.names.en[0];
}

const UNIT_SUGGESTIONS_BY_DEFAULT: Record<string, string[]> = {
  'carton': ['carton', 'liter', 'ml', 'cups', 'oz'],
  'pieces': ['pieces', 'lbs', 'kg', 'g', 'bunch'],
  'dozen': ['dozen', 'pieces', 'pack', 'box'],
  'block': ['block', 'g', 'oz', 'lbs', 'slice'],
  'container': ['container', 'g', 'oz', 'cups', 'ml'],
  'bag': ['bag', 'lbs', 'kg', 'g', 'pieces'],
  'bunch': ['bunch', 'pieces', 'lbs', 'g'],
  'head': ['head', 'pieces', 'clove', 'bunch'],
  'lbs': ['lbs', 'kg', 'g', 'oz', 'pieces'],
  'kg': ['kg', 'lbs', 'g', 'oz'],
  'jar': ['jar', 'oz', 'g', 'cups', 'tbsp'],
  'loaf': ['loaf', 'slice', 'pieces', 'pack'],
  'cans': ['cans', 'oz', 'g', 'ml', 'pieces'],
  'bottle': ['bottle', 'ml', 'liter', 'oz', 'cups'],
  'box': ['box', 'pieces', 'g', 'oz', 'pack'],
  'pack': ['pack', 'pieces', 'box', 'bag', 'dozen'],
  'sachet': ['sachet', 'pack', 'pieces', 'g', 'tbsp'],
  'fillet': ['fillet', 'pieces', 'lbs', 'kg', 'g'],
  'breast': ['breast', 'pieces', 'lbs', 'kg', 'g'],
  'leg': ['leg', 'pieces', 'lbs', 'kg'],
  'rack': ['rack', 'pieces', 'lbs', 'kg'],
  'clove': ['clove', 'head', 'pieces', 'g', 'tsp'],
  'slice': ['slice', 'pieces', 'g', 'oz', 'lbs'],
  'roll': ['roll', 'pieces', 'pack', 'bag'],
  'bar': ['bar', 'pieces', 'g', 'oz', 'pack'],
};

export function getSuggestedUnits(defaultUnit: string): string[] {
  const suggestions = UNIT_SUGGESTIONS_BY_DEFAULT[defaultUnit];
  if (suggestions) return suggestions;
  return [defaultUnit, 'pieces', 'lbs', 'kg', 'g'];
}
