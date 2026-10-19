import {test} from 'node:test';import assert from 'node:assert/strict';
import {mark,validDate,releaseDate} from '../src/lib/quiz';
test('single correct answer',()=>{assert.equal(mark({correctOptionKeys:['B']},['B']),true);assert.equal(mark({correctOptionKeys:['B']},['A']),false);assert.equal(mark({correctOptionKeys:['B']},[]),false)});
test('multiple-answer order independent',()=>{assert.equal(mark({correctOptionKeys:['A','C']},['C','A']),true);assert.equal(mark({correctOptionKeys:['A','C']},['A']),false)});
test('date and UK time zone',()=>{assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2026-10-12'),true);assert.equal(releaseDate('2026-10-12').toISOString(),'2026-10-11T23:00:00.000Z');assert.equal(releaseDate('2026-12-12').toISOString(),'2026-12-12T00:00:00.000Z')});
