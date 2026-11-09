'use strict';

// Promptene er på engelsk fordi bilde- og videomodellene forstår det best.
// Legg gjerne til flere effekter her – de dukker opp automatisk i appen.

/** Tegningene fotograferes på et bord: både bildefiksen og videoen skal bare bry seg om det som er på arket. */
const PAPER_ONLY = 'The frame shows only the drawing on the sheet of paper, filling the frame; ignore and remove any table, hands, shadows or surroundings.';

const DRAWING_STYLES = [
  {
    id: 'magisk',
    name: 'Magisk liv',
    emoji: '✨',
    thumb: 'stiler/tegning-magisk.jpg',
    prompt: (d) =>
      `${PAPER_ONLY} The hand-drawn drawing comes to life: the characters and objects in the drawing start moving, playful and joyful animation, keep the crayon and paper texture and the original colors${d ? `. The drawing shows: ${d}` : ''}. Sparkles and magic dust, gentle camera push-in.`,
  },
  {
    id: 'tegnefilm',
    name: '3D-tegnefilm',
    emoji: '🎬',
    thumb: 'stiler/tegning-tegnefilm.jpg',
    prompt: (d) =>
      `${PAPER_ONLY} Transform this hand-made drawing into a colorful 3D animated feature film scene, cute characters faithful to the drawing's shapes and colors${d ? `, the scene shows: ${d}` : ''}, characters move expressively, cinematic lighting, smooth camera movement.`,
  },
  {
    id: 'anime',
    name: 'Anime',
    emoji: '🌸',
    thumb: 'stiler/tegning-anime.jpg',
    prompt: (d) =>
      `${PAPER_ONLY} Turn this drawing into a vibrant anime scene with dynamic motion, wind, glowing light and expressive characters faithful to the drawing${d ? `, the scene shows: ${d}` : ''}.`,
  },
  {
    id: 'ekte',
    name: 'Blir ekte',
    emoji: '🦄',
    thumb: 'stiler/tegning-ekte.jpg',
    prompt: (d) =>
      `${PAPER_ONLY} The drawing transforms into a realistic live-action scene: everything drawn becomes real and moves naturally, matching the drawing's composition and colors${d ? `, the scene shows: ${d}` : ''}, cinematic.`,
  },
];

/**
 * Selfie-effekter. Alle bildene tas inne i festlokalet (tømmerhytte, ujevnt lys), så før filmen lages
 * går bildet gjennom et fiksesteg: lyset rettes opp og bakgrunnen byttes til et sted i verden som passer.
 *  - framing:  'full' = hele kroppen må være med (noe skal skje rundt bena), 'portrait' = portrett holder.
 *  - scene:    bakgrunnen bildet flyttes til.
 *  - costume:  ekstra ting som legges på i stillbildet (slange, trollmannsklær …). Selve bevegelsen lages i videoen.
 *  - adapt:    hvordan effekten skal tilpasses personen (farger fra klærne, skjerf, briller …).
 *  - variants: tilfeldige vrier (scene/kostyme/bevegelse) så to gjester med samme effekt ikke får det samme.
 *             Hver variant overstyrer feltene den nevner; resten arves fra effekten.
 */
const SELFIE_EFFECTS = [
  { id: 'tiger', name: 'Tiger rundt deg', emoji: '🐯', framing: 'full', thumb: 'stiler/selfie-tiger.jpg',
    scene: 'a sunlit clearing in the Indian jungle of Ranthambore, tall golden grass, banyan trees and warm hazy light',
    costume: 'Leave open ground around the feet so an animal can walk around the person later; do not add any animal yet.',
    prompt: 'A majestic realistic Bengal tiger walks slowly in a full circle around the person, brushing past their legs; the person stays in place, looks amazed and smiles. Cinematic, photorealistic, steady camera.',
    variants: [
      {},
      { scene: 'a snowy Siberian taiga at dawn, frost on the pine trees and low golden light',
        prompt: 'A huge realistic Siberian tiger pads through the snow and circles the person, breath steaming in the cold, rubbing its head against their legs like a giant cat; the person laughs nervously. Cinematic, photorealistic.' },
      { scene: 'the ruins of an overgrown temple in the Cambodian jungle, roots over stone and soft green light',
        prompt: 'A rare white tiger with blue eyes steps out from behind the stone pillars and walks a slow circle around the person, then sits beside them; the person carefully pats its head. Cinematic, photorealistic.' },
      { scene: 'a dry African savannah at sunset, acacia trees and orange sky',
        prompt: 'Two playful tiger cubs tumble out of the grass and chase each other around the person\'s feet while a big tigress watches calmly behind; the person crouches and laughs. Warm, photorealistic.' },
      { scene: 'a misty mangrove riverbank in the Sundarbans at dusk, dark water and lanterns of fireflies',
        prompt: 'A Bengal tiger wades out of the water, shakes its wet fur, and circles the person slowly in the dusk while fireflies float around; the person stands frozen, then smiles with relief. Cinematic, photorealistic.' },
    ] },
  { id: 'slange', name: 'Slange rundt halsen', emoji: '🐍', framing: 'portrait', thumb: 'stiler/selfie-slange.jpg',
    scene: 'the deep Amazon rainforest, lush green leaves, hanging vines and dappled sunlight',
    costume: 'A large realistic tree python is draped around the person\'s neck and shoulders, calm and heavy.',
    adapt: 'The snake\'s colors and pattern echo the most striking color the person is wearing (a blue scarf gives a blue snake, a red sweater a red-patterned snake); otherwise emerald green.',
    prompt: 'The large snake around the person\'s neck slowly slides and coils, flicking its tongue, while the person tries to stay calm, then grins. Cinematic, photorealistic, steady camera.',
    variants: [
      {},
      { scene: 'a steamy Indian temple courtyard with carved stone cobras and marigold garlands',
        prompt: 'The snake lifts its head, sways gently like a dancing cobra in front of the person\'s face and flicks its tongue at their nose; the person goes cross-eyed, then laughs. Photorealistic, steady camera.' },
      { scene: 'a dusty reptile market stall in Bangkok at night, string lights and glass terrariums',
        costume: 'Two slim, shiny snakes are wrapped around the person\'s neck and one arm, heads raised.',
        prompt: 'The two snakes slowly slither in opposite directions around the person\'s shoulders and neck, tongues flicking, while the person keeps a brave face and finally smiles. Photorealistic, steady camera.' },
      { scene: 'a sunlit sandstone canyon in the Australian outback, red rock and blue sky',
        prompt: 'The snake slides slowly up from the shoulder, rests its head on top of the person\'s head like a hat and looks at the camera; the person rolls their eyes upward and giggles. Photorealistic, steady camera.' },
      { scene: 'a foggy swamp in the Florida Everglades, cypress trees and hanging moss',
        costume: 'A thick, heavy realistic boa constrictor is draped around the person\'s neck and shoulders.',
        prompt: 'The heavy boa tightens its coils gently around the shoulders and lifts its head to stare into the camera, tongue flicking; the person pretends to gasp, then laughs. Photorealistic, steady camera.' },
    ] },
  { id: 'trollmann', name: 'Bli en trollmann', emoji: '🧙', framing: 'portrait', thumb: 'stiler/selfie-trollmann.jpg',
    scene: 'the great hall of an ancient wizard tower, stone walls, candles floating in the air, old books and glowing runes',
    costume: 'Dress the person as a wizard: a long robe with embroidered stars, a tall pointed hat and a wooden staff with a glowing crystal. Keep the face unchanged.',
    adapt: 'The robe, hat and the crystal\'s glow take the dominant color of the person\'s own clothes (red clothes give a red wizard with a red glowing crystal); keep the person\'s glasses, beard or hairstyle as part of the wizard look.',
    prompt: 'The wizard raises the glowing staff, sparks and swirling magic light burst from it, floating books and candles drift around, the robe sways. Fantasy, cinematic.',
    variants: [
      {},
      { scene: 'a frozen mountain peak at night under the northern lights, snow and ancient standing stones',
        costume: 'Dress the person as an ice sorcerer: a fur-lined robe with frost patterns, a crown of icicles and a staff topped with a glowing ice crystal. Keep the face unchanged.',
        prompt: 'The sorcerer slams the staff into the snow, a wave of frost and glittering ice crystals spreads out, the northern lights flare brighter and snow swirls around them. Fantasy, cinematic.' },
      { scene: 'a volcanic cave lit by rivers of lava, black rock and glowing embers',
        costume: 'Dress the person as a fire mage: a dark robe with glowing ember seams, a hood pushed back and a staff with a burning flame on top. Keep the face unchanged.',
        prompt: 'The fire mage spins the staff, flames roar up around them in a circle, embers float upward and the lava glows brighter; they grin confidently. Fantasy, cinematic.' },
      { scene: 'an enchanted forest at twilight with giant glowing mushrooms and fireflies',
        costume: 'Dress the person as a forest druid: a green cloak with leaves, a wreath of flowers and a crooked wooden staff sprouting fresh leaves. Keep the face unchanged.',
        prompt: 'The druid lifts the staff, the glowing mushrooms pulse with light, flowers bloom around their feet and a swarm of fireflies spirals up into the twilight. Fantasy, cinematic.' },
      { scene: 'a cluttered alchemist\'s laboratory with bubbling potions, brass instruments and a chalkboard full of formulas',
        costume: 'Dress the person as a slightly mad alchemist: a long coat covered in potion stains, round goggles on the forehead and a smoking flask in one hand. Keep the face unchanged.',
        prompt: 'The alchemist pours the smoking potion into a cauldron, it erupts in a harmless burst of colored smoke and sparkles that fills the room; they cough, wave the smoke away and laugh. Playful fantasy, cinematic.' },
      { scene: 'the wooden deck of a flying ship above the clouds at sunset, ropes and glowing lanterns',
        costume: 'Dress the person as a sky wizard: a wind-blown cloak, a wide-brimmed pointed hat and a staff with a tiny storm cloud swirling on top. Keep the face unchanged.',
        prompt: 'The sky wizard raises the staff, the little storm cloud grows, lightning crackles and a gust of wind lifts the ship higher through the golden clouds; the cloak billows. Fantasy, cinematic.' },
    ] },
  { id: 'attitall', name: 'Tilbake til 1986', emoji: '📼', framing: 'portrait', thumb: 'stiler/selfie-attitall.jpg',
    scene: 'a neon-lit Miami street at night in 1986, palm trees, pink and cyan neon signs and a vintage car',
    costume: 'Give the person big 1980s hair, sunglasses and a colorful windbreaker.',
    adapt: 'Build the 80s outfit from the colors the person is already wearing, exaggerated in neon versions; keep their own glasses or hairstyle but make it bigger and more 80s.',
    prompt: 'The scene turns into a 1980s music video: VHS grain, neon pink and cyan lights, synth-pop vibe, the person starts dancing with retro moves. Fun, nostalgic, cinematic.',
    variants: [
      {},
      { scene: 'a 1980s aerobics studio with mirrors, pastel walls and a boombox',
        costume: 'Give the person a neon leotard or tank top, a sweatband, leg warmers and big permed hair.',
        prompt: 'An 80s aerobics video: the person does energetic high-knee moves, arm pumps and a spin to a synth beat, hair bouncing, VHS grain and a flashing "WORKOUT" vibe. Fun, nostalgic.' },
      { scene: 'a smoky 1980s arcade full of glowing cabinets and a pinball machine',
        costume: 'Give the person a denim jacket covered in patches, a mullet and a Walkman headset.',
        prompt: 'The person slaps the arcade cabinet, lights flash, they turn to the camera and do a slow 80s head-nod with finger guns; VHS grain, neon reflections. Fun, nostalgic.' },
      { scene: 'a 1986 school prom gym with paper streamers, a disco ball and a live band on stage',
        costume: 'Give the person a shiny prom outfit with huge shoulder pads or a powder-blue tuxedo, big hair and a corsage.',
        prompt: 'A slow-motion prom moment: confetti falls, the person strikes a dramatic pose, flips their hair and lip-syncs a power ballad under the disco ball; VHS grain. Fun, nostalgic.' },
      { scene: 'a 1980s MTV studio with geometric neon shapes, a smoke machine and a camera on a crane',
        costume: 'Give the person a leather jacket with studs, a bandana and aviator sunglasses like a glam-rock star.',
        prompt: 'The rock star points at the camera, grabs an invisible microphone and sings with full energy while the smoke swirls and the neon shapes flash; VHS grain. Fun, nostalgic.' },
    ] },
  { id: 'spokelse', name: 'Bli et spøkelse', emoji: '👻', framing: 'portrait', thumb: 'stiler/selfie-spokelse.jpg',
    scene: 'a foggy, candle-lit hall in an old Scottish castle at night, stone arches and cobwebs',
    prompt: 'The person slowly turns into a translucent glowing white ghost, their body fading and becoming see-through, ghostly mist swirls around them and they float gently upward. Spooky but playful, cinematic.',
    variants: [
      {},
      { scene: 'the deck of a sunken pirate ship under dark water, tattered sails and glowing jellyfish',
        prompt: 'The person turns into a translucent ghost pirate: a ghostly tricorn hat and coat appear, their body becomes see-through and glows blue-green, and they drift upward through the water laughing silently. Spooky but playful, cinematic.' },
      { scene: 'an abandoned Victorian ballroom with a cracked chandelier and dusty mirrors',
        prompt: 'The person fades into a translucent ghost in old ballroom clothes and begins to waltz slowly with an invisible partner, floating a little above the floor as the chandelier swings. Spooky but elegant, cinematic.' },
      { scene: 'a moonlit graveyard with mist, crooked tombstones and a bare tree',
        prompt: 'The person turns into a glowing, see-through ghost, floats up out of frame and then pops back in upside down right in front of the camera, pulling a silly face. Spooky but funny, cinematic.' },
      { scene: 'a dark attic full of sheets over furniture, moonlight through a round window',
        prompt: 'A white sheet falls over the person, two eye holes appear, and they become a classic cartoon-like sheet ghost floating around the attic, flapping its edges; then they lift the sheet and grin. Playful, cinematic.' },
    ] },
  { id: 'superhelt', name: 'Superhelt', emoji: '🦸', framing: 'full', thumb: 'stiler/selfie-superhelt.jpg',
    scene: 'a skyscraper rooftop above the Manhattan skyline at golden hour, dramatic clouds',
    costume: 'Give the person a heroic superhero suit with a flowing cape and an emblem on the chest, over their own body shape.',
    adapt: 'The suit, cape and emblem take the dominant color of the person\'s own clothes (red clothes give a red hero, blue a blue hero); keep their glasses as part of the mask or let them stay. Invent an original emblem, not an existing brand.',
    prompt: 'Wind blows the cape, the person crouches and launches into the sky flying away like a superhero over the city, dramatic clouds, epic cinematic shot.',
    variants: [
      {},
      { scene: 'a rainy neon-lit street in Tokyo at night, reflections on wet asphalt',
        prompt: 'Lightning flashes, the hero plants their feet, raises a fist and a shockwave of energy ripples out, blowing rain and papers away; the cape whips in the wind. Epic cinematic shot.' },
      { scene: 'the top of a snowy mountain above the clouds at sunrise',
        prompt: 'The hero takes a running start and leaps off the peak, soaring over the clouds with the cape streaming behind, then loops once in the air. Epic cinematic shot.' },
      { scene: 'a collapsing bridge over a wide river at sunset, dust and sparks',
        prompt: 'The hero flies in, catches a falling steel beam with one hand, lifts it effortlessly and gives the camera a confident wink. Epic cinematic shot.' },
      { scene: 'outer space above planet Earth, stars and a glowing atmosphere',
        prompt: 'The hero floats in space with the Earth behind them, the cape drifting weightlessly, then zooms toward the camera at light speed leaving a glowing trail. Epic cinematic shot.' },
      { scene: 'a city street in the middle of a traffic jam, honking cars and surprised people',
        prompt: 'The hero lifts a whole car over their head with one hand, carries it over the traffic jam and sets it down gently, then dusts off their hands and smiles. Fun, epic cinematic shot.' },
    ] },
  { id: 'disco', name: 'Disko-feber', emoji: '🪩', framing: 'full', thumb: 'stiler/selfie-disco.jpg',
    scene: 'a 1970s disco club in New York, lit dance floor, huge mirror ball and colorful party lights',
    adapt: 'Give the person a 70s disco twist on their own outfit: the same colors but in shiny satin or sequins, plus a few disco accessories that fit them (big collar, platform shoes, afro or feathered hair).',
    prompt: 'The mirror ball spins, colorful lights sweep around and the person starts dancing joyfully, confetti falls, 70s disco vibe.',
    variants: [
      {},
      { prompt: 'The person does the classic pointing disco move, spins around once and ends in a dramatic pose while the lights flash and confetti falls. 70s disco vibe, joyful.' },
      { scene: 'a roller disco rink in 1978 with neon lights and a glittering floor',
        prompt: 'The person glides forward on roller skates, does a smooth spin and a little dance move, arms up, under the sweeping colored lights. 70s disco vibe, joyful.' },
      { scene: 'a glittering disco stage with a live funk band, silver curtains and a light-up floor',
        prompt: 'The person grabs a sparkling microphone, sings and dances with big funky moves while the band plays and the floor lights pulse. 70s disco vibe, joyful.' },
      { scene: 'a rooftop disco party at night with a giant mirror ball and the city lights behind',
        prompt: 'The person does a slow-motion hair flip and hip sway, then breaks into a joyful hustle dance with friends dancing in the background. 70s disco vibe.' },
    ] },
  { id: 'drage', name: 'Drage på skulderen', emoji: '🐉', framing: 'portrait', thumb: 'stiler/selfie-drage.jpg',
    scene: 'a medieval castle courtyard in the Scottish Highlands, misty mountains behind',
    adapt: 'The baby dragon\'s scales match the main color of the person\'s clothes (a blue jacket gives a blue dragon, red gives a red dragon); if no clear color, emerald green.',
    prompt: 'A small friendly baby dragon flies in and lands on the person\'s shoulder, flaps its wings and breathes a tiny puff of fire; the person laughs. Fantasy, cinematic.',
    variants: [
      {},
      { scene: 'a dragon\'s treasure cave full of gold coins and glowing crystals',
        prompt: 'A baby dragon pops up from a pile of gold coins, scrambles up onto the person\'s shoulder, sneezes a tiny puff of smoke and nuzzles their cheek; the person giggles. Fantasy, cinematic.' },
      { scene: 'a cliff edge above a stormy sea with a lighthouse in the distance',
        prompt: 'A baby dragon glides in on the wind, lands clumsily on the person\'s shoulder, shakes off rain and puffs a little flame to dry itself; the person laughs. Fantasy, cinematic.' },
      { scene: 'a cherry blossom garden in Japan with a red bridge and a koi pond',
        prompt: 'A small eastern-style dragon with whiskers slithers through the air like a ribbon, wraps once around the person\'s shoulders and rests its head on their shoulder, blinking sleepily. Fantasy, cinematic.' },
      { scene: 'a snowy Viking village at night with torches and a longship by the shore',
        prompt: 'A chubby baby ice dragon lands on the person\'s shoulder, breathes a sparkling cloud of frost that makes the person shiver and laugh, then hiccups. Fantasy, cinematic.' },
    ] },
  { id: 'ufo', name: 'Bortført av UFO', emoji: '🛸', framing: 'full', thumb: 'stiler/selfie-ufo.jpg',
    scene: 'the Nevada desert at night near Area 51, starry sky, distant mountains and a dirt road',
    prompt: 'A glowing UFO appears above and a bright beam of light lifts the person slowly up into the sky, their hair and clothes floating, sci-fi, cinematic.',
    variants: [
      {},
      { scene: 'a cornfield at night with a farmhouse and a full moon',
        prompt: 'A classic silver flying saucer hovers over the cornfield, a green tractor beam lifts the person spinning slowly upward while corn stalks swirl around; they wave goodbye. Sci-fi, cinematic.' },
      { scene: 'a quiet Norwegian fjord at night under the northern lights, a small red boathouse by the water',
        prompt: 'A silent black triangle craft with pulsing lights slides over the fjord and a soft blue beam lifts the person gently off the dock, their reflection shimmering on the water. Sci-fi, cinematic.' },
      { scene: 'a city rooftop at night with neon signs and rain',
        prompt: 'A massive mothership breaks through the clouds, dozens of small lights swirl down and form a spiral around the person before a beam pulls them upward; umbrellas fly away. Sci-fi, cinematic.' },
      { scene: 'a snowy forest clearing at night with footprints in the snow',
        prompt: 'A glowing disc appears above the trees and lifts the person up in a beam of light; halfway up a tiny friendly alien peeks out of the hatch and waves. Sci-fi, playful, cinematic.' },
    ] },
  { id: 'konfetti', name: 'Konfetti-eksplosjon', emoji: '🎉', framing: 'portrait', thumb: 'stiler/selfie-konfetti.jpg',
    scene: 'a street carnival in Rio de Janeiro, colorful decorations, dancers and bright daylight',
    adapt: 'Use the colors of the person\'s clothes as the main colors of the confetti and decorations.',
    prompt: 'The person bursts into an explosion of colorful confetti, balloons and streamers that swirl and then reassemble into the person again, smiling. Festive birthday celebration.',
    variants: [
      {},
      { scene: 'a New Year\'s Eve celebration in Times Square at midnight, lights and crowds',
        prompt: 'A giant confetti cannon fires from below and the person disappears in a storm of glittering confetti and streamers, then emerges laughing and covered in confetti. Festive, cinematic.' },
      { scene: 'a Holi festival in India, clouds of colored powder in the air',
        prompt: 'Clouds of bright colored powder burst from all sides and swirl around the person, who closes their eyes, spreads their arms and laughs as the colors settle on them. Festive, cinematic.' },
      { scene: 'a stadium at night during a championship victory, fireworks and cheering crowd',
        prompt: 'Fireworks explode above, golden confetti rains down and the person lifts an imaginary trophy and cheers while streamers fly past. Festive, cinematic.' },
      { scene: 'a children\'s party in a garden with piñatas and bunting',
        prompt: 'A piñata above the person bursts and a waterfall of confetti, candy and tiny balloons pours over them; they laugh and try to catch the candy. Festive, playful.' },
    ] },
  { id: 'is', name: 'Frosset til is', emoji: '🧊', framing: 'full', thumb: 'stiler/selfie-is.jpg',
    scene: 'a glacier on Svalbard at blue hour, ice and snow, cold arctic light',
    prompt: 'Frost spreads over the person and they freeze into a sparkling ice statue, snowflakes fall, then the ice cracks and they break free laughing. Cinematic.',
    variants: [
      {},
      { scene: 'an ice hotel room carved entirely from glowing blue ice, ice sculptures and fur blankets',
        prompt: 'The person slowly turns into a translucent ice sculpture from the feet up, glowing from inside, then thaws in reverse and shivers, hugging themselves and laughing. Cinematic.' },
      { scene: 'a frozen lake in Finnish Lapland with a hole in the ice and a sauna hut',
        prompt: 'A wave of frost rushes over the person and freezes them mid-pose with icicles on their nose; a moment later they shake it all off in a cloud of snow and laugh. Cinematic, playful.' },
      { scene: 'a giant walk-in freezer with frosty shelves and hanging icicles',
        prompt: 'The person\'s breath turns to fog, frost crystals grow over their clothes and hair until they are a frozen statue, then they crack free with a big shiver. Cinematic, playful.' },
      { scene: 'an Antarctic ice shelf with penguins waddling around',
        prompt: 'Frost creeps over the person and freezes them into an ice statue while curious penguins waddle up and peck at it; the ice cracks, the person breaks free and the penguins scatter. Cinematic, funny.' },
    ] },
  // --- Nye: tidsreiser, dyr og slapstick ---
  { id: 'gammel', name: 'Bli 80 år', emoji: '👴', framing: 'portrait', thumb: 'stiler/selfie-gammel.jpg',
    scene: 'a cozy Norwegian living room with a fireplace, a rocking chair and warm lamp light',
    adapt: 'Keep the person\'s own clothes and glasses so the older version is clearly the same person in the same outfit.',
    prompt: 'Over a few seconds the person ages naturally by forty years into a cheerful 80-year-old version of themselves: grey hair, wrinkles and reading glasses appear while the face stays recognizably the same; they look at the camera, raise an eyebrow and laugh. Smooth seamless transformation, photorealistic, steady camera.',
    variants: [
      {},
      { scene: 'a sunny bench in a park with pigeons and a bag of bread crumbs',
        prompt: 'Over a few seconds the person ages into a mischievous 80-year-old version of themselves with white hair and wrinkles, the same recognizable face; they wag a finger at the camera, then wink. Seamless transformation, photorealistic.' },
      { scene: 'a retirement home dance evening with balloons and a small band',
        prompt: 'Over a few seconds the person ages into a sprightly 80-year-old version of themselves with grey hair and wrinkles, the same face; they do a cheeky little dance move with a cane. Seamless transformation, photorealistic.' },
      { scene: 'a fishing pier at sunset with a thermos and a folding chair',
        prompt: 'Over a few seconds the person ages into a weathered, kind 80-year-old version of themselves with white hair and deep laugh lines, the same face; they squint at the camera and chuckle. Seamless transformation, photorealistic.' },
    ] },
  { id: 'barn', name: 'Bli 5 år igjen', emoji: '👶', framing: 'portrait', thumb: 'stiler/selfie-barn.jpg',
    scene: 'a colorful 1990s children\'s birthday party with balloons, paper hats and a cake on the table',
    adapt: 'Keep the colors of the person\'s own clothes in the child-sized version of the outfit.',
    prompt: 'Over a few seconds the person smoothly turns younger into a happy five-year-old version of themselves with the same recognizable face, chubby cheeks and a paper party hat; they giggle and wave at the camera. Seamless transformation, photorealistic, warm light, steady camera.',
    variants: [
      {},
      { scene: 'a kindergarten playroom with building blocks, drawings on the wall and a tiny table',
        prompt: 'Over a few seconds the person turns into a five-year-old version of themselves with the same face, missing a front tooth; they hold up a crayon drawing proudly and grin. Seamless transformation, photorealistic.' },
      { scene: 'a sandbox on a sunny playground with a bucket and spade',
        prompt: 'Over a few seconds the person turns into a five-year-old version of themselves with the same face and sand on their cheeks; they giggle and throw a handful of sand in the air. Seamless transformation, photorealistic.' },
      { scene: 'a living room on Christmas Eve with a tree, wrapped presents and fairy lights',
        prompt: 'Over a few seconds the person turns into a five-year-old version of themselves with the same face and wide excited eyes; they bounce up and down and clap their hands. Seamless transformation, photorealistic.' },
    ] },
  { id: 'trex', name: 'T-rex bak deg', emoji: '🦖', framing: 'full', thumb: 'stiler/selfie-trex.jpg',
    scene: 'a misty prehistoric jungle with giant ferns, volcanoes in the distance and soft morning light',
    costume: 'Leave plenty of space behind the person for a large animal to appear later; do not add any animal yet.',
    prompt: 'A huge realistic Tyrannosaurus rex slowly emerges from the ferns right behind the person and leans down curiously; the person slowly turns around, sees it, jumps in surprise and then laughs as the dinosaur sniffs their hair. Cinematic, photorealistic, steady camera.',
    variants: [
      {},
      { prompt: 'A huge T. rex steps out behind the person, opens its jaws for a mighty roar that blows their hair forward; the person covers their ears, turns around slowly and freezes, then grins. Cinematic, photorealistic.' },
      { scene: 'a dusty prehistoric plain at sunset with a herd of long-necked dinosaurs far away',
        prompt: 'A T. rex sneaks up behind the person with exaggerated tiptoe steps, then taps them on the shoulder with its tiny arm; the person turns, screams silently and runs out of frame while the T. rex looks confused. Funny, photorealistic.' },
      { scene: 'a rainy prehistoric swamp with dragonflies and tall horsetails',
        prompt: 'A baby T. rex the size of a dog bounces out of the bushes, runs around the person\'s legs and jumps up to lick their hand; then its gigantic mother appears behind them. Funny, photorealistic.' },
      { scene: 'a modern city street where a prehistoric jungle is breaking through the asphalt',
        prompt: 'A T. rex walks up behind the person, lowers its huge head next to theirs and both look at the camera like a selfie; the person gives a thumbs up. Funny, photorealistic.' },
    ] },
  { id: 'kake', name: 'Kake i fjeset', emoji: '🎂', framing: 'portrait', thumb: 'stiler/selfie-kake.jpg',
    scene: 'a festive birthday party with balloons, garlands and a long table with cakes',
    prompt: 'A big cream birthday cake flies in from the side in slow motion and splats right into the person\'s face; cream and sponge burst everywhere, the person freezes, licks some cream from their lips and bursts out laughing. Slapstick comedy, slow motion, photorealistic.',
    variants: [
      {},
      { prompt: 'A tall chocolate cake with lit candles is pushed into the person\'s face from below in slow motion; candles fly off, chocolate covers their face, they blink through it and laugh. Slapstick, slow motion, photorealistic.' },
      { scene: 'a fancy wedding reception with a huge white tiered cake and crystal glasses',
        prompt: 'The person leans over the giant tiered wedding cake, loses balance and face-plants straight into it in slow motion; frosting everywhere, they come up with a strawberry on their nose and laugh. Slapstick, photorealistic.' },
      { scene: 'a bakery kitchen with trays of cupcakes and flour in the air',
        prompt: 'A dozen cupcakes are thrown at the person from off-screen in slow motion, splatting one after the other on their face and shoulders; they catch the last one in their mouth and grin. Slapstick, photorealistic.' },
      { scene: 'a bright pink candy-colored party room with a giant strawberry cake on a pedestal',
        prompt: 'A giant pink strawberry cream cake drops from above and lands on the person\'s head like a hat in slow motion, cream dripping down their face; they peek out and laugh. Slapstick, photorealistic.' },
    ] },
  { id: 'troll', name: 'Troll i skogen', emoji: '🧌', framing: 'full', thumb: 'stiler/selfie-troll.jpg',
    scene: 'a deep Norwegian pine forest with moss-covered boulders, fog and soft evening light',
    costume: 'Leave room between the trees behind the person for a large creature to appear later; do not add any creature yet.',
    prompt: 'A gigantic friendly Norwegian forest troll with a big nose, mossy hair and a tail slowly peeks out from behind the pine trees behind the person, smiles and waves a huge hand; the person turns, gasps and waves back. Nordic fairy tale, cinematic, photorealistic.',
    variants: [
      {},
      { scene: 'a Norwegian mountain pass at dusk with a wooden bridge over a rushing stream',
        prompt: 'A grumpy old troll with a long nose and a birch tree growing on its head rises up from under the bridge behind the person, scratches its belly and yawns; the person turns and backs away slowly, laughing. Nordic fairy tale, photorealistic.' },
      { scene: 'a misty fjord shore at night with a huge troll-shaped rock formation',
        prompt: 'The rocky hill behind the person slowly opens its eyes and turns out to be a sleeping mountain troll waking up; it sneezes, blowing the person\'s hair, and smiles. Nordic fairy tale, photorealistic.' },
      { scene: 'a snowy spruce forest with a tiny red cabin and warm window light',
        prompt: 'Three small trolls with big noses and woolly hats tiptoe out from behind the trees, sneak up behind the person, and one of them gently tugs at their jacket; the person turns and all three freeze and whistle innocently. Funny, photorealistic.' },
      { scene: 'an ancient forest with giant roots and a waterfall in the mist',
        prompt: 'A huge mossy troll steps out of the waterfall mist behind the person, kneels down and holds out a tiny flower on its enormous finger; the person takes it and bows. Nordic fairy tale, cinematic.' },
    ] },
  { id: 'ballonger', name: 'Flyr bort med ballonger', emoji: '🎈', framing: 'full', thumb: 'stiler/selfie-ballonger.jpg',
    scene: 'a green meadow on a sunny summer day with a blue sky and a few fluffy clouds',
    costume: 'The person holds a huge bunch of colorful helium balloons on long strings in one hand.',
    adapt: 'Most of the balloons share the colors of the person\'s clothes, with a few contrasting ones mixed in.',
    prompt: 'The huge bunch of colorful balloons gently lifts the person off the ground; their feet leave the grass and they float higher and higher into the blue sky, kicking their legs and laughing. Whimsical, cinematic, photorealistic.',
    variants: [
      {},
      { scene: 'a cobblestone square in Paris with the Eiffel Tower in the distance',
        prompt: 'The balloons lift the person off the cobblestones and carry them up past the rooftops toward the Eiffel Tower, hat almost blowing off; they wave down at the people below. Whimsical, cinematic.' },
      { scene: 'a beach at sunset with gentle waves and seagulls',
        prompt: 'The balloons carry the person up over the water, toes skimming the waves, and a seagull flies alongside curiously; they laugh and pull their feet up. Whimsical, cinematic.' },
      { scene: 'a snowy mountain village with wooden houses and smoking chimneys',
        prompt: 'The balloons lift the person up over the snowy rooftops; snow falls softly, they pass a surprised chimney cat and spin slowly while laughing. Whimsical, cinematic.' },
      { scene: 'a busy city street with yellow taxis and tall buildings',
        prompt: 'The balloons suddenly yank the person upward, they rise between skyscrapers, bump gently off a window where office workers wave, and float on upward laughing. Whimsical, cinematic.' },
    ] },
  { id: 'valper', name: 'Valpestorm', emoji: '🐶', framing: 'full', thumb: 'stiler/selfie-valper.jpg',
    scene: 'a sunny backyard lawn with a white picket fence and flowers',
    costume: 'Leave open lawn around the person for animals to run in later; do not add any animals yet.',
    prompt: 'A big pack of happy puppies of many breeds comes running in from all sides, jumps up on the person and gently knocks them over onto the grass, licking their face while the person laughs uncontrollably. Joyful, photorealistic, steady camera.',
    variants: [
      {},
      { prompt: 'A flood of golden retriever puppies pours in from one side, tumbling over each other, and buries the person in wagging tails and licks; they fall backwards laughing. Joyful, photorealistic.' },
      { scene: 'a snowy park with a frozen pond and bare trees',
        prompt: 'A pack of fluffy husky and samoyed puppies bounds through the snow from all sides and jumps on the person, who falls into the snow laughing while puppies lick their face. Joyful, photorealistic.' },
      { scene: 'a sandy beach with gentle waves on a sunny day',
        prompt: 'Dozens of wet, sandy puppies of all breeds run out of the sea toward the person, shake themselves and jump up all over them; the person laughs and gets knocked onto the sand. Joyful, photorealistic.' },
      { scene: 'a cozy living room with a sofa and a Christmas tree',
        prompt: 'Puppies pour out from behind the sofa and under the tree: dachshunds, pugs and corgis swarm around the person\'s legs until they sit down and get covered in puppies. Joyful, photorealistic.' },
    ] },
  { id: 'undervann', name: 'Under vann', emoji: '🧜', framing: 'portrait', thumb: 'stiler/selfie-undervann.jpg',
    scene: 'a sunlit tropical coral reef underwater, colorful corals, light rays from the surface and small bubbles',
    costume: 'The person is underwater: hair floating softly and a few air bubbles around them, clothes unchanged.',
    prompt: 'Underwater: the person\'s hair and clothes float gently, colorful tropical fish and a curious sea turtle swim around them, bubbles rise, the person blows a big bubble and smiles. Light rays dance from the surface. Cinematic, photorealistic.',
    variants: [
      {},
      { scene: 'deep blue open ocean with sunbeams and a pod of dolphins in the distance',
        prompt: 'Underwater: a pod of dolphins swims up and circles the person playfully, one nudges their hand; hair floats, bubbles rise, the person laughs with a burst of bubbles. Cinematic, photorealistic.' },
      { scene: 'a kelp forest with golden light, sea otters and swaying seaweed',
        prompt: 'Underwater: a curious sea otter swims up, floats on its back in front of the person and offers them a shell; the person reaches out, hair floating, bubbles rising. Cinematic, photorealistic.' },
      { scene: 'a sunken ancient city with marble columns, mosaics and schools of silver fish',
        prompt: 'Underwater: a shimmering school of silver fish swirls around the person like a tornado, then parts to reveal them smiling with a crown of seaweed on their head. Cinematic, photorealistic.' },
      { scene: 'a shallow lagoon with white sand, rays of light and a giant manta ray gliding overhead',
        prompt: 'Underwater: a huge gentle manta ray glides slowly right over the person\'s head, casting a shadow, while small fish dart around; the person looks up in awe and blows bubbles. Cinematic, photorealistic.' },
    ] },
];

/**
 * Velger en tilfeldig variant av en effekt og slår den sammen med grunnoppsettet.
 * `avoid` er forrige variant for samme effekt, så to på rad ikke blir like.
 * @returns effekten med variantens felter lagt oppå, og `variant` = indeksen som ble valgt
 */
function pickVariant(effect, { avoid = -1, random = Math.random } = {}) {
  const list = effect.variants && effect.variants.length ? effect.variants : [{}];
  let i = Math.floor(random() * list.length);
  if (list.length > 1 && i === avoid) i = (i + 1 + Math.floor(random() * (list.length - 1))) % list.length;
  const { variants, ...base } = effect;
  return { ...base, ...list[i], variant: i };
}

/** Tekst til gjestene om hvordan bildet må tas. */
const FRAMING = {
  full: { name: 'Helfigur', emoji: '🧍', hint: 'Få noen til å ta bildet fra 3–4 meter unna. Hele deg må være med, fra topp til tå, med litt gulv rundt føttene.' },
  portrait: { name: 'Portrett', emoji: '🤳', hint: 'Portrett holder: ansikt og skuldre. En vanlig selfie er helt fint.' },
};

/**
 * Prompt til bildefiksen før videoen: lyset rettes opp og tømmerhytta byttes ut med effektens scene,
 * uten å endre personen. Det som skal bevege seg (tigeren, flukten …) lages i videosteget.
 */
function imagePrompt(effect, aspect) {
  if (!effect || !effect.scene) return null;
  return [
    'Keep the person exactly as they are: same face, identity, body, pose, expression, hair and clothes.',
    `Replace the entire background (an indoor log cabin party venue) with ${effect.scene}.`,
    aspect === '16:9' ? 'Wide 16:9 landscape composition for a TV screen: keep the person in the center and show more of the new scene to the left and right.' : '',
    'Relight the person naturally to match the new scene, fix uneven indoor lighting and color cast.',
    effect.framing === 'full' ? 'Show the whole body including the feet standing on the ground.' : '',
    effect.costume || '',
    effect.adapt || '',
    'Photorealistic, sharp, no text, no watermark.',
  ].filter(Boolean).join(' ');
}

/**
 * Bildefiks for tegninger: beskjær til A4-arket, rett opp perspektivet og fjern bord, hender og skygger,
 * så videomodellen bare får selve tegningen. Streken endres ikke.
 */
function drawingImagePrompt(aspect) {
  return [
    'Crop and straighten the photo so that only the sheet of paper with the drawing remains, seen straight from above.',
    'Remove everything outside the paper: the table, hands, fingers, pens, shadows and background.',
    aspect === '16:9'
      ? 'Make it a wide 16:9 landscape image for a TV screen: the drawing fills the full height in the center, and the paper and the drawing\'s background continue to the left and right in exactly the same hand-drawn style, colors and texture, without adding new characters or objects.'
      : 'The sheet of paper fills the entire frame.',
    'Keep the drawing exactly as it is: same lines, colors, proportions and crayon or pencil texture; do not redraw, add or remove anything on the paper.',
    'Even, soft lighting, no glare, no text added, no watermark.',
  ].join(' ');
}

const SONG_GENRES = ['Pop', 'Rock', 'Rap', 'Disko', 'Country', 'Metal', 'Reggae', 'EDM', 'Dansband', 'Visesang', 'Punk', 'Opera'];
const SONG_MOODS = ['Morsom', 'Rørende', 'Episk', 'Rampete', 'Romantisk', 'Kaotisk'];

module.exports = { DRAWING_STYLES, SELFIE_EFFECTS, FRAMING, pickVariant, imagePrompt, drawingImagePrompt, SONG_GENRES, SONG_MOODS };
