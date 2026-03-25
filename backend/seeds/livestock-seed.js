// East Africa Livestock Seed Generator – produces ~1000 listings

const locations = [
  'Nairobi, Kenya','Nakuru, Kenya','Eldoret, Kenya','Kisumu, Kenya','Meru, Kenya',
  'Machakos, Kenya','Nyeri, Kenya','Kitale, Kenya','Nanyuki, Kenya','Thika, Kenya',
  'Kampala, Uganda','Jinja, Uganda','Mbarara, Uganda','Gulu, Uganda','Fort Portal, Uganda',
  'Dar es Salaam, Tanzania','Arusha, Tanzania','Mwanza, Tanzania','Moshi, Tanzania',
  'Kigali, Rwanda','Butare, Rwanda','Addis Ababa, Ethiopia','Hawassa, Ethiopia',
  'Naivasha, Kenya','Isiolo, Kenya','Garissa, Kenya','Malindi, Kenya','Muranga, Kenya'
];

const cattle = [
  {n:'Friesian Dairy Cow',   b:'Friesian',   p:[75000,120000], a:'2-5 yrs', w:'400-500kg', img:'photo-1500595046743-cd271d694e30'},
  {n:'Ayrshire Heifer',      b:'Ayrshire',   p:[55000,85000],  a:'1-3 yrs', w:'300-400kg', img:'photo-1570042225831-d98fa7577f1e'},
  {n:'Jersey Cow',           b:'Jersey',     p:[65000,95000],  a:'2-4 yrs', w:'350-420kg', img:'photo-1516467508483-a7212febe31a'},
  {n:'Boran Bull',           b:'Boran',      p:[90000,150000], a:'3-6 yrs', w:'500-700kg', img:'photo-1596733430284-f7437764b1a9'},
  {n:'Zebu Ox',              b:'Zebu',       p:[40000,70000],  a:'4-7 yrs', w:'350-500kg', img:'photo-1563170423-2f3dfe8c8b67'},
  {n:'Sahiwal Cow',          b:'Sahiwal',    p:[60000,100000], a:'2-5 yrs', w:'380-480kg', img:'photo-1500595046743-cd271d694e30'},
  {n:'Ankole Watusi Bull',   b:'Ankole',     p:[80000,130000], a:'3-7 yrs', w:'450-650kg', img:'photo-1570042225831-d98fa7577f1e'},
  {n:'Simmental Cross',      b:'Simmental',  p:[70000,110000], a:'2-4 yrs', w:'420-550kg', img:'photo-1596733430284-f7437764b1a9'},
  {n:'Guernsey Cow',         b:'Guernsey',   p:[72000,105000], a:'2-5 yrs', w:'370-460kg', img:'photo-1516467508483-a7212febe31a'},
  {n:'Dextern Cattle',       b:'Dexter',     p:[45000,80000],  a:'2-4 yrs', w:'300-380kg', img:'photo-1563170423-2f3dfe8c8b67'},
];
const goats = [
  {n:'Galla Goat',     b:'Galla',      p:[8000,18000],  a:'1-3 yrs', w:'30-50kg', img:'photo-1558618666-fcd25c85cd64'},
  {n:'Boer Goat',      b:'Boer',       p:[12000,25000], a:'1-3 yrs', w:'40-70kg', img:'photo-1564349683136-77e08dba1ef7'},
  {n:'Nubian Goat',    b:'Nubian',     p:[10000,20000], a:'1-4 yrs', w:'35-60kg', img:'photo-1558618666-fcd25c85cd64'},
  {n:'Toggenburg Goat',b:'Toggenburg', p:[9000,17000],  a:'1-3 yrs', w:'30-55kg', img:'photo-1564349683136-77e08dba1ef7'},
  {n:'Alpine Dairy Goat',b:'Alpine',   p:[11000,22000], a:'1-4 yrs', w:'35-65kg', img:'photo-1558618666-fcd25c85cd64'},
  {n:'Saanen Goat',    b:'Saanen',     p:[13000,24000], a:'1-3 yrs', w:'40-70kg', img:'photo-1564349683136-77e08dba1ef7'},
  {n:'East African Short-eared',b:'Local',p:[5000,12000],a:'1-3 yrs',w:'20-40kg', img:'photo-1558618666-fcd25c85cd64'},
];
const sheep = [
  {n:'Red Maasai Sheep',  b:'Red Maasai', p:[8000,18000], a:'1-3 yrs', w:'30-55kg', img:'photo-1484557985045-edf25e08da73'},
  {n:'Dorper Sheep',      b:'Dorper',     p:[12000,22000],a:'1-3 yrs', w:'40-65kg', img:'photo-1510771463146-e5e47d01de6b'},
  {n:'Blackhead Persian', b:'Persian',    p:[9000,17000], a:'1-3 yrs', w:'35-55kg', img:'photo-1484557985045-edf25e08da73'},
  {n:'Merino Sheep',      b:'Merino',     p:[10000,20000],a:'1-3 yrs', w:'35-60kg', img:'photo-1510771463146-e5e47d01de6b'},
  {n:'Corriedale Sheep',  b:'Corriedale', p:[8500,16000], a:'1-3 yrs', w:'35-58kg', img:'photo-1484557985045-edf25e08da73'},
  {n:'Local Fat-Tail Sheep',b:'Local',    p:[6000,13000], a:'1-3 yrs', w:'25-45kg', img:'photo-1510771463146-e5e47d01de6b'},
];
const poultry = [
  {n:'Kienyeji Chicken',  b:'Kienyeji',  p:[500,1200],  a:'4-6 mths', w:'1.5-2.5kg', img:'photo-1548550023-2bdb3c5beed7'},
  {n:'Kenbro Chicken',    b:'Kenbro',    p:[700,1500],  a:'4-6 mths', w:'2-3kg',     img:'photo-1612170153139-6f881ff067e0'},
  {n:'Kuroiler Chicken',  b:'Kuroiler',  p:[600,1300],  a:'4-6 mths', w:'2-3kg',     img:'photo-1548550023-2bdb3c5beed7'},
  {n:'Broiler Chicken',   b:'Broiler',   p:[400,900],   a:'6-8 wks',  w:'2-2.5kg',   img:'photo-1612170153139-6f881ff067e0'},
  {n:'Layer Hen',         b:'Layer',     p:[500,1000],  a:'5-7 mths', w:'1.8-2.2kg', img:'photo-1548550023-2bdb3c5beed7'},
  {n:'Turkey',            b:'Turkey',    p:[2000,5000], a:'4-6 mths', w:'5-12kg',    img:'photo-1612170153139-6f881ff067e0'},
  {n:'Muscovy Duck',      b:'Muscovy',   p:[800,2000],  a:'3-5 mths', w:'2-4kg',     img:'photo-1548550023-2bdb3c5beed7'},
  {n:'Guinea Fowl',       b:'Guinea',    p:[600,1400],  a:'4-5 mths', w:'1.5-2kg',   img:'photo-1612170153139-6f881ff067e0'},
];
const pigs = [
  {n:'Large White Pig',  b:'Large White',p:[20000,40000],a:'4-8 mths',w:'60-120kg',img:'photo-1561037404-61cd46aa615b'},
  {n:'Landrace Pig',     b:'Landrace',   p:[18000,35000],a:'4-8 mths',w:'55-110kg',img:'photo-1537637531591-9a92b31c7b0c'},
  {n:'Duroc Pig',        b:'Duroc',      p:[22000,45000],a:'4-8 mths',w:'65-130kg',img:'photo-1561037404-61cd46aa615b'},
  {n:'Hampshire Pig',    b:'Hampshire',  p:[19000,38000],a:'4-8 mths',w:'60-115kg',img:'photo-1537637531591-9a92b31c7b0c'},
];
const rabbits = [
  {n:'New Zealand White Rabbit',b:'NZ White',p:[1500,4000],a:'2-5 mths',w:'3-5kg',img:'photo-1585110396000-c9ffd4e4b308'},
  {n:'Californian Rabbit',      b:'Californian',p:[1800,4500],a:'2-5 mths',w:'3.5-5.5kg',img:'photo-1585110396000-c9ffd4e4b308'},
  {n:'Chinchilla Rabbit',       b:'Chinchilla',p:[2000,5000],a:'2-5 mths',w:'3-5kg',img:'photo-1585110396000-c9ffd4e4b308'},
];
const camels = [
  {n:'Dromedary Camel',b:'Dromedary',p:[150000,350000],a:'3-8 yrs',w:'400-600kg',img:'photo-1509316785289-025f5b846b35'},
  {n:'Somali Camel',   b:'Somali',   p:[120000,280000],a:'3-7 yrs',w:'380-550kg',img:'photo-1509316785289-025f5b846b35'},
];
const donkeys = [
  {n:'East African Donkey',b:'Local',p:[15000,40000],a:'2-8 yrs',w:'150-250kg',img:'photo-1556075798-4825dfaaf498'},
];
const fish = [
  {n:'Nile Tilapia (Fingerlings)',b:'Nile Tilapia',p:[50,200],   a:'2-4 wks', w:'5-20g',  img:'photo-1519671282429-b8e4c2945e85'},
  {n:'African Catfish',           b:'Catfish',      p:[300,800],  a:'2-4 mths',w:'200-500g',img:'photo-1519671282429-b8e4c2945e85'},
  {n:'Nile Tilapia (Market Size)',b:'Nile Tilapia', p:[400,900],  a:'5-8 mths',w:'300-600g',img:'photo-1519671282429-b8e4c2945e85'},
  {n:'Rainbow Trout',             b:'Trout',        p:[600,1500], a:'4-7 mths',w:'400-800g',img:'photo-1519671282429-b8e4c2945e85'},
];

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateListings(userId) {
  const listings = [];
  const add = (templates, type, count) => {
    for (let i = 0; i < count; i++) {
      const t = pick(templates);
      const price = rnd(t.p[0], t.p[1]);
      const qty = type === 'poultry' ? rnd(20, 500) : type === 'fish' ? rnd(50, 2000) : rnd(1, 15);
      listings.push({
        user_id: userId, type, name: t.n, breed: t.b,
        price, location: pick(locations), age: t.a, weight: t.w,
        condition: pick(['Excellent','Good','Very Good']), quantity: qty,
        description: `${t.n} (${t.b}) available for sale. Healthy, vaccinated & dewormed. Located in ${pick(locations)}. Price negotiable for bulk buyers.`,
        image_url: `https://images.unsplash.com/${t.img}?w=400&h=300&fit=crop&auto=format`,
        status: pick(['active','active','active','active','pending'])
      });
    }
  };
  add(cattle,  'cattle',  250);
  add(goats,   'goats',   200);
  add(sheep,   'sheep',   150);
  add(poultry, 'poultry', 200);
  add(pigs,    'pigs',     80);
  add(rabbits, 'rabbits',  40);
  add(camels,  'camels',   20);
  add(donkeys, 'donkeys',  10);
  add(fish,    'fish',     50);
  return listings; // 1000 total
}

module.exports = { generateListings };

