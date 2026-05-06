import * as assert from 'assert';
import { findAbapSectionLineRanges } from '../../extension';

suite('Web Extension Test Suite', () => {
	test('finds ABAP class definition section ranges', () => {
		const ranges = findAbapSectionLineRanges([
			'CLASS zcl_demo DEFINITION PUBLIC.',
			'  PUBLIC SECTION.',
			'    METHODS run.',
			'  PROTECTED SECTION.',
			'    DATA value TYPE string.',
			'  PRIVATE SECTION.',
			'    METHODS helper.',
			'ENDCLASS.'
		].join('\n'));

		assert.deepStrictEqual(ranges, [
			{ kind: 'public', startLine: 1, endLine: 2 },
			{ kind: 'protected', startLine: 3, endLine: 4 },
			{ kind: 'private', startLine: 5, endLine: 6 }
		]);
	});

	test('matches section headers case-insensitively', () => {
		const ranges = findAbapSectionLineRanges([
			'class zcl_demo definition.',
			'  Public Section.',
			'    methods run.',
			'endclass.'
		].join('\n'));

		assert.deepStrictEqual(ranges, [
			{ kind: 'public', startLine: 1, endLine: 2 }
		]);
	});
});
