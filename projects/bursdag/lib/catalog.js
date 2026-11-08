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
    prompt: (d) =>
      `${PAPER_ONLY} The hand-drawn drawing comes to life: the characters and objects in the drawing start moving, playful and joyful animation, keep the crayon and paper texture and the original colors${d ? `. The drawing shows: ${d}` : ''}. Sparkles and magic dust, gentle camera push-in.`,
  },
  {
    id: 'tegnefilm',
    name: '3D-tegnefilm',
    emoji: '🎬',
    prompt: (d) =>
      `${PAPER_ONLY} Transform this hand-made drawing into a colorful 3D animated feature film scene, cute characters faithful to the drawing's shapes and colors${d ? `, the scene shows: ${d}` : ''}, characters move expressively, cinematic lighting, smooth camera movement.`,
  },
  {
    id: 'anime',
    name: 'Anime',
    emoji: '🌸',
    prompt: (d) =>
      `${PAPER_ONLY} Turn this drawing into a vibrant anime scene with dynamic motion, wind, glowing light and expressive characters faithful to the drawing${d ? `, the scene shows: ${d}` : ''}.`,
  },
  {
    id: 'ekte',
    name: 'Blir ekte',
    emoji: '🦄',
    prompt: (d) =>
      `${PAPER_ONLY} The drawing transforms into a realistic live-action scene: everything drawn becomes real and moves naturally, matching the drawing's composition and colors${d ? `, the scene shows: ${d}` : ''}, cinematic.`,
  },
];

/**
 * Selfie-effekter. Alle bildene tas inne i festlokalet (tømmerhytte, ujevnt lys), så før filmen lages
 * går bildet gjennom et fiksesteg: lyset rettes opp og bakgrunnen byttes til et sted i verden som passer.
 *  - framing: 'full' = hele kroppen må være med (noe skal skje rundt bena), 'portrait' = portrett holder.
 *  - scene:   bakgrunnen bildet flyttes til.
 *  - costume: ekstra ting som legges på i stillbildet (slange, trollmannsklær …). Selve bevegelsen lages i videoen.
 */
const SELFIE_EFFECTS = [
  { id: 'tiger', name: 'Tiger rundt deg', emoji: '🐯', framing: 'full',
    scene: 'a sunlit clearing in the Indian jungle of Ranthambore, tall golden grass, banyan trees and warm hazy light',
    costume: 'Leave open ground around the feet so an animal can walk around the person later; do not add any animal yet.',
    prompt: 'A majestic realistic Bengal tiger walks slowly in a full circle around the person, brushing past their legs; the person stays in place, looks amazed and smiles. Cinematic, photorealistic, steady camera.' },
  { id: 'slange', name: 'Slange rundt halsen', emoji: '🐍', framing: 'portrait',
    scene: 'the deep Amazon rainforest, lush green leaves, hanging vines and dappled sunlight',
    costume: 'A large realistic green tree python is draped around the person\'s neck and shoulders, calm and heavy.',
    prompt: 'The large python around the person\'s neck slowly slides and coils, flicking its tongue, while the person tries to stay calm, then grins. Cinematic, photorealistic, steady camera.' },
  { id: 'trollmann', name: 'Bli en trollmann', emoji: '🧙', framing: 'portrait',
    scene: 'the great hall of an ancient wizard tower, stone walls, candles floating in the air, old books and glowing runes',
    costume: 'Dress the person as a wizard: a long deep-blue robe with silver stars, a tall pointed hat and a wooden staff with a glowing crystal. Keep the face unchanged.',
    prompt: 'The wizard raises the glowing staff, sparks and swirling magic light burst from it, floating books and candles drift around, the robe sways. Fantasy, cinematic.' },
  { id: 'attitall', name: 'Tilbake til 1986', emoji: '📼', framing: 'portrait',
    scene: 'a neon-lit Miami street at night in 1986, palm trees, pink and cyan neon signs and a vintage car',
    costume: 'Give the person big 1980s hair, sunglasses and a colorful windbreaker.',
    prompt: 'The scene turns into a 1980s music video: VHS grain, neon pink and cyan lights, synth-pop vibe, the person starts dancing with retro moves. Fun, nostalgic, cinematic.' },
  { id: 'spokelse', name: 'Bli et spøkelse', emoji: '👻', framing: 'portrait',
    scene: 'a foggy, candle-lit hall in an old Scottish castle at night, stone arches and cobwebs',
    prompt: 'The person slowly turns into a translucent glowing white ghost, their body fading and becoming see-through, ghostly mist swirls around them and they float gently upward. Spooky but playful, cinematic.' },
  { id: 'superhelt', name: 'Superhelt', emoji: '🦸', framing: 'full',
    scene: 'a skyscraper rooftop above the Manhattan skyline at golden hour, dramatic clouds',
    costume: 'Give the person a heroic flowing red cape over their own clothes.',
    prompt: 'Wind blows the cape, the person crouches and launches into the sky flying away like a superhero over the city, dramatic clouds, epic cinematic shot.' },
  { id: 'disco', name: 'Disko-feber', emoji: '🪩', framing: 'full',
    scene: 'a 1970s disco club in New York, lit dance floor, huge mirror ball and colorful party lights',
    prompt: 'The mirror ball spins, colorful lights sweep around and the person starts dancing joyfully, confetti falls, 70s disco vibe.' },
  { id: 'drage', name: 'Drage på skulderen', emoji: '🐉', framing: 'portrait',
    scene: 'a medieval castle courtyard in the Scottish Highlands, misty mountains behind',
    prompt: 'A small friendly baby dragon flies in and lands on the person\'s shoulder, flaps its wings and breathes a tiny puff of fire; the person laughs. Fantasy, cinematic.' },
  { id: 'ufo', name: 'Bortført av UFO', emoji: '🛸', framing: 'full',
    scene: 'the Nevada desert at night near Area 51, starry sky, distant mountains and a dirt road',
    prompt: 'A glowing UFO appears above and a bright beam of light lifts the person slowly up into the sky, their hair and clothes floating, sci-fi, cinematic.' },
  { id: 'konfetti', name: 'Konfetti-eksplosjon', emoji: '🎉', framing: 'portrait',
    scene: 'a street carnival in Rio de Janeiro, colorful decorations, dancers and bright daylight',
    prompt: 'The person bursts into an explosion of colorful confetti, balloons and streamers that swirl and then reassemble into the person again, smiling. Festive birthday celebration.' },
  { id: 'is', name: 'Frosset til is', emoji: '🧊', framing: 'full',
    scene: 'a glacier on Svalbard at blue hour, ice and snow, cold arctic light',
    prompt: 'Frost spreads over the person and they freeze into a sparkling ice statue, snowflakes fall, then the ice cracks and they break free laughing. Cinematic.' },
  // --- Nye: tidsreiser, dyr og slapstick ---
  { id: 'gammel', name: 'Bli 80 år', emoji: '👴', framing: 'portrait',
    scene: 'a cozy Norwegian living room with a fireplace, a rocking chair and warm lamp light',
    prompt: 'Over a few seconds the person ages naturally by forty years into a cheerful 80-year-old version of themselves: grey hair, wrinkles and reading glasses appear while the face stays recognizably the same; they look at the camera, raise an eyebrow and laugh. Smooth seamless transformation, photorealistic, steady camera.' },
  { id: 'barn', name: 'Bli 5 år igjen', emoji: '👶', framing: 'portrait',
    scene: 'a colorful 1990s children\'s birthday party with balloons, paper hats and a cake on the table',
    prompt: 'Over a few seconds the person smoothly turns younger into a happy five-year-old version of themselves with the same recognizable face, chubby cheeks and a paper party hat; they giggle and wave at the camera. Seamless transformation, photorealistic, warm light, steady camera.' },
  { id: 'trex', name: 'T-rex bak deg', emoji: '🦖', framing: 'full',
    scene: 'a misty prehistoric jungle with giant ferns, volcanoes in the distance and soft morning light',
    costume: 'Leave plenty of space behind the person for a large animal to appear later; do not add any animal yet.',
    prompt: 'A huge realistic Tyrannosaurus rex slowly emerges from the ferns right behind the person and leans down curiously; the person slowly turns around, sees it, jumps in surprise and then laughs as the dinosaur sniffs their hair. Cinematic, photorealistic, steady camera.' },
  { id: 'kake', name: 'Kake i fjeset', emoji: '🎂', framing: 'portrait',
    scene: 'a festive birthday party with balloons, garlands and a long table with cakes',
    prompt: 'A big cream birthday cake flies in from the side in slow motion and splats right into the person\'s face; cream and sponge burst everywhere, the person freezes, licks some cream from their lips and bursts out laughing. Slapstick comedy, slow motion, photorealistic.' },
  { id: 'troll', name: 'Troll i skogen', emoji: '🧌', framing: 'full',
    scene: 'a deep Norwegian pine forest with moss-covered boulders, fog and soft evening light',
    costume: 'Leave room between the trees behind the person for a large creature to appear later; do not add any creature yet.',
    prompt: 'A gigantic friendly Norwegian forest troll with a big nose, mossy hair and a tail slowly peeks out from behind the pine trees behind the person, smiles and waves a huge hand; the person turns, gasps and waves back. Nordic fairy tale, cinematic, photorealistic.' },
  { id: 'ballonger', name: 'Flyr bort med ballonger', emoji: '🎈', framing: 'full',
    scene: 'a green meadow on a sunny summer day with a blue sky and a few fluffy clouds',
    costume: 'The person holds a huge bunch of colorful helium balloons on long strings in one hand.',
    prompt: 'The huge bunch of colorful balloons gently lifts the person off the ground; their feet leave the grass and they float higher and higher into the blue sky, kicking their legs and laughing. Whimsical, cinematic, photorealistic.' },
  { id: 'valper', name: 'Valpestorm', emoji: '🐶', framing: 'full',
    scene: 'a sunny backyard lawn with a white picket fence and flowers',
    costume: 'Leave open lawn around the person for animals to run in later; do not add any animals yet.',
    prompt: 'A big pack of happy puppies of many breeds comes running in from all sides, jumps up on the person and gently knocks them over onto the grass, licking their face while the person laughs uncontrollably. Joyful, photorealistic, steady camera.' },
  { id: 'undervann', name: 'Under vann', emoji: '🧜', framing: 'portrait',
    scene: 'a sunlit tropical coral reef underwater, colorful corals, light rays from the surface and small bubbles',
    costume: 'The person is underwater: hair floating softly and a few air bubbles around them, clothes unchanged.',
    prompt: 'Underwater: the person\'s hair and clothes float gently, colorful tropical fish and a curious sea turtle swim around them, bubbles rise, the person blows a big bubble and smiles. Light rays dance from the surface. Cinematic, photorealistic.' },
];

/** Tekst til gjestene om hvordan bildet må tas. */
const FRAMING = {
  full: { name: 'Helfigur', emoji: '🧍', hint: 'Få noen til å ta bildet fra 3–4 meter unna. Hele deg må være med, fra topp til tå, med litt gulv rundt føttene.' },
  portrait: { name: 'Portrett', emoji: '🤳', hint: 'Portrett holder: ansikt og skuldre. En vanlig selfie er helt fint.' },
};

/**
 * Prompt til bildefiksen før videoen: lyset rettes opp og tømmerhytta byttes ut med effektens scene,
 * uten å endre personen. Det som skal bevege seg (tigeren, flukten …) lages i videosteget.
 */
function imagePrompt(effect) {
  if (!effect || !effect.scene) return null;
  return [
    'Keep the person exactly as they are: same face, identity, body, pose, expression, hair and clothes.',
    `Replace the entire background (an indoor log cabin party venue) with ${effect.scene}.`,
    'Relight the person naturally to match the new scene, fix uneven indoor lighting and color cast.',
    effect.framing === 'full' ? 'Show the whole body including the feet standing on the ground.' : '',
    effect.costume || '',
    'Photorealistic, sharp, no text, no watermark.',
  ].filter(Boolean).join(' ');
}

/**
 * Bildefiks for tegninger: beskjær til A4-arket, rett opp perspektivet og fjern bord, hender og skygger,
 * så videomodellen bare får selve tegningen. Streken endres ikke.
 */
function drawingImagePrompt() {
  return [
    'Crop and straighten the photo so that only the sheet of paper with the drawing fills the entire frame, seen straight from above.',
    'Remove everything outside the paper: the table, hands, fingers, pens, shadows and background.',
    'Keep the drawing exactly as it is: same lines, colors, proportions and crayon or pencil texture; do not redraw, add or remove anything on the paper.',
    'Even, soft lighting, no glare, no text added, no watermark.',
  ].join(' ');
}

const SONG_GENRES = ['Pop', 'Rock', 'Rap', 'Disko', 'Country', 'Metal', 'Reggae', 'EDM', 'Dansband', 'Visesang', 'Punk', 'Opera'];
const SONG_MOODS = ['Morsom', 'Rørende', 'Episk', 'Rampete', 'Romantisk', 'Kaotisk'];

module.exports = { DRAWING_STYLES, SELFIE_EFFECTS, FRAMING, imagePrompt, drawingImagePrompt, SONG_GENRES, SONG_MOODS };
