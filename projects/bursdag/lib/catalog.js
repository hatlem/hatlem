'use strict';

// Promptene er på engelsk fordi videomodellene forstår det best.
// Legg gjerne til flere effekter her – de dukker opp automatisk i appen.

const DRAWING_STYLES = [
  {
    id: 'magisk',
    name: 'Magisk liv',
    emoji: '✨',
    prompt: (d) =>
      `The hand-drawn drawing comes to life: the characters and objects in the drawing start moving, playful and joyful animation, keep the crayon and paper texture and the original colors${d ? `. The drawing shows: ${d}` : ''}. Sparkles and magic dust, gentle camera push-in.`,
  },
  {
    id: 'tegnefilm',
    name: '3D-tegnefilm',
    emoji: '🎬',
    prompt: (d) =>
      `Transform this child-like drawing into a colorful 3D animated feature film scene, cute characters faithful to the drawing's shapes and colors${d ? `, the scene shows: ${d}` : ''}, characters move expressively, cinematic lighting, smooth camera movement.`,
  },
  {
    id: 'anime',
    name: 'Anime',
    emoji: '🌸',
    prompt: (d) =>
      `Turn this drawing into a vibrant anime scene with dynamic motion, wind, glowing light and expressive characters faithful to the drawing${d ? `, the scene shows: ${d}` : ''}.`,
  },
  {
    id: 'ekte',
    name: 'Blir ekte',
    emoji: '🦄',
    prompt: (d) =>
      `The drawing transforms into a realistic live-action scene: everything drawn becomes real and moves naturally, matching the drawing's composition and colors${d ? `, the scene shows: ${d}` : ''}, cinematic.`,
  },
];

const SELFIE_EFFECTS = [
  { id: 'tiger', name: 'Tiger rundt deg', emoji: '🐯', prompt: 'A majestic realistic tiger walks slowly in a full circle around the person, brushing past them; the person stays in place, looks amazed and smiles. Cinematic, photorealistic, steady camera.' },
  { id: 'spokelse', name: 'Bli et spøkelse', emoji: '👻', prompt: 'The person slowly turns into a translucent glowing white ghost, their body fading and becoming see-through, ghostly mist swirls around them and they float gently upward. Spooky but playful, cinematic.' },
  { id: 'superhelt', name: 'Superhelt', emoji: '🦸', prompt: 'The person gets a heroic flowing cape, wind blows, they crouch and launch into the sky flying away like a superhero, dramatic clouds, epic cinematic shot.' },
  { id: 'disco', name: 'Disko-feber', emoji: '🪩', prompt: 'A huge disco ball appears above the person, colorful party lights sweep around and the person starts dancing joyfully, confetti falls, 70s disco vibe.' },
  { id: 'drage', name: 'Drage på skulderen', emoji: '🐉', prompt: 'A small friendly baby dragon flies in and lands on the person\'s shoulder, flaps its wings and breathes a tiny puff of fire; the person laughs. Fantasy, cinematic.' },
  { id: 'ufo', name: 'Bortført av UFO', emoji: '🛸', prompt: 'A glowing UFO appears above and a bright beam of light lifts the person slowly up into the sky, their hair and clothes floating, sci-fi, cinematic.' },
  { id: 'konfetti', name: 'Konfetti-eksplosjon', emoji: '🎉', prompt: 'The person bursts into an explosion of colorful confetti, balloons and streamers that swirl and then reassemble into the person again, smiling. Festive birthday celebration.' },
  { id: 'is', name: 'Frosset til is', emoji: '🧊', prompt: 'Frost spreads over the person and they freeze into a sparkling ice statue, snowflakes fall, then the ice cracks and they break free laughing. Cinematic.' },
];

const SONG_GENRES = ['Pop', 'Rock', 'Rap', 'Disko', 'Country', 'Metal', 'Reggae', 'EDM', 'Dansband', 'Visesang', 'Punk', 'Opera'];
const SONG_MOODS = ['Morsom', 'Rørende', 'Episk', 'Rampete', 'Romantisk', 'Kaotisk'];

module.exports = { DRAWING_STYLES, SELFIE_EFFECTS, SONG_GENRES, SONG_MOODS };
