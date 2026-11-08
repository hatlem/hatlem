'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SELFIE_EFFECTS, FRAMING, imagePrompt } = require('../lib/catalog');

test('alle selfie-effekter har rammekrav, scene og prompt', () => {
  for (const e of SELFIE_EFFECTS) {
    assert.ok(['full', 'portrait'].includes(e.framing), e.id + ' mangler framing');
    assert.ok(e.scene && e.scene.length > 10, e.id + ' mangler scene');
    assert.ok(e.prompt && e.prompt.length > 20, e.id + ' mangler prompt');
    assert.ok(FRAMING[e.framing].hint);
  }
  assert.ok(SELFIE_EFFECTS.some((e) => e.id === 'slange' && e.framing === 'portrait'));
  assert.ok(SELFIE_EFFECTS.some((e) => e.id === 'trollmann' && e.framing === 'portrait'));
  assert.ok(SELFIE_EFFECTS.some((e) => e.id === 'tiger' && e.framing === 'full'));
});

test('tegninger: bare arket, både i bildefiks og video', () => {
  const { DRAWING_STYLES, drawingImagePrompt } = require('../lib/catalog');
  for (const s of DRAWING_STYLES) assert.match(s.prompt('en hest'), /only the drawing on the sheet of paper.*remove any table/);
  assert.match(DRAWING_STYLES[0].prompt('en hest'), /The drawing shows: en hest/);
  const fix = drawingImagePrompt();
  assert.match(fix, /only the sheet of paper with the drawing fills the entire frame/);
  assert.match(fix, /Remove everything outside the paper: the table, hands/);
  assert.match(fix, /do not redraw/);
});

test('bildefiks-prompten bevarer personen, bytter tømmerhytta og krever hele kroppen ved helfigur', () => {
  const tiger = imagePrompt(SELFIE_EFFECTS.find((e) => e.id === 'tiger'));
  assert.match(tiger, /Keep the person exactly as they are/);
  assert.match(tiger, /log cabin/);
  assert.match(tiger, /whole body including the feet/);
  assert.match(tiger, /do not add any animal yet/);
  const snake = imagePrompt(SELFIE_EFFECTS.find((e) => e.id === 'slange'));
  assert.doesNotMatch(snake, /whole body/);
  assert.match(snake, /python/);
  assert.equal(imagePrompt({ id: 'x' }), null);
});
