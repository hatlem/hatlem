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
